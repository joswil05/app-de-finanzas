import { z } from 'zod';
import { AppErrorCodeSchema, PurchaseSchema } from './entities';
import { MovementIntentSchema } from './intent';
import { IdSchema, IsoTimestampSchema, LocalDateSchema } from './money';

export const ToolCallSchema = z.discriminatedUnion('name', [
  z.object({ id: IdSchema, name: z.literal('summary'), args: z.object({ through: LocalDateSchema }).strict() }).strict(),
  z.object({ id: IdSchema, name: z.literal('expenses'), args: z.object({ from: LocalDateSchema, to: LocalDateSchema, categoryId: IdSchema.optional() }).strict().refine((value) => value.to >= value.from, 'Rango invertido') }).strict(),
  z.object({ id: IdSchema, name: z.literal('commitments'), args: z.object({ through: LocalDateSchema }).strict() }).strict(),
  z.object({ id: IdSchema, name: z.literal('simulatePurchase'), args: z.object({ purchase: PurchaseSchema, through: LocalDateSchema }).strict() }).strict(),
  z.object({ id: IdSchema, name: z.literal('draftMovement'), args: z.object({ intent: MovementIntentSchema }).strict() }).strict(),
]);
export type ToolCall = z.infer<typeof ToolCallSchema>;
export const ToolResultSchema = z.object({ callId: IdSchema, data: z.unknown(), asOf: IsoTimestampSchema, complete: z.boolean(), pendingCount: z.number().int().safe().nonnegative() }).strict();
export type ToolResult = z.infer<typeof ToolResultSchema>;
export const ApiErrorSchema = z.object({ code: AppErrorCodeSchema, message: z.string().min(1).max(2000), retryAfterSeconds: z.number().int().nonnegative().max(86_400).optional() }).strict();
export type ApiError = z.infer<typeof ApiErrorSchema>;
