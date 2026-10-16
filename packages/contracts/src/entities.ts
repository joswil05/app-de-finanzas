import { z } from 'zod';
import { CurrencySchema, FxRateSchema, IdSchema, IsoTimestampSchema, LocalDateSchema, MinorSchema, MoneySchema, MonthSchema, NameSchema, NonNegativeMinorSchema, NonNegativeMoneySchema, NoteSchema, PositiveMoneySchema } from './money';
import { MovementIntentTemplateSchema } from './intent';

export const VerifiedSessionSchema = z.object({ uid: IdSchema, emailVerified: z.literal(true) }).strict();
export type VerifiedSession = z.infer<typeof VerifiedSessionSchema>;
export const UserProfileSchema = z.object({ uid: IdSchema, displayName: NameSchema.optional(), setupComplete: z.boolean() }).strict();
export type UserProfile = z.infer<typeof UserProfileSchema>;
export const PostingSchema = z.object({ accountId: IdSchema, amount: MoneySchema }).strict();
export type Posting = z.infer<typeof PostingSchema>;
export const FlowSchema = z.object({ kind: z.enum(['income', 'expense']), amount: MoneySchema, categoryId: IdSchema }).strict();
export type Flow = z.infer<typeof FlowSchema>;
export const MovementKindSchema = z.enum(['income', 'expense', 'transfer', 'opening', 'adjustment', 'cardPurchase', 'cardPayment', 'refund', 'loanPrincipal', 'interest', 'investmentTransfer', 'investmentYield']);
export const MovementSchema = z.object({
  id: IdSchema, date: LocalDateSchema, kind: MovementKindSchema,
  postings: z.array(PostingSchema).min(2).max(8), flows: z.array(FlowSchema).max(4),
  note: NoteSchema.optional(), fx: FxRateSchema.optional(), linkedId: IdSchema.optional(), occurrenceId: IdSchema.optional(), draftId: IdSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.kind !== 'refund' && value.flows.some((flow) => flow.amount.minor < 0)) ctx.addIssue({ code: 'custom', path: ['flows'], message: 'Solo una devolución admite flujo negativo' });
});
export type Movement = z.infer<typeof MovementSchema>;
export const AccountSchema = z.object({ id: IdSchema, name: NameSchema, kind: z.enum(['cash', 'bank', 'card', 'loanReceivable', 'loanPayable', 'investment', 'system']), currency: CurrencySchema, archived: z.boolean() }).strict();
export type Account = z.infer<typeof AccountSchema>;
export const BudgetRuleSchema = z.object({ id: IdSchema, categoryId: IdSchema, currency: CurrencySchema, limitMinor: NonNegativeMinorSchema, startsMonth: MonthSchema, carryPositive: z.boolean() }).strict();
export type BudgetRule = z.infer<typeof BudgetRuleSchema>;
export const GoalSchema = z.object({ id: IdSchema, name: NameSchema, target: PositiveMoneySchema, dueDate: LocalDateSchema.optional() }).strict();
export type Goal = z.infer<typeof GoalSchema>;
export const AllocationSchema = z.object({ id: IdSchema, goalId: IdSchema, accountId: IdSchema, amount: NonNegativeMoneySchema }).strict();
export type Allocation = z.infer<typeof AllocationSchema>;
export const CommitmentSchema = z.object({ id: IdSchema, dueDate: LocalDateSchema, amount: NonNegativeMoneySchema, paidMinor: NonNegativeMinorSchema, linkedGoalId: IdSchema.optional(), kind: z.enum(['cashExpense', 'cardDue', 'loanDue']) }).strict().refine((value) => value.paidMinor <= value.amount.minor, 'El pago supera la obligación');
export type Commitment = z.infer<typeof CommitmentSchema>;
export const SnapshotSchema = z.object({
  accounts: z.array(AccountSchema), movements: z.array(MovementSchema), goals: z.array(GoalSchema), allocations: z.array(AllocationSchema), commitments: z.array(CommitmentSchema), budgetRules: z.array(BudgetRuleSchema), rates: z.array(FxRateSchema),
  asOf: IsoTimestampSchema, complete: z.boolean(), pendingCount: z.number().int().safe().nonnegative(), conflictAggregateIds: z.array(IdSchema),
}).strict();
export type Snapshot = z.infer<typeof SnapshotSchema>;
export const AvailableSchema = z.object({ currency: CurrencySchema, liquidMinor: MinorSchema, protectedGoalMinor: NonNegativeMinorSchema, extraCommitmentMinor: NonNegativeMinorSchema, availableMinor: MinorSchema, through: LocalDateSchema, complete: z.boolean(), reasons: z.array(z.string().max(2000)) }).strict();
export type Available = z.infer<typeof AvailableSchema>;
export const PurchaseSchema = z.object({ amount: PositiveMoneySchema, paymentAccountId: IdSchema, date: LocalDateSchema, categoryId: IdSchema.optional(), debitAmount: PositiveMoneySchema.optional(), fx: FxRateSchema.optional() }).strict();
export type Purchase = z.infer<typeof PurchaseSchema>;
export const SimulationSchema = z.object({ before: z.array(AvailableSchema), after: z.array(AvailableSchema), purchase: PurchaseSchema, complete: z.boolean(), reasons: z.array(z.string().max(2000)) }).strict();
export type Simulation = z.infer<typeof SimulationSchema>;
export const RecurrenceSchema = z.object({ id: IdSchema, start: LocalDateSchema, end: LocalDateSchema.optional(), frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']) }).strict().refine((value) => !value.end || value.end >= value.start, 'Fin anterior al inicio');
export type Recurrence = z.infer<typeof RecurrenceSchema>;
export const OccurrenceSchema = z.object({ id: IdSchema, ruleId: IdSchema, date: LocalDateSchema, ordinal: z.number().int().safe().nonnegative() }).strict();
export type Occurrence = z.infer<typeof OccurrenceSchema>;
export const CardTermsSchema = z.object({ closingDay: z.number().int().min(1).max(31), dueDay: z.number().int().min(1).max(31) }).strict();
export type CardTerms = z.infer<typeof CardTermsSchema>;
export const CycleSchema = z.object({ start: LocalDateSchema, close: LocalDateSchema, due: LocalDateSchema }).strict().refine((value) => value.start <= value.close && value.due > value.close, 'Ciclo inválido');
export type Cycle = z.infer<typeof CycleSchema>;
export const InstallmentSchema = z.object({ ordinal: z.number().int().safe().positive(), dueDate: LocalDateSchema, amount: NonNegativeMoneySchema }).strict();
export type Installment = z.infer<typeof InstallmentSchema>;
export const LoanSchema = z.object({ id: IdSchema, direction: z.enum(['payable', 'receivable']), principal: PositiveMoneySchema }).strict();
export type Loan = z.infer<typeof LoanSchema>;
export const InvestmentSummaryInputSchema = z.object({ initialMinor: NonNegativeMinorSchema, contributionsMinor: NonNegativeMinorSchema, withdrawalsMinor: NonNegativeMinorSchema, distributedYieldMinor: NonNegativeMinorSchema, currentValueMinor: NonNegativeMinorSchema }).strict();
export type InvestmentSummaryInput = z.infer<typeof InvestmentSummaryInputSchema>;
export const DraftSchema = z.object({ id: IdSchema, version: z.number().int().safe().positive(), movement: MovementSchema, missingFields: z.array(z.string().min(1).max(200)), confirmed: z.literal(false) }).strict();
export type Draft = z.infer<typeof DraftSchema>;
export const CardSchema = z.object({ id: IdSchema, name: NameSchema, accountIds: z.array(IdSchema).min(1).max(2), terms: CardTermsSchema, limit: z.discriminatedUnion('mode', [z.object({ mode: z.literal('shared'), amount: PositiveMoneySchema }).strict(), z.object({ mode: z.literal('separate'), amounts: z.array(PositiveMoneySchema).min(1).max(2).refine((values) => new Set(values.map((v) => v.currency)).size === values.length) }).strict()]) }).strict();
export type Card = z.infer<typeof CardSchema>;
export const InstallmentPlanSchema = z.object({ id: IdSchema, movementId: IdSchema, cardId: IdSchema, installments: z.array(InstallmentSchema).min(1).max(60) }).strict();
export type InstallmentPlan = z.infer<typeof InstallmentPlanSchema>;
export const LoanDetailsSchema = LoanSchema.extend({ counterparty: NameSchema, accountId: IdSchema, openedAt: LocalDateSchema, dueDate: LocalDateSchema.optional(), initialMode: z.enum(['existing', 'new']), archived: z.boolean() });
export type LoanDetails = z.infer<typeof LoanDetailsSchema>;
export const InvestmentSchema = z.object({ id: IdSchema, name: NameSchema, currency: CurrencySchema, accountId: IdSchema, initialValue: NonNegativeMoneySchema, initialDate: LocalDateSchema, archived: z.boolean() }).strict().refine((value) => value.initialValue.currency === value.currency, 'Moneda inicial distinta');
export type Investment = z.infer<typeof InvestmentSchema>;
export const ValuationSchema = z.object({ id: IdSchema, investmentId: IdSchema, date: LocalDateSchema, value: NonNegativeMoneySchema }).strict();
export type Valuation = z.infer<typeof ValuationSchema>;
export const CategorySchema = z.object({ id: IdSchema, name: NameSchema, flowKind: z.enum(['income', 'expense']), icon: z.string().max(80).optional(), color: z.string().regex(/^#[\da-fA-F]{6}$/u).optional(), archived: z.boolean() }).strict();
export type Category = z.infer<typeof CategorySchema>;
export const FavoriteSchema = z.object({ id: IdSchema, name: NameSchema, template: MovementIntentTemplateSchema }).strict();
export type Favorite = z.infer<typeof FavoriteSchema>;
export const RecurringRuleSchema = z.object({ id: IdSchema, start: LocalDateSchema, end: LocalDateSchema.optional(), frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']), template: MovementIntentTemplateSchema, paused: z.boolean(), reminderDaysBefore: z.array(z.number().int().min(0).max(365)).max(5) }).strict().refine((value) => !value.end || value.end >= value.start, 'Fin anterior al inicio');
export type RecurringRule = z.infer<typeof RecurringRuleSchema>;
export const OccurrenceOverrideSchema = z.object({ id: IdSchema, occurrenceId: IdSchema, action: z.enum(['skip', 'postpone', 'confirm']), postponedTo: LocalDateSchema.optional(), movementId: IdSchema.optional() }).strict().superRefine((value, ctx) => {
  if (value.action === 'postpone' && !value.postponedTo) ctx.addIssue({ code: 'custom', path: ['postponedTo'], message: 'Falta nueva fecha' });
  if (value.action === 'confirm' && !value.movementId) ctx.addIssue({ code: 'custom', path: ['movementId'], message: 'Falta movimiento confirmado' });
});
export type OccurrenceOverride = z.infer<typeof OccurrenceOverrideSchema>;
export const ReminderSchema = z.object({ id: IdSchema, occurrenceId: IdSchema, uid: IdSchema, dueAt: IsoTimestampSchema, state: z.enum(['pending', 'cancelled']), deviceIds: z.array(IdSchema).max(100) }).strict();
export type Reminder = z.infer<typeof ReminderSchema>;
export const ReminderDeliverySchema = z.object({ id: IdSchema, reminderId: IdSchema, deviceId: IdSchema, state: z.enum(['pending', 'leased', 'sent', 'failed', 'expired']), attempts: z.number().int().safe().nonnegative(), leaseUntil: IsoTimestampSchema.optional(), sentAt: IsoTimestampSchema.optional() }).strict();
export type ReminderDelivery = z.infer<typeof ReminderDeliverySchema>;
export const UserSettingsSchema = z.object({ summaryCurrency: CurrencySchema, timezone: z.string().min(1).max(100).refine((value) => { try { new Intl.DateTimeFormat('es-NI', { timeZone: value }); return true; } catch { return false; } }), locale: z.literal('es-NI'), fxMode: z.enum(['automatic', 'manual']), manualRate: FxRateSchema.optional(), hidePushAmounts: z.boolean(), notificationsEnabled: z.boolean(), assistantConsent: z.boolean() }).strict();
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export const AppErrorCodeSchema = z.enum(['INVALID_INPUT', 'UNBALANCED', 'MISSING_RATE', 'CONFLICT', 'OFFLINE_UNAVAILABLE', 'PERSISTENCE_UNAVAILABLE', 'UNAUTHORIZED', 'QUOTA', 'PROVIDER_UNAVAILABLE', 'STALE_DRAFT']);
export type AppErrorCode = z.infer<typeof AppErrorCodeSchema>;
export class DomainError extends Error {
  readonly code: AppErrorCode;
  constructor(code: AppErrorCode, message: string) { super(message); this.name = 'DomainError'; this.code = code; }
}
export const DomainErrorSchema = z.instanceof(DomainError);
