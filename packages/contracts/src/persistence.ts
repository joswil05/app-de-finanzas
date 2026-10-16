import { z } from 'zod';
import { IdSchema, IsoTimestampSchema } from './money';
import { RevisionSchema } from './revision';
import type { Revision } from './revision';
import type { Id } from './money';

export const SaveReceiptSchema = z.object({ revisionId: IdSchema, state: z.enum(['local', 'synced']) }).strict();
export type SaveReceipt = z.infer<typeof SaveReceiptSchema>;
export const SyncStatusSchema = z.object({ mode: z.enum(['offline', 'syncing', 'synced', 'error']), pending: z.number().int().safe().nonnegative(), rejected: z.number().int().safe().nonnegative(), lastSyncedAt: IsoTimestampSchema.optional(), hydrated: z.boolean(), durable: z.boolean() }).strict();
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export interface RevisionRepository {
  append(revision: Revision): Promise<SaveReceipt>;
  subscribe(listener: (revisions: Revision[], status: SyncStatus) => void): () => void;
  retry(revisionId: Id): Promise<void>;
  exportPending(): Promise<Revision[]>;
  close(): Promise<void>;
}
export const BackupSchema = z.object({ schemaVersion: z.literal(1), exportedAt: IsoTimestampSchema, ownerUid: IdSchema, revisions: z.array(RevisionSchema) }).strict();
export type Backup = z.infer<typeof BackupSchema>;
