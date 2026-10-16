import { z } from 'zod';
import { IdSchema, LocalDateSchema, NoteSchema, PositiveMoneySchema } from './money';

const intentFields = { amount: PositiveMoneySchema, date: LocalDateSchema, accountId: IdSchema, note: NoteSchema.optional() };
export const IncomeIntentSchema = z.object({ ...intentFields, kind: z.literal('income'), categoryId: IdSchema }).strict();
export const ExpenseIntentSchema = z.object({ ...intentFields, kind: z.literal('expense'), categoryId: IdSchema }).strict();
export const TransferIntentSchema = z.object({ ...intentFields, kind: z.literal('transfer'), destinationAccountId: IdSchema, receivedAmount: PositiveMoneySchema.optional(), categoryId: IdSchema.optional() }).strict();
export const MovementIntentSchema = z.discriminatedUnion('kind', [IncomeIntentSchema, ExpenseIntentSchema, TransferIntentSchema]);
export type MovementIntent = z.infer<typeof MovementIntentSchema>;
// Templates may be incomplete; the application must resolve them before building a movement.
export const MovementIntentTemplateSchema = z.object({
  ...intentFields, kind: z.enum(['income', 'expense', 'transfer']), categoryId: IdSchema,
  destinationAccountId: IdSchema, receivedAmount: PositiveMoneySchema,
}).partial().strict();
