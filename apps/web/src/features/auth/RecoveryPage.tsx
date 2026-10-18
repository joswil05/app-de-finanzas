import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { applyActionCode, confirmPasswordReset, sendPasswordResetEmail, verifyPasswordResetCode, type Auth } from 'firebase/auth';
import { AccessFrame } from './AccessFrame';
import { authError } from './errors';
import styles from './Access.module.css';
export function RecoveryPage({ auth }: { auth: Auth }) {
  const [params] = useSearchParams(); const code = params.get('oobCode'); const mode = params.get('mode');
  const [valid, setValid] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const emailAction = useRef<{ code: string; request: Promise<void> } | null>(null);
  useEffect(() => {
    let active = true; if (!code) return;
    if (mode === 'verifyEmail' && emailAction.current?.code !== code) emailAction.current = { code, request: applyActionCode(auth, code) };
    const request = mode === 'verifyEmail' ? emailAction.current!.request.then(() => { if (active) setMessage('Correo verificado. Volvé al acceso y actualizá tu sesión.'); }) : verifyPasswordResetCode(auth, code).then(() => { if (active) setValid(true); });
    void request.catch((cause: unknown) => { if (active) setError(authError(cause)); }); return () => { active = false; };
  }, [auth, code, mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setError(''); setMessage('');
    if (!navigator.onLine) { setError('Necesitás conexión para recuperar tu cuenta.'); return; }
    if (valid && data.get('password') !== data.get('confirmation')) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true); try { if (valid && code) { await confirmPasswordReset(auth, code, String(data.get('password'))); setValid(false); setMessage('Contraseña actualizada. Ya podés entrar.'); } else { await sendPasswordResetEmail(auth, String(data.get('email')).trim()); setMessage('Si hay una cuenta con este correo, recibirás un enlace para recuperar el acceso.'); } } catch (cause) { const reason = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : ''; if (reason === 'auth/user-not-found') setMessage('Si hay una cuenta con este correo, recibirás un enlace para recuperar el acceso.'); else setError(authError(cause)); } finally { setBusy(false); }
  }
  return <AccessFrame title={valid ? 'Elegí otra contraseña' : 'Recuperá tu acceso'} intro="La contraseña te permite entrar a tu cuenta. El PIN protege la vista en este dispositivo.">
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.notice}>{message}</p>}
    <form className={styles.form} onSubmit={(event) => void submit(event)}>{valid ? <><label className={styles.field}>Nueva contraseña<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label><label className={styles.field}>Confirmar contraseña<input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label></> : <label className={styles.field}>Correo<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
    <button className={styles.button} disabled={busy}>{busy ? 'Un momento…' : valid ? 'Guardar contraseña' : 'Enviar enlace'}</button></form><Link className={styles.link} to="/acceso">Volver al acceso</Link>
  </AccessFrame>;
}
