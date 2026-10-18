import { useId } from 'react';
import styles from './Surfaces.module.css';

export interface ProgressValueProps { current: number; target: number; label: string }
const numberFormat = new Intl.NumberFormat('es-NI', { maximumFractionDigits: 2 });
export function ProgressValue({ current, target, label }: ProgressValueProps) {
  const labelId = useId(); const textId = useId();
  const known = Number.isFinite(current) && Number.isFinite(target);
  const valid = known && target > 0;
  const percent = valid ? Math.max(0, Math.min(100, current / target * 100)) : 0;
  return <div className={styles.progress}><span id={labelId} className={styles.progressLabel}>{label}</span>{valid ? <><span id={textId} className={styles.progressText}>{numberFormat.format(current)} de {numberFormat.format(target)}</span><div role="progressbar" aria-labelledby={labelId} aria-describedby={textId} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${numberFormat.format(current)} de ${numberFormat.format(target)}`} className={styles.track}><span style={{ width: `${percent}%` }} className={styles.fill} /></div>{current > target && <p className={styles.excess}>Superaste el objetivo por {numberFormat.format(current - target)}</p>}</> : <span className={styles.description}>{known ? 'Sin objetivo definido' : 'Progreso no disponible'}</span>}</div>;
}
