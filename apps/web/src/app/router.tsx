import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import type { SessionController } from '../features/auth/session';
import { AccessFrame } from '../features/auth/AccessFrame';
import { AccessPage } from '../features/auth/AccessPage';
import { RecoveryPage } from '../features/auth/RecoveryPage';
import { VerifyEmail } from '../features/auth/VerifyEmail';
import { LogoutButton } from '../features/auth/LogoutButton';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { LockPage } from '../features/security/LockPage';
import { FinancialRoutes } from './FinancialRoutes';
import styles from '../features/auth/Access.module.css';

export function ApplicationRoutes({ controller }: { controller: SessionController }) {
  const session = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const location = useLocation();
  if (location.pathname === '/recuperar-acceso') return <RecoveryPage auth={controller.runtime.auth} />;
  if (session.blocked) return <AccessFrame title="Pausa para cuidar tus datos" intro={session.error ?? 'No pudimos preparar esta sesión.'}><p className={styles.hint}>Si tenés otras pestañas abiertas, cerralas y recargá. Si la sesión venció, volvé a entrar con la cuenta anterior para resolver sus pendientes antes de cambiar.</p><div className={styles.form}><button className={styles.button} onClick={() => window.location.reload()}>Recargar</button><button className={styles.secondary} onClick={() => void controller.recoverAccess()}>Volver al acceso</button></div></AccessFrame>;
  if (!session.ready) return <AccessFrame title="Preparando tu espacio"><p role="status" className={styles.hint}>Comprobando acceso…</p></AccessFrame>;
  if (!session.user) return <Routes><Route path="/acceso" element={<AccessPage actions={controller} />} /><Route path="*" element={<Navigate to="/acceso" replace />} /></Routes>;
  if (!session.user.emailVerified || session.error) return <VerifyEmail controller={controller} />;
  if (session.locked) return <LockPage controller={controller} />;
  if (!session.profile) return <AccessFrame title="Preparando tu espacio"><p role="status">Cargando tu configuración…</p></AccessFrame>;
  if (!session.profile.setupComplete) return <OnboardingPage key={session.user.uid} controller={controller} />;
  const accountControls = <div className={styles.form}>{controller.hasPin ? <button className={styles.secondary} onClick={controller.lock}>Bloquear ahora</button> : <InitialDevicePin controller={controller} />}<AccountLinks controller={controller} /><LogoutButton controller={controller} /></div>;
  return <FinancialRoutes key={session.user.uid} homeTitle={session.profile.displayName ? `Hola, ${session.profile.displayName}` : 'Tu espacio está listo'} home={<><p className={styles.hint}>Base financiera en construcción. Tu acceso y configuración están preparados; las pantallas para consultar y registrar tus finanzas se incorporan en la siguiente etapa.</p>{accountControls}</>} profile={{ displayName: session.profile.displayName, email: session.user.email }} accountControls={accountControls} />;
}

function InitialDevicePin({ controller }: { controller: SessionController }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); if (data.get('pin') !== data.get('confirmation')) { setError('Los PIN no coinciden.'); return; } setBusy(true); try { await controller.setInitialPin(String(data.get('pin'))); } catch (cause) { setError(authError(cause)); } finally { setBusy(false); } }
  return <details><summary className={styles.link}>Configurar PIN en este dispositivo</summary><p className={styles.hint}>Protegé la vista con 6 dígitos. El PIN es local a este dispositivo y no cifra la base de datos.</p><form className={styles.form} onSubmit={(event) => void submit(event)}><label className={styles.field}>PIN de 6 dígitos<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="new-password" /></label><label className={styles.field}>Confirmar PIN<input name="confirmation" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="new-password" /></label>{error && <p role="alert" className={styles.error}>{error}</p>}<button className={styles.secondary} disabled={busy}>Guardar PIN</button></form></details>;
}

function AccountLinks({ controller }: { controller: SessionController }) {
  const providers = controller.getSnapshot().user?.providerData ?? [];
  const hasGoogle = providers.some((provider) => provider.providerId === 'google.com');
  const hasPassword = providers.some((provider) => provider.providerId === 'password');
  return <details><summary className={styles.link}>Métodos de acceso</summary><p className={styles.hint}>Vincular un método requiere confirmar que también te pertenece. No se fusionan cuentas automáticamente.</p>{!hasGoogle && <LinkGoogle controller={controller} />}{!hasPassword && <LinkPassword controller={controller} />}{hasGoogle && hasPassword && <p>Google y contraseña vinculados.</p>}</details>;
}

import { authError } from '../features/auth/errors';
function LinkGoogle({ controller }: { controller: SessionController }) {
  const [error, setError] = useState(''); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); void controller.linkGoogle(String(data.get('password'))).then(() => setDone(true)).catch((cause: unknown) => setError(authError(cause))).finally(() => setBusy(false)); }
  return done ? <p role="status">Google vinculado.</p> : <form className={styles.form} onSubmit={submit}><label className={styles.field}>Contraseña de tu cuenta<input name="password" type="password" required autoComplete="current-password" /></label>{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.secondary} disabled={busy}>Confirmar contraseña y vincular Google</button></form>;
}
function LinkPassword({ controller }: { controller: SessionController }) {
  const [error, setError] = useState(''); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); if (data.get('password') !== data.get('confirmation')) { setError('Las contraseñas no coinciden.'); return; } setBusy(true); void controller.linkPassword(String(data.get('password'))).then(() => setDone(true)).catch((cause: unknown) => setError(authError(cause))).finally(() => setBusy(false)); }
  return done ? <p role="status">Contraseña vinculada.</p> : <form className={styles.form} onSubmit={submit}><label className={styles.field}>Nueva contraseña<input name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" /></label><label className={styles.field}>Confirmar contraseña<input name="confirmation" type="password" minLength={8} maxLength={128} required autoComplete="new-password" /></label>{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.secondary} disabled={busy}>Confirmar con Google y vincular contraseña</button></form>;
}
