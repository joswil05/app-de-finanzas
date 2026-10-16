import { CurrencySchema, DomainError, FxRateSchema, MAX_MINOR, MoneySchema, type Currency, type FxRate, type Money } from '@fin/contracts';

/** Converts a final integer result only; intermediate arithmetic remains BigInt. */
export function checkedMinor(value: bigint): number {
  if (value > BigInt(MAX_MINOR) || value < -BigInt(MAX_MINOR)) throw new DomainError('INVALID_INPUT', 'El importe supera el límite permitido.');
  return Number(value);
}

export function parseMoney(text: string, currency: Currency): Money {
  if (!CurrencySchema.safeParse(currency).success || typeof text !== 'string') throw new DomainError('INVALID_INPUT', 'Moneda o importe inválido.');
  const normalized = text.trim();
  // Length bounds the BigInt parser while admitting the entire monetary range.
  if (normalized.length > 32 || !/^-?\d+(?:[.,]\d{1,2})?$/u.test(normalized)) throw new DomainError('INVALID_INPUT', 'Use un importe decimal sin separadores de miles.');
  const negative = normalized.startsWith('-');
  const [whole = '0', fraction = ''] = normalized.replace('-', '').split(/[.,]/u);
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return { currency, minor: checkedMinor(negative ? -minor : minor) };
}

export function convertMoney(value: Money, target: Currency, rate: FxRate): Money {
  const parsed = MoneySchema.safeParse(value);
  const parsedRate = FxRateSchema.safeParse(rate);
  if (!parsed.success || !CurrencySchema.safeParse(target).success || !parsedRate.success) throw new DomainError('INVALID_INPUT', 'Importe, moneda o tasa inválida.');
  if (parsed.data.currency === target) return { ...parsed.data };
  const [whole = '0', fraction = ''] = parsedRate.data.nioPerUsd.split('.');
  const scale = 10n ** BigInt(fraction.length);
  const rateInteger = BigInt(whole + fraction);
  const numerator = BigInt(parsed.data.minor) * (target === 'NIO' ? rateInteger : scale);
  const denominator = target === 'NIO' ? scale : rateInteger;
  const absolute = numerator < 0n ? -numerator : numerator;
  const quotient = absolute / denominator;
  const rounded = quotient + (absolute % denominator * 2n >= denominator ? 1n : 0n);
  return { currency: target, minor: checkedMinor(numerator < 0n ? -rounded : rounded) };
}
