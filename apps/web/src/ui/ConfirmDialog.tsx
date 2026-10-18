import { useId, useRef, type ReactNode } from 'react';
import { ModalFrame } from './ModalFrame';
import controls from './Controls.module.css';
import styles from './Modal.module.css';

export interface ConfirmDialogProps {
  open: boolean; title: string; description: ReactNode; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; cancelLabel?: string; destructive?: boolean; busy?: boolean; error?: string;
}
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel, cancelLabel = 'Cancelar', destructive = true, busy = false, error }: ConfirmDialogProps) {
  const titleId = useId(); const descriptionId = useId(); const cancelRef = useRef<HTMLButtonElement>(null);
  if (!open) return null;
  return <ModalFrame labelledBy={titleId} describedBy={descriptionId} onEscape={() => { if (!busy) onCancel(); }} initialFocus={cancelRef}><h2 id={titleId}>{title}</h2><p id={descriptionId} className={styles.description}>{description}</p>{error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.actions}><button ref={cancelRef} type="button" className={controls.secondary} onClick={onCancel} disabled={busy}>{cancelLabel}</button><button type="button" className={destructive ? controls.danger : controls.primary} onClick={onConfirm} disabled={busy}>{busy ? 'Procesando…' : confirmLabel}</button></div></ModalFrame>;
}
