import { useId, type ReactNode } from 'react';
import type { Money, SyncStatus } from '@fin/contracts';
import { MoneyText } from './MoneyText';
import { StatusBadge } from './StatusBadge';
import type { SurfaceAction } from './EmptyState';
import controls from './Controls.module.css';
import styles from './Surfaces.module.css';

export interface ResultCardProps {
  title: string; period: string; source: string; values: readonly { label: string; value: Money }[];
  status: SyncStatus; explanation?: ReactNode; action?: SurfaceAction; incomplete?: boolean;
}
/** Values must be supplied by the financial engine; this surface never derives a total. */
export function ResultCard({ title, period, source, values, status, explanation, action, incomplete = false }: ResultCardProps) {
  const titleId = useId();
  return <article aria-labelledby={titleId} className={styles.result}><h3 id={titleId}>{title}</h3><p className={styles.description}>{period}</p><dl className={styles.values}>{values.map(({ label, value }, index) => <div key={`${value.currency}-${index}`}><dt>{label}</dt><dd><MoneyText value={value} /></dd></div>)}</dl>{incomplete && <p className={styles.excess}>Resultado parcial: faltan datos del período.</p>}{explanation && <div className={styles.explanation}>{explanation}</div>}<p className={styles.source}>Fuente: {source}</p><StatusBadge status={status} />{action && <button type="button" className={controls.secondary} onClick={action.onClick}>{action.label}</button>}</article>;
}
