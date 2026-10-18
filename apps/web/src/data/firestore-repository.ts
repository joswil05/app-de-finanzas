import { RevisionSchema, VerifiedSessionSchema, type Revision, type RevisionRepository, type SaveReceipt, type SyncStatus, type VerifiedSession } from '@fin/contracts';
import { collection, doc, getDocFromServer, onSnapshot, serverTimestamp, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { financialContent, IndexedDbOutbox, validateLocalRevision, type OutboxEntry } from './outbox';
import { SessionOwnerGuard } from './session-cleanup';

export type RemoteRevisionBatch = { revisions: Revision[]; fromCache: boolean; hasPendingWrites: boolean };
/** Injectable boundary for a slow external service; the production implementation is the modular SDK below. */
export interface RevisionTransport {
  send(revision: Revision): Promise<void>;
  subscribe(next: (batch: RemoteRevisionBatch) => void, error: (cause: unknown) => void): () => void;
}
export type RepositoryDependencies = { outbox: IndexedDbOutbox; guard: SessionOwnerGuard; transport: RevisionTransport; assertCurrentSession?: () => void };
class InvalidRemoteRevisionError extends Error {
  constructor(cause: unknown) { super('INVALID_REMOTE_REVISION: financial history requires review', { cause }); }
}

export function assertOwnNamespace(session: VerifiedSession, namespaceUid: string): void {
  VerifiedSessionSchema.parse(session);
  if (session.uid !== namespaceUid) throw new Error('UNAUTHORIZED: namespace mismatch');
}
function decodeRemote(value: unknown): Revision {
  if (!value || typeof value !== 'object') throw new Error('INVALID_INPUT: remote revision');
  const data = value as Record<string, unknown>;
  const receivedAtServer = data.receivedAtServer;
  const normalized = { ...data };
  if (receivedAtServer instanceof Timestamp) normalized.receivedAtServer = receivedAtServer.toDate().toISOString();
  else if (receivedAtServer === null) delete normalized.receivedAtServer;
  return validateLocalRevision(RevisionSchema.parse(normalized));
}
export function createFirestoreTransport(firestore: Firestore, session: VerifiedSession): RevisionTransport {
  VerifiedSessionSchema.parse(session);
  const path = collection(firestore, 'users', session.uid, 'revisions');
  return {
    async send(revision) {
      const ref = doc(path, revision.id);
      const content = { ...revision };
      delete content.receivedAtServer;
      try { await setDoc(ref, { ...content, receivedAtServer: serverTimestamp() }); }
      catch (cause) {
        // A crash after ACK but before journal cleanup can replay a create-only write.
        // Only an authoritative equal document acknowledges it; collisions remain errors.
        try {
          const existing = await getDocFromServer(ref);
          if (existing.exists() && financialContent(decodeRemote(existing.data())) === financialContent(revision)) return;
        } catch { /* retain the original rejection, including permission failures */ }
        throw cause;
      }
    },
    subscribe(next, error) {
      return onSnapshot(path, { includeMetadataChanges: true }, (snapshot) => {
        try {
          next({ revisions: snapshot.docs.map((entry) => decodeRemote(entry.data({ serverTimestamps: 'estimate' }))), fromCache: snapshot.metadata.fromCache, hasPendingWrites: snapshot.metadata.hasPendingWrites });
        } catch (cause) { error(new InvalidRemoteRevisionError(cause)); }
      }, error);
    },
  };
}

export class FirestoreRevisionRepository implements RevisionRepository {
  private readonly session: VerifiedSession;
  private readonly listeners = new Set<(revisions: Revision[], status: SyncStatus) => void>();
  private readonly inflight = new Set<string>();
  private remote = new Map<string, Revision>();
  private readonly confirmedIds = new Set<string>();
  private local: OutboxEntry[] = [];
  private remoteRejected = 0;
  private status: SyncStatus;
  private closed = false;
  private stop: (() => void) | undefined;
  private readonly ready: Promise<void>;
  constructor(session: VerifiedSession, private readonly dependencies: RepositoryDependencies) {
    this.session = VerifiedSessionSchema.parse(session);
    assertOwnNamespace(session, dependencies.outbox.uid);
    dependencies.guard.assert(session);
    this.status = { mode: 'syncing', pending: 0, rejected: 0, hydrated: false, durable: false };
    this.ready = this.initialize();
    void this.ready.catch(() => { this.status = { ...this.status, mode: 'error', durable: false }; this.emit(); });
  }
  private assertActive(): void {
    if (this.closed) throw new Error('Repository closed');
    this.dependencies.guard.assert(this.session);
    this.dependencies.assertCurrentSession?.();
  }
  private async initialize(): Promise<void> {
    await this.refresh();
    this.assertActive();
    this.stop = this.dependencies.transport.subscribe((batch) => { void this.receive(batch).catch(() => this.quarantineRemote()); }, (cause) => {
      if (this.closed) return;
      if (cause instanceof InvalidRemoteRevisionError) this.quarantineRemote();
      else { this.status = { ...this.status, mode: 'error', hydrated: false }; this.emit(); }
    });
    for (const entry of this.local) if (entry.state === 'pending') this.dispatch(entry.revision);
  }
  private async receive(batch: RemoteRevisionBatch): Promise<void> {
    this.assertActive();
    this.remote = new Map(batch.revisions.map((revision) => [revision.id, validateLocalRevision(revision)]));
    this.remoteRejected = 0;
    if (!batch.fromCache && !batch.hasPendingWrites) for (const revision of batch.revisions) this.confirmedIds.add(revision.id);
    if (!batch.fromCache) await this.dependencies.guard.markHydrated(this.session);
    if (this.closed) return;
    this.status = { ...this.status, hydrated: this.dependencies.guard.isHydrated(this.session), mode: batch.fromCache ? (typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'syncing') : (batch.hasPendingWrites ? 'syncing' : 'synced') };
    if (!batch.fromCache && !batch.hasPendingWrites) this.status.lastSyncedAt = new Date().toISOString();
    await this.refresh();
  }
  private quarantineRemote(): void {
    if (this.closed) return;
    // The entire batch remains outside the trusted projection; retain prior valid data with incomplete status.
    this.remoteRejected = 1;
    this.status = { ...this.status, mode: 'error', hydrated: false, rejected: this.local.filter((entry) => entry.state === 'rejected').length + 1 };
    this.emit();
  }
  private async refresh(): Promise<void> {
    this.local = await this.dependencies.outbox.list();
    if (this.closed) return;
    const localRejected = this.local.filter((entry) => entry.state === 'rejected').length;
    const rejected = localRejected + this.remoteRejected;
    const pending = this.local.length - localRejected;
    this.status = { ...this.status, pending, rejected, durable: true, hydrated: this.remoteRejected ? false : this.status.hydrated, mode: rejected ? 'error' : pending ? (typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'syncing') : this.status.mode };
    this.emit();
  }
  private emit(): void {
    if (this.closed) return;
    try { this.assertActive(); } catch { return; }
    const revisions = new Map(this.remote);
    for (const entry of this.local) {
      if (entry.state === 'rejected') revisions.delete(entry.revisionId);
      else revisions.set(entry.revisionId, entry.revision);
    }
    for (const listener of this.listeners) listener([...revisions.values()], { ...this.status });
  }
  private dispatch(revision: Revision): void {
    if (this.closed || this.inflight.has(revision.id)) return;
    this.assertActive();
    this.inflight.add(revision.id);
    void this.dependencies.transport.send(revision).then(async () => {
      if (this.closed) return;
      this.assertActive();
      this.remote.set(revision.id, revision);
      this.confirmedIds.add(revision.id);
      await this.dependencies.outbox.acknowledge(revision.id);
      this.status = { ...this.status, mode: 'synced', lastSyncedAt: new Date().toISOString() };
      await this.refresh();
    }, async (cause: unknown) => {
      if (this.closed) return;
      this.assertActive();
      const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : 'REMOTE_REJECTED';
      await this.dependencies.outbox.reject(revision.id, code);
      await this.refresh();
    }).catch(() => { if (!this.closed) { this.status = { ...this.status, mode: 'error' }; this.emit(); } }).finally(() => this.inflight.delete(revision.id));
  }
  async append(value: Revision): Promise<SaveReceipt> {
    this.assertActive();
    await this.ready;
    this.assertActive();
    const revision = validateLocalRevision(value);
    const known = this.remote.get(revision.id);
    if (known && financialContent(known) !== financialContent(revision)) throw new Error('CONFLICT: revision ID collision');
    if (known && this.confirmedIds.has(revision.id)) return { revisionId: revision.id, state: 'synced' };
    await this.dependencies.outbox.put(revision);
    this.assertActive();
    await this.refresh();
    this.dispatch(revision);
    return { revisionId: revision.id, state: 'local' };
  }
  subscribe(listener: (revisions: Revision[], status: SyncStatus) => void): () => void {
    this.assertActive();
    this.listeners.add(listener);
    this.emit();
    return () => { this.listeners.delete(listener); };
  }
  async retry(revisionId: string): Promise<void> {
    this.assertActive(); await this.ready;
    const entry = (await this.dependencies.outbox.list()).find((row) => row.revisionId === revisionId);
    if (!entry) return;
    await this.dependencies.outbox.reset(revisionId); await this.refresh(); this.dispatch(entry.revision);
  }
  async exportPending(): Promise<Revision[]> { this.assertActive(); await this.ready; return (await this.dependencies.outbox.list()).map((entry) => entry.revision); }
  async close(): Promise<void> { this.closed = true; this.listeners.clear(); this.stop?.(); await this.ready.catch(() => {}); this.stop?.(); await this.dependencies.outbox.close(); }
}

export function createRevisionRepository(session: VerifiedSession, dependencies: { firestore: Firestore; outbox: IndexedDbOutbox; guard: SessionOwnerGuard; assertCurrentSession: () => void }): RevisionRepository {
  return new FirestoreRevisionRepository(session, { ...dependencies, transport: createFirestoreTransport(dependencies.firestore, session) });
}
