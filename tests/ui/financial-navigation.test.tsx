import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { FinancialRoutes } from '../../apps/web/src/app/FinancialRoutes';

function renderRoutes() {
  return render(<MemoryRouter initialEntries={['/inicio']}><FinancialRoutes homeTitle="Hola, Ana" home={<p>Inicio en construcción</p>} profile={{ displayName: 'Ana', email: 'ana@example.test' }} accountControls={<p>Acceso personal preparado</p>} /></MemoryRouter>);
}

it('makes notices and settings discoverable from the header and preserves the private settings content', async () => {
  renderRoutes(); const user = userEvent.setup();
  await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Avisos' }));
  expect(screen.getByRole('heading', { name: 'Avisos: en preparación' })).toBeVisible();
  await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Ajustes' }));
  expect(screen.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible();
  expect(screen.getByText('Acceso personal preparado')).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Principal' }).querySelectorAll('a')).toHaveLength(5);
});

it('shows the actual profile as read-only information and groups tools by purpose', async () => {
  renderRoutes();
  await userEvent.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Ajustes' }));
  expect(screen.getByRole('region', { name: 'Tu perfil' })).toHaveTextContent('Ana');
  expect(screen.getByText('ana@example.test')).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Acceso y seguridad' })).toBeVisible();
  for (const name of ['Planificación', 'Finanzas', 'Consulta', 'Preferencias y estado']) expect(screen.getByRole('heading', { name })).toBeVisible();
  expect(screen.queryByText('Inicio en construcción')).not.toBeInTheDocument();
});

it('opens reports and simulator from home without claiming their financial data is loaded', async () => {
  renderRoutes(); const user = userEvent.setup();
  await user.click(screen.getByRole('link', { name: 'Reportes' }));
  expect(screen.getByRole('heading', { name: 'Reportes: en preparación' })).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Volver a Inicio' }));
  expect(screen.getByRole('heading', { name: 'Hola, Ana' })).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Simulador de compra' }));
  expect(screen.getByRole('heading', { name: 'Simulador de compra: en preparación' })).toBeVisible();
});

it('lets a person discover and open each planning tool from Planificar', async () => {
  renderRoutes(); const user = userEvent.setup();
  for (const name of ['Presupuestos', 'Metas', 'Agenda', 'Préstamos', 'Inversiones']) {
    await user.click(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Planificar' }));
    await user.click(within(screen.getByRole('main')).getByRole('link', { name }));
    expect(screen.getByRole('heading', { name: `${name}: en preparación` })).toBeVisible();
  }
});

it('provides all secondary tools from settings through working links without inventing detail records', async () => {
  renderRoutes(); const user = userEvent.setup();
  for (const name of ['Presupuestos', 'Metas', 'Agenda', 'Préstamos', 'Inversiones', 'Reportes', 'Simulador de compra', 'Avisos', 'Sincronización']) {
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Ajustes' }));
    const catalog = screen.getByRole('region', { name: 'Todas las herramientas' });
    await user.click(within(catalog).getByRole('link', { name }));
    expect(screen.getByRole('heading', { name: `${name}: en preparación` })).toBeVisible();
  }
});
