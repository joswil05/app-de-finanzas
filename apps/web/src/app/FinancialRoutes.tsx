import { useId, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router';
import { Bell, ChevronRight, Settings } from 'lucide-react';
import { EmptyState } from '../ui';
import { AppShell } from './AppShell';
import { routeRegistry } from './route-registry';
import styles from '../ui/RouteLinks.module.css';

/** The access controller mounts this tree only after verification, PIN and setup guards. */
export function FinancialRoutes({ homeTitle, home }: { homeTitle: string; home: ReactNode }) {
  const navigate = useNavigate();
  const [registrationRequested, setRegistrationRequested] = useState(false);
  const privateRoutes = routeRegistry.filter((route) => route.access === 'private');
  return <Routes>{privateRoutes.map((route) => <Route key={route.id} path={route.path} element={
    <AppShell title={route.id === 'P05' ? homeTitle : route.title} onRegister={() => setRegistrationRequested(true)}
      headerActions={<><Link className={styles.utilityLink} to="/avisos"><Bell size={20} aria-hidden="true" />Avisos</Link><Link className={styles.utilityLink} to="/ajustes"><Settings size={20} aria-hidden="true" />Ajustes</Link></>}
      {...(route.path.includes('/:id') ? { onBack: () => { const index: unknown = window.history.state?.idx; if (typeof index === 'number' && index > 0) void navigate(-1); else void navigate(route.id === 'P10' ? '/cuentas' : route.path.split('/:id')[0] ?? '/inicio'); } } : {})}>
      {registrationRequested && <p role="status">El registro de movimientos todavía está en preparación. Esta versión no guarda movimientos desde este botón.</p>}
      {route.id === 'P05' || route.id === 'P23' ? home : <EmptyState title={`${route.title}: en preparación`} description="Esta pantalla forma parte del plan y todavía no está disponible en esta versión de desarrollo." />}
      {route.id === 'P05' && <ToolLinks title="Consultar y simular" ids={['P19', 'P21']} />}
      {route.id === 'P11' && <ToolLinks title="Herramientas para planificar" ids={['P12', 'P13', 'P15', 'P16', 'P18']} />}
      {route.id === 'P23' && <ToolLinks title="Todas las herramientas" ids={['P12', 'P13', 'P15', 'P16', 'P18', 'P19', 'P21', 'P22', 'P24']} />}
      {route.id !== 'P05' && <p><Link className={styles.utilityLink} to="/inicio">Volver a Inicio</Link></p>}
    </AppShell>
  } />)}<Route path="*" element={<Navigate to="/inicio" replace />} /></Routes>;
}

function ToolLinks({ title, ids }: { title: string; ids: readonly string[] }) {
  const titleId = useId();
  const tools = routeRegistry.filter((route) => ids.includes(route.id));
  return <section aria-labelledby={titleId} className={styles.tools}><h2 id={titleId}>{title}</h2><ul className={styles.toolList}>{tools.map((tool) => <li key={tool.id}><Link className={styles.toolLink} to={tool.path}><span>{tool.title}</span><ChevronRight size={20} aria-hidden="true" /></Link></li>)}</ul></section>;
}
