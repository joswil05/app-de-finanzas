import { useEffect, useState, type FormEvent } from 'react';
import { AccessFrame } from '../auth/AccessFrame';
import type { SessionController } from '../auth/session';
import { authError } from '../auth/errors';
import { LogoutButton } from '../auth/LogoutButton';
import styles from '../auth/Access.module.css';
export function LockPage({ controller }: { controller: SessionController }) {
  const [recover, setRecover] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [wait, setWait] = useState(() => controller.getPinWait());
  const passwordProvider = controller.getSnapshot().user?.providerData.some((provider) => provider.providerId === 'password');
  useEffect(() => { const timer = setInterval(() => setWait(controller.getPinWait()), 500); return () => clearInterval(timer); }, [controller]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const form = event.currentTarget; setError(''); if (recover && data.get('pin') !== data.get('confirmPin')) { setError('Los PIN no coinciden.'); return; } setBusy(true); try { if (recover) await controller.resetPin(String(data.get('pin')), passwordProvider ? String(data.get('password')) : undefined); else await controller.unlock(String(data.get('pin'))); } catch (cause) { setError(authError(cause)); form.reset(); } finally { setWait(controller.getPinWait()); setBusy(false); } }
  return <AccessFrame title={recover ? 'Recuperá tu PIN' : 'Tu espacio está bloqueado'} intro={recover ? 'Confirmá tu identidad para crear otro PIN. Conservamos tus registros y cambios pendientes.' : 'Ingresá tu PIN para volver a tus finanzas.'}>
    <form className={styles.form} onSubmit={(event) => void submit(event)}>
    {recover && passwordProvider && <label className={styles.field}>Contraseña de tu cuenta<input name="password" type="password" autoComplete="current-password" required /></label>}
    <label className={styles.field}>{recover ? 'Nuevo PIN de 6 dígitos' : 'PIN de 6 dígitos'}<input name="pin" type="password" inputMode="numeric" autoComplete={recover ? 'new-password' : 'off'} pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={busy || (!recover && wait > 0)} /></label>
    {recover && <label className={styles.field}>Confirmar PIN<input name="confirmPin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label>}
    {!recover && wait > 0 && <p role="status" className={styles.hint}>Esperá {Math.ceil(wait / 1000)} segundos antes de intentar otra vez.</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
    <button className={styles.button} disabled={busy || (!recover && wait > 0)}>{busy ? 'Un momento…' : recover ? passwordProvider ? 'Confirmar identidad y guardar PIN' : 'Confirmar con Google y guardar PIN' : 'Desbloquear'}</button>
    <button type="button" className={`${styles.link} ${styles.plain}`} disabled={busy} onClick={() => { setRecover(!recover); setError(''); }}>{recover ? 'Volver al PIN' : 'Olvidé mi PIN'}</button>
    </form><p className={styles.hint}>El PIN oculta la vista en este dispositivo; no cifra la base de datos.</p><LogoutButton controller={controller} allowExport={false} />
  </AccessFrame>;
}
