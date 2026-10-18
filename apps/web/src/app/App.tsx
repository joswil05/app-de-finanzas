import { BrowserRouter, Link, useLocation } from 'react-router';
import type { SessionController } from '../features/auth/session';
import { AccessFrame } from '../features/auth/AccessFrame';
import { ApplicationRoutes } from './router';
import styles from '../features/auth/Access.module.css';
export function App({ controller, configurationError }: { controller?: SessionController; configurationError?: string }) {
  return <BrowserRouter>{controller ? <ApplicationRoutes controller={controller} /> : <ConfigurationPage reason={configurationError} />}</BrowserRouter>;
}
function ConfigurationPage({ reason }: { reason: string | undefined }) {
  const location = useLocation();
  return <AccessFrame title="Estamos preparando el acceso" intro={reason ?? 'Firebase todavía no está configurado.'}><p className={styles.hint}>El proyecto real aún no está creado. Podés probar el acceso con servicios locales y cuentas ficticias.</p><Link className={styles.link} to="/ayuda/emuladores">Abrir guía de emuladores locales</Link>{location.pathname === '/ayuda/emuladores' && <section id="emuladores"><h2>Prueba local</h2><ol className={styles.hint}><li>Desde la carpeta del proyecto, ejecutá <code>npm run emulators</code>.</li><li>Copiá <code>.env.example</code> a <code>.env.local</code> en la raíz del proyecto. Conservá <code>demo-finanzas-tests</code> y los emuladores habilitados.</li><li>Ejecutá <code>npm run dev</code> y abrí la dirección local indicada.</li></ol><p className={styles.hint}>Auth usa el puerto 9109 y Firestore el 8180. El emulador muestra enlaces de verificación en su terminal. Estas cuentas no son de producción.</p></section>}</AccessFrame>;
}
