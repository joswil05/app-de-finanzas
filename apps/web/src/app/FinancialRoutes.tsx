import { useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router';
import { EmptyState } from '../ui';
import { AppShell } from './AppShell';
import { routeRegistry } from './route-registry';

/** The access controller mounts this tree only after verification, PIN and setup guards. */
export function FinancialRoutes({ homeTitle, home }: { homeTitle: string; home: ReactNode }) {
  const navigate = useNavigate();
  const [registrationRequested, setRegistrationRequested] = useState(false);
  const privateRoutes = routeRegistry.filter((route) => route.access === 'private');
  return <Routes>{privateRoutes.map((route) => <Route key={route.id} path={route.path} element={
    <AppShell title={route.id === 'P05' ? homeTitle : route.title} onRegister={() => setRegistrationRequested(true)}
      {...(route.path.includes('/:id') ? { onBack: () => { const index: unknown = window.history.state?.idx; if (typeof index === 'number' && index > 0) void navigate(-1); else void navigate(route.id === 'P10' ? '/cuentas' : route.path.split('/:id')[0] ?? '/inicio'); } } : {})}>
      {registrationRequested && <p role="status">El registro de movimientos todavía está en preparación. Esta versión no guarda movimientos desde este botón.</p>}
      {route.id === 'P05' || route.id === 'P23' ? home : <EmptyState title={`${route.title}: en preparación`} description="Esta pantalla forma parte del plan y todavía no está disponible en esta versión de desarrollo." />}
      {route.id !== 'P05' && <p><Link to="/inicio">Volver a Inicio</Link></p>}
    </AppShell>
  } />)}<Route path="*" element={<Navigate to="/inicio" replace />} /></Routes>;
}
