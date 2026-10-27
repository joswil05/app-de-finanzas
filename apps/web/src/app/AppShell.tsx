import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { NavLink } from 'react-router';
import { Home, ArrowLeftRight, Wallet, CalendarDays, MessageCircle, Plus, ArrowLeft } from 'lucide-react';
import type { SyncStatus } from '@fin/contracts';
import { StatusBadge } from '../ui/StatusBadge';
import { primaryNavigation } from '../ui/navigation';
import '../ui/tokens.css';
import controls from '../ui/Controls.module.css';
import styles from '../ui/AppShell.module.css';

const icons = [Home, ArrowLeftRight, Wallet, CalendarDays, MessageCircle] as const;
export interface AppShellProps {
  title: string; children: ReactNode; onRegister: () => void;
  onBack?: () => void; headerActions?: ReactNode; syncStatus?: SyncStatus;
}
/** Mount only after authentication/setup guards, inside the application's existing router. */
export function AppShell({ title, children, onRegister, onBack, headerActions, syncStatus }: AppShellProps) {
  const mainId = useId();
  const shellRef = useRef<HTMLDivElement>(null); const navigationRef = useRef<HTMLElement>(null); const registerRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const measure = () => {
      shellRef.current?.style.setProperty('--mobile-nav-height', `${navigationRef.current?.getBoundingClientRect().height ?? 76}px`);
      shellRef.current?.style.setProperty('--mobile-register-height', `${registerRef.current?.getBoundingClientRect().height ?? 48}px`);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    if (navigationRef.current) observer.observe(navigationRef.current);
    if (registerRef.current) observer.observe(registerRef.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={shellRef} className={styles.shell}><a className={styles.skip} href={`#${mainId}`}>Saltar al contenido</a><aside className={styles.sidebar}><span className={styles.brand}>Finanzas personales</span><nav ref={navigationRef} aria-label="Principal" className={styles.navigation}>{primaryNavigation.map(([to, label], index) => { const Icon = icons[index] ?? Home; return <NavLink key={to} to={to} className={({ isActive }) => `${styles.destination} ${isActive ? styles.current : ''}`}><Icon aria-hidden="true" size={22} /><span>{label}</span></NavLink>; })}</nav></aside><div className={styles.workspace}><header className={styles.header}><div className={styles.heading}>{onBack && <button type="button" className={styles.back} onClick={onBack} aria-label="Volver"><ArrowLeft size={22} aria-hidden="true" /></button>}<h1>{title}</h1></div><div className={styles.headerActions}>{headerActions}<button ref={registerRef} type="button" className={`${controls.primary} ${styles.register}`} onClick={onRegister}><Plus size={20} aria-hidden="true" />Registrar</button></div>{syncStatus && <div className={styles.sync}><StatusBadge status={syncStatus} /></div>}</header><main id={mainId} tabIndex={-1} className={styles.main}>{children}</main></div></div>;
}
