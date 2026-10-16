import { z } from 'zod';
import { AccountSchema, AllocationSchema, BudgetRuleSchema, CardSchema, CategorySchema, FavoriteSchema, GoalSchema, InstallmentPlanSchema, InvestmentSchema, LoanDetailsSchema, MovementSchema, OccurrenceOverrideSchema, RecurringRuleSchema, UserSettingsSchema, ValuationSchema } from './entities';
import { IdSchema, IsoTimestampSchema } from './money';
import type { Id } from './money';

export const AggregateKindSchema = z.enum(['account', 'movement', 'budget', 'goal', 'allocation', 'loan', 'investment', 'valuation', 'recurring', 'occurrenceOverride', 'card', 'installmentPlan', 'category', 'favorite', 'settings']);
export type AggregateKind = z.infer<typeof AggregateKindSchema>;
export type Revision<T = unknown> = {
  schemaVersion: 1; id: Id; aggregateId: Id; kind: AggregateKind;
  parentIds: Id[]; payload: T | null; deviceId: Id; createdAtClient: string;
  receivedAtServer?: string | undefined;
};
export type Head<T> = { aggregateId: Id; value: T | null; headIds: Id[]; state: 'resolved' | 'conflict' | 'missingParents' | 'invalid' };
export const HeadSchema = z.object({ aggregateId: IdSchema, value: z.unknown(), headIds: z.array(IdSchema), state: z.enum(['resolved', 'conflict', 'missingParents', 'invalid']) }).strict();
export const RevisionMetadataSchema = z.object({ receivedAtServer: IsoTimestampSchema.optional() }).strict();
export type RevisionMetadata = z.infer<typeof RevisionMetadataSchema>;
export const RevisionEnvelopeSchema = z.object({ schemaVersion: z.literal(1), id: IdSchema, aggregateId: IdSchema, kind: AggregateKindSchema, parentIds: z.array(IdSchema).max(20), payload: z.unknown(), deviceId: IdSchema, createdAtClient: IsoTimestampSchema, receivedAtServer: IsoTimestampSchema.optional() }).strict();
export const RevisionPayloadSchemas = {
  account: AccountSchema, movement: MovementSchema, budget: BudgetRuleSchema,
  goal: GoalSchema, allocation: AllocationSchema, loan: LoanDetailsSchema,
  investment: InvestmentSchema, valuation: ValuationSchema,
  recurring: RecurringRuleSchema, occurrenceOverride: OccurrenceOverrideSchema,
  card: CardSchema, installmentPlan: InstallmentPlanSchema, category: CategorySchema,
  favorite: FavoriteSchema, settings: UserSettingsSchema,
} as const satisfies Record<AggregateKind, z.ZodType>;

// The envelope is useful for generic graph processing; persistence must use RevisionSchema.
export const RevisionSchema = RevisionEnvelopeSchema.superRefine((revision, ctx) => {
  if (revision.parentIds.includes(revision.id)) ctx.addIssue({ code: 'custom', path: ['parentIds'], message: 'Una revisión no puede ser su propio padre' });
  if (new Set(revision.parentIds).size !== revision.parentIds.length) ctx.addIssue({ code: 'custom', path: ['parentIds'], message: 'Padres duplicados' });
  if (revision.payload === null) return;
  const parsed = RevisionPayloadSchemas[revision.kind].safeParse(revision.payload);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) ctx.addIssue({ code: 'custom', path: ['payload', ...issue.path], message: issue.message });
    return;
  }
  if ('id' in parsed.data && parsed.data.id !== revision.aggregateId) ctx.addIssue({ code: 'custom', path: ['aggregateId'], message: 'La identidad del agregado y payload difieren' });
  try {
    if (new TextEncoder().encode(JSON.stringify(revision.payload)).byteLength > 65_536) ctx.addIssue({ code: 'custom', path: ['payload'], message: 'Payload supera 64 KiB' });
  } catch { ctx.addIssue({ code: 'custom', path: ['payload'], message: 'Payload no serializable' }); }
});

/** Excludes server transport metadata from idempotency/backup comparisons. */
export function financialRevisionContent<T>(revision: Revision<T>): Omit<Revision<T>, 'receivedAtServer'> {
  const content = { ...revision };
  delete content.receivedAtServer;
  return content;
}
