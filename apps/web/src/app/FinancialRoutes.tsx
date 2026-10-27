import { useId, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router';
import { Bell, ChartNoAxesCombined, ChevronRight, Settings, UserRound, ShieldCheck, CalendarDays, Goal, HandCoins, PiggyBank, Calculator, RefreshCw, Wallet } from 'lucide-react';
import { EmptyState } from '../ui';
import { AppShell } from './AppShell';
import { routeRegistry } from './route-registry';
import styles from '../ui/RouteLinks.module.css';

/** The access controller mounts this tree only after verification, PIN and setup guards. */
export function FinancialRoutes({ homeTitle, home, profile, accountControls }: { homeTitle: string; home: ReactNode; profile?: { displayName: string; email: string | null }; accountControls?: ReactNode }) {
  const navigate = useNavigate();
  const [registrationRequested, setRegistrationRequested] = useState(false);
  const privateRoutes = routeRegistry.filter((route) => route.access === 'private');
  return <Routes>{privateRoutes.map((route) => <Route key={route.id} path={route.path} element={
    <AppShell title={route.id === 'P05' ? homeTitle : route.id === 'P23' ? 'Ajustes' : route.title} onRegister={() => setRegistrationRequested(true)}
      headerActions={<><NavLink className={styles.utilityIcon} to="/avisos" aria-label="Avisos"><Bell size={20} aria-hidden="true" /></NavLink><NavLink className={styles.utilityIcon} to="/ajustes" aria-label="Ajustes"><Settings size={20} aria-hidden="true" /></NavLink></>}
      {...(route.path.includes('/:id') ? { onBack: () => { const index: unknown = window.history.state?.idx; if (typeof index === 'number' && index > 0) void navigate(-1); else void navigate(route.id === 'P10' ? '/cuentas' : route.path.split('/:id')[0] ?? '/inicio'); } } : {})}>
      {registrationRequested && <p role="status">El registro de movimientos todavía está en preparación. Esta versión no guarda movimientos desde este botón.</p>}
      {route.id === 'P05' ? home : route.id !== 'P23' && <EmptyState title={`${route.title}: en preparación`} description="Esta pantalla forma parte del plan y todavía no está disponible en esta versión de desarrollo." />}
      {route.id === 'P05' && <ToolLinks title="Consultar y simular" ids={['P19', 'P21']} />}
      {route.id === 'P11' && <ToolLinks title="Herramientas para planificar" ids={['P12', 'P13', 'P15', 'P16', 'P18']} />}
      {route.id === 'P23' && <div className={styles.settings}>
        <div className={styles.accountSection}>
          {profile && <section aria-label="Tu perfil" className={styles.profile}><span className={styles.profileIcon}><UserRound size={24} aria-hidden="true" /></span><div><h2>{profile.displayName || 'Tu cuenta'}</h2>{profile.email && <p>{profile.email}</p>}</div></section>}
          {accountControls && <section className={styles.security}><h2><ShieldCheck size={20} aria-hidden="true" />Acceso y seguridad</h2><div className={styles.accountControls}>{accountControls}</div></section>}
        </div>
        <section aria-label="Todas las herramientas" className={styles.toolGroups}>
          <ToolLinks title="Planificación" ids={['P12', 'P13', 'P15']} />
          <ToolLinks title="Finanzas" ids={['P16', 'P18']} />
          <ToolLinks title="Consulta" ids={['P19', 'P21']} />
          <ToolLinks title="Preferencias y estado" ids={['P22', 'P24']} />
        </section>
      </div>}
      {route.id !== 'P05' && <p><Link className={styles.utilityLink} to="/inicio">Volver a Inicio</Link></p>}
    </AppShell>
  } />)}<Route path="*" element={<Navigate to="/inicio" replace />} /></Routes>;
}

function ToolLinks({ title, ids }: { title: string; ids: readonly string[] }) {
  const titleId = useId();
  const tools = routeRegistry.filter((route) => ids.includes(route.id));
  return <section aria-labelledby={titleId} className={styles.tools}><h2 id={titleId}>{title}</h2><ul className={styles.toolList}>{tools.map((tool) => { const Icon = toolIcons[tool.id] ?? Wallet; return <li key={tool.id}><Link className={styles.toolLink} to={tool.path}><Icon size={20} aria-hidden="true" /><span>{tool.title}</span><ChevronRight className={styles.chevron} size={16} aria-hidden="true" /></Link></li>; })}</ul></section>;
}
const toolIcons: Partial<Record<(typeof routeRegistry)[number]['id'], typeof Wallet>> = { P12: PiggyBank, P13: Goal, P15: CalendarDays, P16: HandCoins, P18: ChartNoAxesCombined, P19: ChartNoAxesCombined, P21: Calculator, P22: Bell, P24: RefreshCw };
