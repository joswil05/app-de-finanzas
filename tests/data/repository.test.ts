import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import type { Revision } from '@fin/contracts';
import { projectionToSnapshot } from '@fin/domain';
import { IndexedDbOutbox } from '../../apps/web/src/data/outbox';
import { FirestoreRevisionRepository, InvalidRemoteRevisionError, type RevisionTransport } from '../../apps/web/src/data/firestore-repository';
import { SessionOwnerGuard, closeSession, loadSessionOwnerGuard } from '../../apps/web/src/data/session-cleanup';

const session = { uid: 'alice', emailVerified: true as const };
const revision: Revision = { schemaVersion: 1, id: 'r1', aggregateId: 'cash', kind: 'account', parentIds: [], deviceId: 'phone', createdAtClient: '2026-10-15T12:00:00.000Z', payload: { id: 'cash', name: 'Efectivo', kind: 'cash', currency: 'NIO', archived: false } };
const dbName = () => `test-${crypto.randomUUID()}`;
const ownerGuard = () => new SessionOwnerGuard({ ownerUid: 'alice', hydratedUid: 'alice' });
const neverAck: RevisionTransport = { send: () => new Promise<void>(() => {}), subscribe: () => () => {} };
const persistent = Promise.resolve({ state: 'persistent' as const });

describe('durable UID outbox', () => {
  it('retains a local command after reopening and isolates identical IDs in two accounts', async () => {
    const name = dbName();
    const first = new IndexedDbOutbox(session, name);
    await first.put(revision);
    await first.close();
    const reopened = new IndexedDbOutbox(session, name);
    const bob = new IndexedDbOutbox({ uid: 'bob', emailVerified: true }, name);
    expect((await reopened.list())[0]?.revision.payload).toEqual(revision.payload);
    expect(await bob.list()).toEqual([]);
    await bob.put({ ...revision, payload: { ...revision.payload as object, name: 'Otra cuenta' } });
    expect((await reopened.list())[0]?.revision.payload).toEqual(revision.payload);
    await reopened.close(); await bob.close();
  });

  it('preserves rejected commands and refuses a different payload under the same ID', async () => {
    const name = dbName();
    const box = new IndexedDbOutbox(session, name);
    await box.put(revision);
    await box.reject('r1', 'permission-denied');
    expect((await box.list())[0]?.error).toBe('permission-denied');
    await expect(box.put({ ...revision, payload: null })).rejects.toThrow();
    await box.close();
    const reopened = new IndexedDbOutbox(session, name);
    expect((await reopened.list())[0]).toMatchObject({ state: 'rejected', error: 'permission-denied' });
    await reopened.close();
  });
});

describe('repository completion and session boundary', () => {
  it('removes an unconfirmed SDK overlay as soon as its command is rejected without waiting for SDK rollback', async () => {
    const guard = ownerGuard();
    await guard.markHydrated(session, []);
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    let rejectSend: ((cause: Error) => void) | undefined;
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, dbName()), guard, transport: { subscribe: (next) => { receive = next; return () => {}; }, send: () => new Promise((_resolve, reject) => { rejectSend = reject; }) }, persistenceReady: persistent });
    await repository.append(revision);
    let seen: Revision[] = [];
    let rejected = 0;
    repository.subscribe((revisions, status) => { seen = revisions; rejected = status.rejected; });
    receive?.({ revisions: [revision], fromCache: true, hasPendingWrites: true });
    await vi.waitFor(() => expect(seen).toEqual([revision]));
    rejectSend?.(new Error('permission-denied'));
    await vi.waitFor(() => expect(rejected).toBe(1));
    expect(seen).toEqual([]);
    expect(await repository.exportPending()).toEqual([revision]);
    await repository.close();
  });

  it.each(['listener-error', 'decode-quarantine'] as const)('keeps %s newer than a slow previous manifest write', async (scenario) => {
    let writing = false;
    let writeFinished = false;
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const guard = new SessionOwnerGuard({ ownerUid: 'alice', hydratedUid: null }, async () => { writing = true; await blocked; writeFinished = true; });
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    let fail: Parameters<RevisionTransport['subscribe']>[1] | undefined;
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, dbName()), guard, transport: { ...neverAck, subscribe: (next, error) => { receive = next; fail = error; return () => {}; } }, persistenceReady: persistent });
    await repository.exportPending();
    let latest = { mode: 'syncing', hydrated: false, rejected: 0 };
    let complete = false;
    let afterWriteEmissions = 0;
    repository.subscribe((revisions, status) => { latest = status; complete = projectionToSnapshot(revisions, status, { asOf: '2026-10-18T12:00:00.000Z' }).complete; if (writeFinished) afterWriteEmissions += 1; });
    receive?.({ revisions: [revision], fromCache: false, hasPendingWrites: false });
    await vi.waitFor(() => expect(writing).toBe(true));
    fail?.(scenario === 'decode-quarantine' ? new InvalidRemoteRevisionError(new Error('bad payload')) : new Error('permission-denied'));
    release?.();
    await vi.waitFor(() => expect(afterWriteEmissions).toBeGreaterThan(0));
    expect(latest.mode).toBe('error');
    expect(latest.hydrated).toBe(false);
    expect(complete).toBe(false);
    if (scenario === 'decode-quarantine') expect(latest.rejected).toBe(1);
    await repository.close();
  });
  it('keeps a listener error through a late write ACK and recovers only on a later valid history event', async () => {
    const guard = ownerGuard();
    await guard.markHydrated(session, []);
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    let fail: Parameters<RevisionTransport['subscribe']>[1] | undefined;
    let acknowledge: (() => void) | undefined;
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, dbName()), guard, transport: { subscribe: (next, error) => { receive = next; fail = error; return () => {}; }, send: () => new Promise<void>((resolve) => { acknowledge = resolve; }) }, persistenceReady: persistent });
    await repository.exportPending();
    let latest = { mode: 'syncing', hydrated: false };
    repository.subscribe((_revisions, status) => { latest = status; });
    receive?.({ revisions: [], fromCache: true, hasPendingWrites: false });
    await vi.waitFor(() => expect(latest.hydrated).toBe(true));
    await repository.append(revision);
    fail?.(new Error('permission-denied'));
    await vi.waitFor(() => expect(latest.mode).toBe('error'));
    acknowledge?.();
    await vi.waitFor(async () => expect(await repository.exportPending()).toEqual([]));
    expect(latest.mode).toBe('error');
    expect(latest.hydrated).toBe(false);
    receive?.({ revisions: [revision], fromCache: false, hasPendingWrites: false });
    await vi.waitFor(() => expect(latest.hydrated).toBe(true));
    expect(latest.mode).toBe('synced');
    await repository.close();
  });
  it('does not publish queued history or errors after close while a manifest write is still finishing', async () => {
    let writing = false;
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const guard = new SessionOwnerGuard({ ownerUid: 'alice', hydratedUid: null }, async () => { writing = true; await blocked; });
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    let fail: Parameters<RevisionTransport['subscribe']>[1] | undefined;
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, dbName()), guard, transport: { ...neverAck, subscribe: (next, error) => { receive = next; fail = error; return () => {}; } }, persistenceReady: persistent });
    await repository.exportPending();
    let emissions = 0;
    repository.subscribe(() => { emissions += 1; });
    receive?.({ revisions: [revision], fromCache: false, hasPendingWrites: false });
    await vi.waitFor(() => expect(writing).toBe(true));
    fail?.(new Error('permission-denied'));
    const beforeClose = emissions;
    const closing = repository.close();
    release?.();
    await closing;
    expect(emissions).toBe(beforeClose);
  });
  it('keeps confirmed remote content effective before and after a colliding local rejection and restart', async () => {
    const name = dbName();
    const conflicting = { ...revision, payload: { ...revision.payload as object, name: 'Conflicting local' } };
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    let rejectSend: ((cause: Error) => void) | undefined;
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, name), guard: ownerGuard(), transport: { subscribe: (next) => { receive = next; return () => {}; }, send: () => new Promise((_resolve, reject) => { rejectSend = reject; }) }, persistenceReady: persistent });
    await repository.append(conflicting);
    let seen: Revision[] = [];
    let rejected = 0;
    repository.subscribe((revisions, status) => { seen = revisions; rejected = status.rejected; });
    receive?.({ revisions: [conflicting], fromCache: true, hasPendingWrites: true });
    await vi.waitFor(() => expect(seen).toEqual([conflicting]));
    receive?.({ revisions: [revision], fromCache: false, hasPendingWrites: false });
    await vi.waitFor(() => expect(seen).toEqual([revision]));
    expect(await repository.exportPending()).toEqual([conflicting]);
    rejectSend?.(new Error('permission-denied'));
    await vi.waitFor(() => expect(rejected).toBe(1));
    expect(seen).toEqual([revision]);
    await repository.close();
    const restarted = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, name), guard: ownerGuard(), transport: { ...neverAck, subscribe: (next) => { receive = next; return () => {}; } }, persistenceReady: persistent });
    await restarted.exportPending();
    restarted.subscribe((revisions) => { seen = revisions; });
    receive?.({ revisions: [revision], fromCache: false, hasPendingWrites: false });
    await vi.waitFor(() => expect(seen).toEqual([revision]));
    expect(await restarted.exportPending()).toEqual([conflicting]);
    await restarted.close();
  });

  it('recovers every allowed string ID, dispatches it after restart and blocks logout until resolved', async () => {
    const name = dbName();
    const exotic = { ...revision, id: '\uffffx' };
    const box = new IndexedDbOutbox(session, name);
    const bob = new IndexedDbOutbox({ uid: 'bob', emailVerified: true }, name);
    await box.put(exotic);
    await bob.put({ ...exotic, payload: null });
    expect((await box.list()).map((entry) => entry.revision)).toEqual([exotic]);
    await box.close();
    const sent: Revision[] = [];
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, name), guard: ownerGuard(), transport: { ...neverAck, send: (value) => { sent.push(value); return new Promise(() => {}); } }, persistenceReady: persistent });
    expect(await repository.exportPending()).toEqual([exotic]);
    expect(sent).toEqual([exotic]);
    expect((await bob.list()).map((entry) => entry.revision.payload)).toEqual([null]);
    await expect(closeSession({ repository, guard: ownerGuard(), clearPersistence: async () => {}, clearUserState: async () => {}, signOut: async () => {} })).rejects.toThrow('PENDING_COMMANDS');
    await repository.close(); await bob.close();
  });

  it.each(['old-marker', 'missing-cache', 'partial-cache', 'memory-fallback'] as const)('keeps %s history incomplete despite a working outbox', async (scenario) => {
    const guard = ownerGuard();
    const second = { ...revision, id: 'r2', aggregateId: 'bank', payload: { ...revision.payload as object, id: 'bank' } };
    if (scenario !== 'old-marker') await guard.markHydrated(session, [revision, second]);
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    const persistenceReady = Promise.resolve(scenario === 'memory-fallback' ? { state: 'unavailable' as const, code: 'unimplemented' } : { state: 'persistent' as const });
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, dbName()), guard, transport: { ...neverAck, subscribe: (next) => { receive = next; return () => {}; } }, persistenceReady });
    await repository.exportPending();
    let latest = { hydrated: true, durable: true, mode: 'synced' };
    let complete = true;
    let emissions = 0;
    repository.subscribe((revisions, status) => { latest = status; complete = projectionToSnapshot(revisions, status, { asOf: '2026-10-18T12:00:00.000Z' }).complete; emissions += 1; });
    const beforeReceive = emissions;
    receive?.({ revisions: scenario === 'partial-cache' ? [revision] : [], fromCache: scenario !== 'memory-fallback', hasPendingWrites: false });
    await vi.waitFor(() => expect(emissions).toBeGreaterThan(beforeReceive));
    expect(latest.hydrated).toBe(false);
    expect(complete).toBe(false);
    if (scenario === 'memory-fallback') {
      expect(latest.durable).toBe(false);
      expect(latest.mode).toBe('error');
      expect(await repository.append(revision)).toEqual({ revisionId: 'r1', state: 'local' });
      expect(await repository.exportPending()).toEqual([revision]);
    }
    await repository.close();
  });

  it.each([{ history: [] as Revision[] }, { history: [revision] }])('verifies persisted coverage for truly empty and populated caches after restart: %j', async ({ history }) => {
    const name = dbName();
    const guard = await loadSessionOwnerGuard(session, name);
    await guard.activate(session, true);
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    const transport: RevisionTransport = { ...neverAck, subscribe: (next) => { receive = next; return () => {}; } };
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, name), guard, transport, persistenceReady: persistent });
    await repository.exportPending();
    let complete = false;
    repository.subscribe((revisions, status) => { complete = projectionToSnapshot(revisions, status, { asOf: '2026-10-18T12:00:00.000Z' }).complete; });
    receive?.({ revisions: history, fromCache: false, hasPendingWrites: false });
    await vi.waitFor(() => expect(complete).toBe(true));
    await repository.close();
    const restored = await loadSessionOwnerGuard(session, name);
    await restored.activate(session, false);
    const restarted = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, name), guard: restored, transport, persistenceReady: persistent });
    await restarted.exportPending();
    complete = false;
    restarted.subscribe((revisions, status) => { complete = projectionToSnapshot(revisions, status, { asOf: '2026-10-18T12:00:00.000Z' }).complete; });
    receive?.({ revisions: history, fromCache: true, hasPendingWrites: false });
    await vi.waitFor(() => expect(complete).toBe(true));
    await restarted.close();
  });

  it('detects changed content under a cached ID and excludes server timestamps from integrity hashes', async () => {
    const guard = ownerGuard();
    await guard.markHydrated(session, [revision]);
    expect(await guard.cacheMatches(session, [{ ...revision, receivedAtServer: '2026-10-18T12:00:00.000Z' }])).toBe(true);
    expect(await guard.cacheMatches(session, [{ ...revision, payload: { ...revision.payload as object, name: 'Changed cached value' } }])).toBe(false);
    const original = new SessionOwnerGuard({ ownerUid: 'alice', hydratedUid: 'alice' });
    expect(original.isHydrated(session)).toBe(false);
    await expect(original.activate(session, false)).rejects.toThrow('OFFLINE_UNAVAILABLE');
  });

  it('does not promote pending server overlays into the authoritative manifest', async () => {
    const guard = ownerGuard();
    await guard.markHydrated(session, [revision]);
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, dbName()), guard, transport: { ...neverAck, subscribe: (next) => { receive = next; return () => {}; } }, persistenceReady: persistent });
    const second = { ...revision, id: 'r2', aggregateId: 'bank', payload: { ...revision.payload as object, id: 'bank' } };
    await repository.append(second);
    let hydrated = false;
    repository.subscribe((_revisions, status) => { hydrated = status.hydrated; });
    receive?.({ revisions: [revision, second], fromCache: false, hasPendingWrites: true });
    await vi.waitFor(() => expect(hydrated).toBe(true));
    expect(await guard.cacheMatches(session, [revision])).toBe(true);
    expect(await guard.cacheMatches(session, [revision, second])).toBe(false);
    expect(await guard.cacheMatches(session, [revision, second], [second])).toBe(true);
    await repository.close();
  });

  it('serializes asynchronous manifest writes so earlier events cannot overwrite newer history', async () => {
    let writes = 0;
    let release: (() => void) | undefined;
    const firstWrite = new Promise<void>((resolve) => { release = resolve; });
    const guard = new SessionOwnerGuard({ ownerUid: 'alice', hydratedUid: null }, async () => { writes += 1; if (writes === 1) await firstWrite; });
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, dbName()), guard, transport: { ...neverAck, subscribe: (next) => { receive = next; return () => {}; } }, persistenceReady: persistent });
    await repository.exportPending();
    const second = { ...revision, id: 'r2', aggregateId: 'bank', payload: { ...revision.payload as object, id: 'bank' } };
    let seen: Revision[] = [];
    repository.subscribe((revisions) => { seen = revisions; });
    receive?.({ revisions: [revision], fromCache: false, hasPendingWrites: false });
    receive?.({ revisions: [revision, second], fromCache: false, hasPendingWrites: false });
    await vi.waitFor(() => expect(writes).toBe(1));
    release?.();
    await vi.waitFor(() => expect(seen).toEqual([revision, second]));
    expect(writes).toBe(2);
    expect(await guard.cacheMatches(session, [revision, second])).toBe(true);
    expect(await guard.cacheMatches(session, [revision])).toBe(false);
    await repository.close();
  });
  it('resolves append durably while the remote ACK is still pending', async () => {
    const box = new IndexedDbOutbox(session, dbName());
    const repository = new FirestoreRevisionRepository(session, { outbox: box, guard: ownerGuard(), transport: neverAck, persistenceReady: persistent });
    expect(await repository.append(revision)).toEqual({ revisionId: 'r1', state: 'local' });
    expect(await repository.exportPending()).toEqual([revision]);
    await repository.close();
  });

  it('retains server rejection for correction and removes only acknowledged commands', async () => {
    const box = new IndexedDbOutbox(session, dbName());
    let allow = false;
    const repository = new FirestoreRevisionRepository(session, { outbox: box, guard: ownerGuard(), transport: { ...neverAck, send: async () => { if (!allow) throw new Error('permission-denied'); } }, persistenceReady: persistent });
    await repository.append(revision);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect((await box.list())[0]?.state).toBe('rejected');
    expect(await repository.exportPending()).toEqual([revision]);
    allow = true;
    await repository.retry('r1');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await repository.exportPending()).toEqual([]);
    await repository.close();
  });
  it('refuses a corrupted nested installment before local save or financial hydration', async () => {
    const box = new IndexedDbOutbox(session, dbName());
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    const repository = new FirestoreRevisionRepository(session, { outbox: box, guard: ownerGuard(), transport: { ...neverAck, subscribe: (next) => { receive = next; return () => {}; } }, persistenceReady: persistent });
    const bad: Revision = { ...revision, kind: 'installmentPlan', payload: { id: 'cash', movementId: 'purchase', cardId: 'card', installments: [{ ordinal: 1, dueDate: '2026-10-15', amount: { currency: 'NIO', minor: 'bad' } }] } };
    await expect(repository.append(bad)).rejects.toThrow();
    expect(await repository.exportPending()).toEqual([]);
    let seen: Revision[] = [];
    let mode = '';
    let hydrated = true;
    let rejected = 0;
    repository.subscribe((revisions, status) => { seen = revisions; mode = status.mode; hydrated = status.hydrated; rejected = status.rejected; });
    receive?.({ revisions: [bad], fromCache: false, hasPendingWrites: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen).toEqual([]);
    expect(mode).toBe('error');
    expect(hydrated).toBe(false);
    expect(rejected).toBe(1);
    await repository.close();
  });

  it('blocks cached reads across UID and first access offline', async () => {
    const guard = ownerGuard();
    expect(() => guard.assert({ uid: 'bob', emailVerified: true })).toThrow();
    const fresh = new SessionOwnerGuard({ ownerUid: null, hydratedUid: null });
    await expect(fresh.activate(session, false)).rejects.toThrow();
    expect(() => new IndexedDbOutbox({ uid: 'alice', emailVerified: false } as never, dbName())).toThrow();
  });
  it('applies the canonical financial validator before append and remote hydration', async () => {
    let receive: Parameters<RevisionTransport['subscribe']>[0] | undefined;
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, dbName()), guard: ownerGuard(), transport: { ...neverAck, subscribe: (next) => { receive = next; return () => {}; } }, persistenceReady: persistent });
    const unbalanced: Revision = { ...revision, kind: 'movement', payload: { id: 'cash', date: '2026-10-15', kind: 'expense', postings: [{ accountId: 'cash', amount: { currency: 'NIO', minor: -99 } }, { accountId: 'sys-expense-NIO', amount: { currency: 'NIO', minor: 100 } }], flows: [{ kind: 'expense', categoryId: 'food', amount: { currency: 'NIO', minor: 100 } }] } };
    await expect(repository.append(unbalanced)).rejects.toMatchObject({ code: 'UNBALANCED' });
    expect(await repository.exportPending()).toEqual([]);
    let incomplete = false;
    repository.subscribe((revisions, status) => { incomplete = revisions.length === 0 && !status.hydrated && status.rejected === 1; });
    receive?.({ revisions: [unbalanced], fromCache: false, hasPendingWrites: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(incomplete).toBe(true);
    await repository.close();
  });

  it('blocks logout with pending commands and never silently discards the outbox', async () => {
    const box = new IndexedDbOutbox(session, dbName());
    const repository = new FirestoreRevisionRepository(session, { outbox: box, guard: ownerGuard(), transport: neverAck, persistenceReady: persistent });
    await repository.append(revision);
    await expect(closeSession({ repository, guard: ownerGuard(), clearPersistence: async () => {}, clearUserState: async () => {}, signOut: async () => {} })).rejects.toThrow('PENDING_COMMANDS');
    expect(await repository.exportPending()).toEqual([revision]);
    await repository.close();
  });
  it('persists owner hydration across restart and cleans metadata after repository shutdown', async () => {
    const name = dbName();
    const guard = await loadSessionOwnerGuard(session, name);
    await guard.activate(session, true);
    await guard.markHydrated(session, []);
    const restored = await loadSessionOwnerGuard(session, name);
    expect(restored.isHydrated(session)).toBe(true);
    await expect(restored.activate({ uid: 'bob', emailVerified: true }, true)).rejects.toThrow('SESSION_CLEANUP_REQUIRED');
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, name), guard: restored, transport: neverAck, persistenceReady: persistent });
    await closeSession({ repository, guard: restored, clearUserState: async () => {}, clearPersistence: async () => {}, signOut: async () => {} });
    const next = await loadSessionOwnerGuard({ uid: 'bob', emailVerified: true }, name);
    await next.activate({ uid: 'bob', emailVerified: true }, true);
    expect(next.isHydrated({ uid: 'bob', emailVerified: true })).toBe(false);
  });
});
