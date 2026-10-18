import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronRight } from 'lucide-react';
import type { LocalDate, Money, MovementIntent, SyncStatus } from '@fin/contracts';
import { MoneyText } from './MoneyText';
import { StatusBadge } from './StatusBadge';
import styles from './TransactionRow.module.css';

export interface TransactionRowProps {
  description: string; kind: MovementIntent['kind']; value: Money; date: LocalDate;
  accountLabel: string; categoryLabel?: string; receivedValue?: Money; status?: SyncStatus; onOpen?: () => void;
}
const movementLabels = { income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia' } as const;
const movementIcons = { income: ArrowDownLeft, expense: ArrowUpRight, transfer: ArrowLeftRight };
export function TransactionRow({ description, kind, value, date, accountLabel, categoryLabel, receivedValue, status, onOpen }: TransactionRowProps) {
  const Icon = movementIcons[kind];
  const contents = <><span className={styles.identity}><Icon size={20} aria-hidden="true" /><span><span className={styles.title}>{description}</span><span className={styles.meta}>{movementLabels[kind]}{categoryLabel ? ` · ${categoryLabel}` : ''}</span><span className={styles.meta}>{accountLabel}</span></span></span><span className={styles.figures}><MoneyText value={value} />{kind === 'transfer' && receivedValue && <span className={styles.received}>Recibido: <MoneyText value={receivedValue} /></span>}<time className={styles.meta} dateTime={date}>{`${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`}</time></span>{onOpen && <ChevronRight className={styles.chevron} size={20} aria-hidden="true" />}</>;
  return <div className={styles.row}>{onOpen ? <button type="button" className={styles.content} onClick={onOpen}>{contents}</button> : <div className={styles.content}>{contents}</div>}{status && <div className={styles.status}><StatusBadge status={status} /></div>}</div>;
}
