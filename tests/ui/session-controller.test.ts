import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { webcrypto } from 'node:crypto';
import { reauthenticateWithCredential, type User, type UserCredential } from 'firebase/auth';
import type { FirebaseRuntime } from '../../apps/web/src/data/firebase';
import type { UserProfile } from '@fin/contracts';
import { SessionController } from '../../apps/web/src/features/auth/session';
import { finishSetup, initialDraft } from '../../apps/web/src/features/onboarding/setup';
import { LocalPinLock } from '../../apps/web/src/features/security/local-lock';

const sdk = vi.hoisted(() => ({
  tokenEvent: null as ((user: User | null) => void) | null,
  getDoc: vi.fn(), runTransaction: vi.fn(),
  profile: { uid: 'alice', setupComplete: true } as UserProfile,
  pending: [{ id: 'pending-private' }],
}));
vi.mock('firebase/auth', async (original) => ({
  ...await original<typeof import('firebase/auth')>(),
  beforeAuthStateChanged: vi.fn(() => () => {}),
  onIdTokenChanged: vi.fn((_auth, callback: (user: User | null) => void) => { sdk.tokenEvent = callback; return () => {}; }),
  getIdTokenResult: vi.fn(async () => ({ claims: { email_verified: true } })),
  reauthenticateWithCredential: vi.fn(async () => ({})),
}));
vi.mock('firebase/firestore', async (original) => ({
  ...await original<typeof import('firebase/firestore')>(),
  doc: vi.fn((_firestore, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: sdk.getDoc, runTransaction: sdk.runTransaction,
}));
vi.mock('../../apps/web/src/data/firestore-repository', () => ({
  createRevisionRepository: vi.fn((_session, dependencies) => ({
    append: vi.fn(), subscribe: () => () => {}, retry: vi.fn(),
    exportPending: async () => sdk.pending,
    close: () => dependencies.outbox.close(),
  })),
}));

function deferred<T>() { let resolve!: (value: T) => void; let reject!: (cause: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const snapshot = () => ({ exists: () => true, data: () => sdk.profile });
const active = new Set<() => void>();
let runtime: FirebaseRuntime;
let user: User;
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('IDBKeyRange', IDBKeyRange); vi.stubGlobal('BroadcastChannel', undefined);
  user = { uid: 'alice', emailVerified: true, email: 'alice@example.test', providerData: [{ providerId: 'password' }] } as User;
  sdk.profile = { uid: 'alice', setupComplete: true }; sdk.pending = [{ id: 'pending-private' }];
  sdk.getDoc.mockImplementation(async () => snapshot());
  runtime = { auth: { currentUser: user }, firestore: {}, app: {}, persistenceReady: Promise.resolve({ state: 'persistent' }), clearPersistence: vi.fn(async () => {}), assertSession: vi.fn((session) => { if (session.uid !== runtime.auth.currentUser?.uid) throw new Error('UNAUTHORIZED'); }) } as unknown as FirebaseRuntime;
});
afterEach(() => { for (const stop of active) stop(); active.clear(); vi.unstubAllGlobals(); });
async function opened(setupComplete = true) {
  sdk.profile = { uid: 'alice', setupComplete };
  const controller = new SessionController(runtime); active.add(controller.start()); sdk.tokenEvent!(user);
  await vi.waitFor(() => expect(controller.getSnapshot().profile?.uid).toBe('alice'));
  await controller.setInitialPin('123456'); return controller;
}

describe('session controller async authorization', () => {
  it('finishes a valid unlock when the same UID refreshes its token during the profile read (I1)', async () => {
    const controller = await opened(); controller.lock(); const read = deferred<ReturnType<typeof snapshot>>();
    sdk.getDoc.mockImplementationOnce(() => read.promise);
    const unlocking = controller.unlock('123456'); await vi.waitFor(() => expect(sdk.getDoc).toHaveBeenCalledTimes(2));
    sdk.tokenEvent!({ ...user } as User); read.resolve(snapshot()); await unlocking;
    expect(controller.getSnapshot()).toMatchObject({ ready: true, locked: false, blocked: false, profile: { uid: 'alice' } });
  });
  it('never commits an old owner read after a real UID change', async () => {
    const controller = await opened(); controller.lock(); const read = deferred<ReturnType<typeof snapshot>>();
    sdk.getDoc.mockImplementationOnce(() => read.promise);
    const unlocking = controller.unlock('123456'); await vi.waitFor(() => expect(sdk.getDoc).toHaveBeenCalledTimes(2));
    const bob = { ...user, uid: 'bob' } as User; Object.defineProperty(runtime.auth, 'currentUser', { value: bob, configurable: true }); sdk.tokenEvent!(bob);
    await vi.waitFor(() => expect(controller.getSnapshot().blocked).toBe(true)); read.resolve(snapshot()); await unlocking;
    expect(controller.getSnapshot()).toMatchObject({ ready: true, blocked: true, profile: null });
  });
  it('keeps a lock applied while the real onboarding transaction waits for its ACK (I2)', async () => {
    const controller = await opened(false); const ack = deferred<void>();
    sdk.runTransaction.mockImplementationOnce(async (_firestore, execute) => {
      await execute({ get: async () => snapshot(), set: vi.fn() }); await ack.promise;
      sdk.profile = { ...sdk.profile, setupComplete: true };
    });
    const saving = finishSetup(controller, { ...initialDraft('alice'), skipAccount: true });
    await vi.waitFor(() => expect(sdk.runTransaction).toHaveBeenCalledTimes(1)); controller.lock(); ack.resolve(); await saving;
    expect(sdk.profile.setupComplete).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({ ready: true, locked: true });
    await controller.unlock('123456'); expect(controller.getSnapshot()).toMatchObject({ locked: false, profile: { setupComplete: true } });
  });
  it.each(['profile', 'persistence'] as const)('publishes recoverable terminal state if %s fails after a correct PIN (I3)', async (boundary) => {
    const controller = await opened(); controller.lock();
    const error = Object.assign(new Error('Read failed'), { code: 'permission-denied' });
    if (boundary === 'profile') sdk.getDoc.mockRejectedValueOnce(error);
    else { runtime.persistenceReady = Promise.reject(error); void runtime.persistenceReady.catch(() => {}); }
    await expect(controller.unlock('123456')).rejects.toThrow('Read failed');
    expect(controller.getSnapshot()).toMatchObject({ ready: true, blocked: true, profile: null });
    expect(controller.getSnapshot().error).toBeTruthy();
  });
  it('also retains the opening authorization when a token refresh arrives before a profile has ever loaded', async () => {
    localStorage.setItem('finanzas-device-v1', 'phone'); await new LocalPinLock('alice', 'phone').setPin('123456');
    const controller = new SessionController(runtime); active.add(controller.start()); sdk.tokenEvent!(user);
    await vi.waitFor(() => expect(controller.getSnapshot()).toMatchObject({ ready: true, locked: true, profile: null }));
    const read = deferred<ReturnType<typeof snapshot>>(); sdk.getDoc.mockImplementationOnce(() => read.promise);
    const unlocking = controller.unlock('123456'); await vi.waitFor(() => expect(sdk.getDoc).toHaveBeenCalledTimes(1));
    sdk.tokenEvent!({ ...user } as User); read.resolve(snapshot()); await unlocking;
    expect(controller.getSnapshot()).toMatchObject({ ready: true, locked: false, profile: { uid: 'alice' } });
  });
  it.each(['resolve', 'reject'] as const)('keeps a new lock terminal and private if the old profile request later %ss', async (outcome) => {
    const controller = await opened(); controller.lock(); const read = deferred<ReturnType<typeof snapshot>>(); sdk.getDoc.mockImplementationOnce(() => read.promise);
    const unlocking = controller.unlock('123456'); await vi.waitFor(() => expect(sdk.getDoc).toHaveBeenCalledTimes(2));
    controller.lock(); expect(controller.getSnapshot()).toMatchObject({ ready: true, locked: true });
    if (outcome === 'resolve') read.resolve(snapshot()); else read.reject(new Error('Old request failed'));
    await unlocking; expect(controller.getSnapshot()).toMatchObject({ ready: true, locked: true, blocked: false, error: null });
  });
  it.each(['resetPin', 'completeSetup'] as const)('owns a recoverable profile error from %s and preserves pending commands', async (caller) => {
    const controller = await opened(); const previousPending = await controller.pending();
    sdk.getDoc.mockRejectedValueOnce(new Error('Profile unavailable'));
    let operation: Promise<void>;
    if (caller === 'resetPin') { controller.lock(); operation = controller.resetPin('654321', 'password123'); }
    else operation = controller.completeSetup(controller.captureAccess());
    await expect(operation).rejects.toThrow('Profile unavailable');
    expect(controller.getSnapshot()).toMatchObject({ ready: true, blocked: true, profile: null });
    expect(await controller.pending()).toEqual(previousPending);
  });
  it('rejects an onboarding continuation captured before a later lock/unlock instead of starting another transaction', async () => {
    const controller = await opened(false); const authorization = controller.captureAccess();
    controller.lock(); await controller.unlock('123456');
    await expect(finishSetup(controller, { ...initialDraft('alice'), skipAccount: true }, authorization)).rejects.toThrow('La sesión cambió');
    expect(sdk.runTransaction).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({ ready: true, profile: { setupComplete: false } });
  });
  it('keeps a lock during PIN recovery reauthentication and does not change the old verifier', async () => {
    const controller = await opened(); controller.lock(); const reauthentication = deferred<UserCredential>();
    vi.mocked(reauthenticateWithCredential).mockImplementationOnce(() => reauthentication.promise);
    const recovery = controller.resetPin('654321', 'password123');
    await vi.waitFor(() => expect(reauthenticateWithCredential).toHaveBeenCalledTimes(1)); controller.lock();
    reauthentication.resolve({} as UserCredential); await recovery;
    expect(controller.getSnapshot()).toMatchObject({ ready: true, locked: true });
    await controller.unlock('123456'); expect(controller.getSnapshot()).toMatchObject({ ready: true, locked: false });
  });
});
