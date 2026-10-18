import type { ReactNode } from 'react';
import controls from './Controls.module.css';
import styles from './Surfaces.module.css';

export interface SurfaceAction { label: string; onClick: () => void }
export interface EmptyStateProps { title: string; description: string; action?: SurfaceAction; icon?: ReactNode }
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return <section className={styles.empty}>{icon && <span aria-hidden="true" className={styles.icon}>{icon}</span>}<h2>{title}</h2><p className={styles.description}>{description}</p>{action && <button type="button" className={controls.primary} onClick={action.onClick}>{action.label}</button>}</section>;
}
