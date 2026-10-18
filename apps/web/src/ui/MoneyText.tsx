import type { Money } from '@fin/contracts';
import styles from './MoneyText.module.css';

export interface MoneyTextProps { value: Money; className?: string }
const amountFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Money is already validated at the contract boundary; formatting never converts currencies. */
export function MoneyText({ value, className }: MoneyTextProps) {
  const symbol = value.currency === 'NIO' ? 'C$' : 'US$';
  const text = `${value.minor < 0 ? '-' : ''}${symbol} ${amountFormat.format(Math.abs(value.minor) / 100)}`;
  return <span className={[styles.money, className].filter(Boolean).join(' ')} data-currency={value.currency}>{text}</span>;
}
