import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AccessFrame } from './AccessFrame';
import { authError } from './errors';
import styles from './Access.module.css';
export type AccessActions = { login(email: string, password: string): Promise<void>; register(email: string, password: string): Promise<void>; google(): Promise<void> };
export function AccessPage({ actions }: { actions: AccessActions }) {
  const [register, setRegister] = useState(false); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function run(work: () => Promise<void>) { setBusy(true); setError(''); try { if (!navigator.onLine) throw new Error('Necesitás conexión para entrar o crear tu cuenta.'); await work(); } catch (cause) { setError(authError(cause)); } finally { setBusy(false); } }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const email = String(data.get('email')).trim(); const password = String(data.get('password')); if (register && password !== data.get('confirmation')) { setError('Las contraseñas no coinciden.'); return; } void run(() => register ? actions.register(email, password) : actions.login(email, password)); }
  return <AccessFrame title={register ? 'Creá tu espacio' : 'Tu dinero, con claridad'} intro={register ? 'Cada persona tiene sus propias cuentas y registros.' : 'Entrá para llevar tus finanzas en córdobas y dólares.'}>
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>Correo<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label>
      <div className={styles.field}><label htmlFor="access-password">Contraseña</label><div className={styles.password}><input id="access-password" name="password" type={show ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} maxLength={128} required disabled={busy} /><button className={styles.smallButton} type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)}>{show ? 'Ocultar' : 'Ver'}</button></div></div>
      {register && <label className={styles.field}>Confirmar contraseña<input name="confirmation" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} /></label>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.button} disabled={busy}>{busy ? 'Un momento…' : register ? 'Crear cuenta' : 'Entrar'}</button>
    </form>
    <div className={styles.divider}>o</div><button className={styles.secondary} disabled={busy} onClick={() => void run(actions.google)}>Continuar con Google</button>
    <div className={styles.links}><button type="button" className={`${styles.link} ${styles.plain}`} disabled={busy} onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Ya tengo cuenta' : 'Crear cuenta'}</button><Link className={styles.link} to="/recuperar-acceso">Olvidé mi contraseña</Link></div>
  </AccessFrame>;
}
