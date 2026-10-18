import { IdSchema, VerifiedSessionSchema, type Revision, type RevisionRepository, type VerifiedSession } from '@fin/contracts';
import { financialContent, IndexedDbOutbox, type CacheManifest, type LocalSessionRecord } from './outbox';

async function cacheManifest(revisions: Revision[]): Promise<CacheManifest> {
  const entries = await Promise.all(revisions.map(async (revision) => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(financialContent(revision)));
    return { id: revision.id, sha256: Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('') };
  }));
  entries.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error('INVALID_CACHE_MANIFEST');
  return { schemaVersion: 1, entries };
}
function validManifest(value: CacheManifest | undefined): value is CacheManifest {
  return value?.schemaVersion === 1 && Array.isArray(value.entries)
    && value.entries.every((entry) => entry && IdSchema.safeParse(entry.id).success && typeof entry.sha256 === 'string' && /^[a-f0-9]{64}$/u.test(entry.sha256))
    && new Set(value.entries.map((entry) => entry.id)).size === value.entries.length;
}

/** Metadata uses short independent connections so repository shutdown cannot prevent owner cleanup. */
export async function loadSessionOwnerGuard(session: VerifiedSession, databaseName = 'finanzas-local-v1'): Promise<SessionOwnerGuard> {
  const initial = new IndexedDbOutbox(session, databaseName);
  let record: LocalSessionRecord;
  try { record = await initial.readSession(); } finally { await initial.close(); }
  return new SessionOwnerGuard(record, async (next) => {
    const metadata = new IndexedDbOutbox(session, databaseName);
    try { await metadata.writeSession(next); } finally { await metadata.close(); }
  });
}

/** This gate is mandatory before subscribing, hydrating or rendering cached financial data. */
export class SessionOwnerGuard {
  private record: LocalSessionRecord;
  constructor(record: LocalSessionRecord, private readonly persist: (record: LocalSessionRecord) => Promise<void> = async () => {}) { this.record = { ...record }; }
  assert(session: VerifiedSession): void {
    VerifiedSessionSchema.parse(session);
    if (this.record.ownerUid !== session.uid) throw new Error('UNAUTHORIZED: cached session belongs to another identity');
  }
  async activate(session: VerifiedSession, online: boolean): Promise<void> {
    VerifiedSessionSchema.parse(session);
    if (this.record.ownerUid !== null && this.record.ownerUid !== session.uid) throw new Error('SESSION_CLEANUP_REQUIRED');
    if (!online && (this.record.ownerUid !== session.uid || this.record.hydratedUid !== session.uid || !validManifest(this.record.manifest))) throw new Error('OFFLINE_UNAVAILABLE: verified history manifest requires connection');
    const next = { ...this.record, ownerUid: session.uid };
    await this.persist(next);
    this.record = next;
  }
  isHydrated(session: VerifiedSession): boolean { this.assert(session); return this.record.hydratedUid === session.uid && validManifest(this.record.manifest); }
  async markHydrated(session: VerifiedSession, revisions: Revision[]): Promise<void> {
    this.assert(session);
    const manifest = await cacheManifest(revisions);
    this.assert(session);
    const next = { ...this.record, hydratedUid: session.uid, manifest };
    await this.persist(next); this.record = next;
  }
  async cacheMatches(session: VerifiedSession, revisions: Revision[], allowedPending: Revision[] = []): Promise<boolean> {
    this.assert(session);
    if (!this.isHydrated(session) || !validManifest(this.record.manifest)) return false;
    const actual = new Map((await cacheManifest(revisions)).entries.map((entry) => [entry.id, entry.sha256]));
    const expected = new Map(this.record.manifest.entries.map((entry) => [entry.id, entry.sha256]));
    const pending = new Map((await cacheManifest(allowedPending)).entries.map((entry) => [entry.id, entry.sha256]));
    for (const [id, digest] of expected) if (actual.get(id) !== digest) return false;
    for (const [id, digest] of actual) if (!expected.has(id) && pending.get(id) !== digest) return false;
    this.assert(session);
    return true;
  }
  async clear(): Promise<void> { const next = { ownerUid: null, hydratedUid: null }; await this.persist(next); this.record = next; }
}

export type SessionCleanupOptions = {
  repository: RevisionRepository; guard: SessionOwnerGuard;
  clearPersistence: () => Promise<void>;
  clearUserState: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Resolves only once an export was durably saved or explicit discard was confirmed. */
  pendingDecision?: 'exported' | 'discard-confirmed';
  discardPending?: () => Promise<void>;
  releaseOtherTabs?: () => Promise<void>;
};

export async function closeSession(options: SessionCleanupOptions): Promise<void> {
  const pending = await options.repository.exportPending();
  if (pending.length > 0 && !options.pendingDecision) throw new Error('PENDING_COMMANDS: synchronize, export or cancel');
  if (pending.length > 0 && options.pendingDecision === 'discard-confirmed') {
    if (!options.discardPending) throw new Error('PENDING_COMMANDS: discard handler required');
    await options.discardPending();
  }
  // Hide UI and abort user-owned requests before attempting physical cache cleanup.
  await options.clearUserState();
  await options.repository.close();
  await options.releaseOtherTabs?.();
  try { await options.clearPersistence(); }
  catch (cause) { throw new Error('SESSION_CLEANUP_BLOCKED: close other tabs and restart before changing account', { cause }); }
  await options.guard.clear();
  await options.signOut();
}

/** Each open client must install this coordinator and release its SDK before acknowledging. */
export class SessionTabCoordinator {
  private readonly channel: BroadcastChannel;
  private readonly pending = new Map<string, () => void>();
  constructor(private readonly release: () => Promise<void>, channelName = 'finanzas-session-v1') {
    this.channel = new BroadcastChannel(channelName);
    this.channel.onmessage = (event: MessageEvent<unknown>) => {
      const value = event.data;
      if (!value || typeof value !== 'object') return;
      const message = value as { type?: string; requestId?: string };
      if (typeof message.requestId !== 'string') return;
      if (message.type === 'release') {
        void this.release().then(() => this.channel.postMessage({ type: 'released', requestId: message.requestId })).catch(() => {});
      } else if (message.type === 'released') this.pending.get(message.requestId)?.();
    };
  }
  async requestRelease(): Promise<void> {
    // ACKs accelerate cooperative release. clearIndexedDbPersistence remains the final authority
    // when any tab is paused, uncooperative or still owns a Firestore connection.
    const requestId = crypto.randomUUID();
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { this.pending.delete(requestId); resolve(); }, 300);
      this.pending.set(requestId, () => { clearTimeout(timer); this.pending.delete(requestId); resolve(); });
      this.channel.postMessage({ type: 'release', requestId });
    });
  }
  close(): void { this.channel.close(); this.pending.clear(); }
}
