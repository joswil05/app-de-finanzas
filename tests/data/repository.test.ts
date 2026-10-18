import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Revision } from '@fin/contracts';
import { IndexedDbOutbox } from '../../apps/web/src/data/outbox';
import { FirestoreRevisionRepository, type RevisionTransport } from '../../apps/web/src/data/firestore-repository';
import { SessionOwnerGuard, closeSession, loadSessionOwnerGuard } from '../../apps/web/src/data/session-cleanup';

const session = { uid: 'alice', emailVerified: true as const };
const revision: Revision = { schemaVersion: 1, id: 'r1', aggregateId: 'cash', kind: 'account', parentIds: [], deviceId: 'phone', createdAtClient: '2026-10-15T12:00:00.000Z', payload: { id: 'cash', name: 'Efectivo', kind: 'cash', currency: 'NIO', archived: false } };
const dbName = () => `test-${crypto.randomUUID()}`;
const ownerGuard = () => new SessionOwnerGuard({ ownerUid: 'alice', hydratedUid: 'alice' });
const neverAck: RevisionTransport = { send: () => new Promise<void>(() => {}), subscribe: () => () => {} };

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
  it('resolves append durably while the remote ACK is still pending', async () => {
    const box = new IndexedDbOutbox(session, dbName());
    const repository = new FirestoreRevisionRepository(session, { outbox: box, guard: ownerGuard(), transport: neverAck });
    expect(await repository.append(revision)).toEqual({ revisionId: 'r1', state: 'local' });
    expect(await repository.exportPending()).toEqual([revision]);
    await repository.close();
  });

  it('retains server rejection for correction and removes only acknowledged commands', async () => {
    const box = new IndexedDbOutbox(session, dbName());
    let allow = false;
    const repository = new FirestoreRevisionRepository(session, { outbox: box, guard: ownerGuard(), transport: { ...neverAck, send: async () => { if (!allow) throw new Error('permission-denied'); } } });
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
    const repository = new FirestoreRevisionRepository(session, { outbox: box, guard: ownerGuard(), transport: { ...neverAck, subscribe: (next) => { receive = next; return () => {}; } } });
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
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, dbName()), guard: ownerGuard(), transport: { ...neverAck, subscribe: (next) => { receive = next; return () => {}; } } });
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
    const repository = new FirestoreRevisionRepository(session, { outbox: box, guard: ownerGuard(), transport: neverAck });
    await repository.append(revision);
    await expect(closeSession({ repository, guard: ownerGuard(), clearPersistence: async () => {}, clearUserState: async () => {}, signOut: async () => {} })).rejects.toThrow('PENDING_COMMANDS');
    expect(await repository.exportPending()).toEqual([revision]);
    await repository.close();
  });
  it('persists owner hydration across restart and cleans metadata after repository shutdown', async () => {
    const name = dbName();
    const guard = await loadSessionOwnerGuard(session, name);
    await guard.activate(session, true);
    await guard.markHydrated(session);
    const restored = await loadSessionOwnerGuard(session, name);
    expect(restored.isHydrated(session)).toBe(true);
    await expect(restored.activate({ uid: 'bob', emailVerified: true }, true)).rejects.toThrow('SESSION_CLEANUP_REQUIRED');
    const repository = new FirestoreRevisionRepository(session, { outbox: new IndexedDbOutbox(session, name), guard: restored, transport: neverAck });
    await closeSession({ repository, guard: restored, clearUserState: async () => {}, clearPersistence: async () => {}, signOut: async () => {} });
    const next = await loadSessionOwnerGuard({ uid: 'bob', emailVerified: true }, name);
    await next.activate({ uid: 'bob', emailVerified: true }, true);
    expect(next.isHydrated({ uid: 'bob', emailVerified: true })).toBe(false);
  });
});
