import { MovementSchema, RevisionSchema, VerifiedSessionSchema, type Revision, type VerifiedSession } from '@fin/contracts';
import { validateMovement } from '@fin/domain';

export type OutboxEntry = { uid: string; revisionId: string; revision: Revision; state: 'pending' | 'rejected'; error?: string };
export type CacheManifest = { schemaVersion: 1; entries: Array<{ id: string; sha256: string }> };
export type LocalSessionRecord = { ownerUid: string | null; hydratedUid: string | null; manifest?: CacheManifest };
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]));
  return value;
};
export function financialContent(revision: Revision): string {
  const content = { ...revision };
  delete content.receivedAtServer;
  return JSON.stringify(canonical(content));
}
export function validateLocalRevision(value: Revision): Revision {
  const revision = RevisionSchema.parse(value);
  if (revision.kind === 'movement' && revision.payload !== null) validateMovement(MovementSchema.parse(revision.payload));
  if (new TextEncoder().encode(JSON.stringify(revision.payload)).byteLength > 65_536) throw new Error('INVALID_INPUT: payload exceeds 64 KiB');
  return revision;
}

/** A command journal only. Successful transactions, rather than SDK write promises, establish local completion. */
export class IndexedDbOutbox {
  readonly uid: string;
  private readonly database: Promise<IDBDatabase>;
  private closed = false;
  constructor(session: VerifiedSession, databaseName = 'finanzas-local-v1') {
    this.uid = VerifiedSessionSchema.parse(session).uid;
    this.database = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('PERSISTENCE_UNAVAILABLE')); return; }
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('commands', { keyPath: ['uid', 'revisionId'] });
        request.result.createObjectStore('session');
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { this.closed = true; db.close(); };
        resolve(db);
      };
      request.onerror = () => reject(new Error('PERSISTENCE_UNAVAILABLE', { cause: request.error }));
      request.onblocked = () => reject(new Error('PERSISTENCE_UNAVAILABLE: close other tabs'));
    });
  }
  private async transaction<T>(storeName: 'commands' | 'session', mode: IDBTransactionMode, work: (store: IDBObjectStore, result: (value: T) => void, fail: (error: Error) => void) => void): Promise<T> {
    if (this.closed) throw new Error('Repository closed');
    const db = await this.database;
    return new Promise((resolve, reject) => {
      // strict is a browser durability hint; oncomplete is still required on every browser.
      const tx = db.transaction(storeName, mode, { durability: 'strict' });
      let value: T;
      let failure: Error | undefined;
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(failure ?? new Error('PERSISTENCE_UNAVAILABLE', { cause: tx.error }));
      tx.onerror = () => { failure ??= new Error('PERSISTENCE_UNAVAILABLE', { cause: tx.error }); };
      work(tx.objectStore(storeName), (next) => { value = next; }, (error) => { failure = error; tx.abort(); });
    });
  }
  async put(value: Revision): Promise<void> {
    const revision = validateLocalRevision(value);
    await this.transaction<void>('commands', 'readwrite', (store, result, fail) => {
      const request = store.get([this.uid, revision.id]);
      request.onsuccess = () => {
        const existing = request.result as OutboxEntry | undefined;
        if (existing && financialContent(existing.revision) !== financialContent(revision)) { fail(new Error('CONFLICT: revision ID already has different content')); return; }
        if (!existing) store.put({ uid: this.uid, revisionId: revision.id, revision, state: 'pending' } satisfies OutboxEntry);
        result();
      };
    });
  }
  async list(): Promise<OutboxEntry[]> {
    return this.transaction<OutboxEntry[]>('commands', 'readonly', (store, result) => {
      // Every valid string is below an array in IndexedDB's key ordering; no finite
      // string sentinel can cover all permitted revision IDs (for example U+FFFFx).
      const request = store.getAll(IDBKeyRange.bound([this.uid], [this.uid, []], false, true));
      request.onsuccess = () => result(request.result as OutboxEntry[]);
    });
  }
  async acknowledge(revisionId: string): Promise<void> {
    await this.transaction<void>('commands', 'readwrite', (store, result) => { store.delete([this.uid, revisionId]); result(); });
  }
  async reject(revisionId: string, error: string): Promise<void> { await this.change(revisionId, 'rejected', error.slice(0, 200)); }
  async reset(revisionId: string): Promise<void> { await this.change(revisionId, 'pending'); }
  private async change(revisionId: string, state: OutboxEntry['state'], error?: string): Promise<void> {
    await this.transaction<void>('commands', 'readwrite', (store, result) => {
      const request = store.get([this.uid, revisionId]);
      request.onsuccess = () => {
        const row = request.result as OutboxEntry | undefined;
        if (row) {
          const updated: OutboxEntry = { uid: row.uid, revisionId: row.revisionId, revision: row.revision, state };
          if (error !== undefined) updated.error = error;
          store.put(updated);
        }
        result();
      };
    });
  }
  async readSession(): Promise<LocalSessionRecord> {
    return this.transaction('session', 'readonly', (store, result) => {
      const request = store.get('owner');
      request.onsuccess = () => result((request.result as LocalSessionRecord | undefined) ?? { ownerUid: null, hydratedUid: null });
    });
  }
  async writeSession(record: LocalSessionRecord): Promise<void> {
    await this.transaction<void>('session', 'readwrite', (store, result) => { store.put(record, 'owner'); result(); });
  }
  async close(): Promise<void> { this.closed = true; (await this.database).close(); }
}
