import { useState } from 'react';
import { AccessFrame } from './AccessFrame';
import type { SessionController } from './session';
import { authError } from './errors';
import styles from './Access.module.css';
export function VerifyEmail({ controller }: { controller: SessionController }) {
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>, success = '') { setBusy(true); setError(''); setMessage(''); try { await action(); setMessage(success); } catch (cause) { setError(authError(cause)); } finally { setBusy(false); } }
  return <AccessFrame title="Revisá tu correo" intro={`Enviamos un enlace a ${controller.getSnapshot().user?.email ?? 'tu correo'}. Verificalo para preparar tu espacio.`}><div className={styles.form}>
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.notice}>{message}</p>}
    <button className={styles.button} disabled={busy} onClick={() => void run(controller.refreshVerification)}>Ya verifiqué mi correo</button>
    <button className={styles.secondary} disabled={busy} onClick={() => void run(controller.resendVerification, 'Enlace enviado. Revisá también la carpeta de correo no deseado.')}>Reenviar enlace</button>
    <button className={styles.secondary} disabled={busy} onClick={() => void run(() => controller.logout())}>Cerrar sesión</button>
  </div></AccessFrame>;
}
