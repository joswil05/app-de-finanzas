import { z } from 'zod';

export const MAX_MINOR = 9_000_000_000_000;
export const CurrencySchema = z.enum(['NIO', 'USD']);
export type Currency = z.infer<typeof CurrencySchema>;
export const MinorSchema = z.number().int().safe().min(-MAX_MINOR).max(MAX_MINOR);
export const NonNegativeMinorSchema = MinorSchema.nonnegative();
export const MoneySchema = z.object({ currency: CurrencySchema, minor: MinorSchema }).strict();
export type Money = z.infer<typeof MoneySchema>;
export const NonNegativeMoneySchema = MoneySchema.extend({ minor: NonNegativeMinorSchema });
export const PositiveMoneySchema = MoneySchema.extend({ minor: NonNegativeMinorSchema.positive() });
export const IdSchema = z.string().min(1).max(128).refine((value) => !/[\\/]/u.test(value) && !Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) && value !== '.' && value !== '..' && value.trim() === value, 'ID inválido');
export type Id = z.infer<typeof IdSchema>;
export const LocalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine((value) => {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}, 'Fecha local imposible');
export type LocalDate = z.infer<typeof LocalDateSchema>;
export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/u).refine((value) => !value.startsWith('0000-'));
export const IsoTimestampSchema = z.string().datetime({ offset: true });
export const NoteSchema = z.string().max(2000);
export const NameSchema = z.string().trim().min(1).max(200);
export const FxRateSchema = z.object({
  nioPerUsd: z.string().max(32).regex(/^\d+(?:\.\d{1,8})?$/u).refine((value) => Number(value) > 0 && Number.isFinite(Number(value))),
  effectiveDate: LocalDateSchema, fetchedAt: IsoTimestampSchema, source: z.enum(['BCN', 'manual']),
}).strict();
export type FxRate = z.infer<typeof FxRateSchema>;
