import { useId, useRef, useState, type FormEventHandler, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ModalFrame } from './ModalFrame';
import controls from './Controls.module.css';
import styles from './Modal.module.css';

export interface FormShellProps {
  open: boolean; title: string; children: ReactNode; dirty: boolean; onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>; submitLabel: string; busy?: boolean; error?: string; description?: string;
}
export function FormShell(props: FormShellProps) { return props.open ? <OpenForm {...props} /> : null; }

function OpenForm({ title, children, dirty, onClose, onSubmit, submitLabel, busy = false, error, description }: FormShellProps) {
  const titleId = useId(); const descriptionId = useId(); const [confirming, setConfirming] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null); const continueRef = useRef<HTMLButtonElement>(null);
  function requestClose() {
    if (busy) return;
    if (confirming) { setConfirming(false); queueMicrotask(() => closeRef.current?.focus()); }
    else if (dirty) { setConfirming(true); queueMicrotask(() => continueRef.current?.focus()); }
    else onClose();
  }
  function continueEditing() { setConfirming(false); queueMicrotask(() => closeRef.current?.focus()); }
  return <ModalFrame labelledBy={titleId} describedBy={description ? descriptionId : undefined} onEscape={requestClose} fullScreen><div className={styles.header}><h2 id={titleId}>{confirming ? '¿Descartar borrador?' : title}</h2><button ref={closeRef} type="button" className={styles.close} aria-label="Cerrar formulario" onClick={requestClose} disabled={busy}><X size={20} aria-hidden="true" /></button></div>{description && <p id={descriptionId} className={styles.description} hidden={confirming}>{description}</p>}<form className={styles.form} hidden={confirming} aria-busy={busy} onSubmit={(event) => { if (busy) event.preventDefault(); else onSubmit(event); }}><div className={styles.fields}>{children}</div>{error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.actions}><button type="button" className={controls.secondary} onClick={requestClose} disabled={busy}>Cancelar</button><button type="submit" className={controls.primary} disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button></div></form><section hidden={!confirming} className={styles.confirmation}><p className={styles.description}>Los cambios de este formulario todavía no se guardaron.</p><div className={styles.actions}><button ref={continueRef} type="button" className={controls.secondary} onClick={continueEditing}>Seguir editando</button><button type="button" className={controls.danger} onClick={onClose}>Descartar borrador</button></div></section></ModalFrame>;
}
