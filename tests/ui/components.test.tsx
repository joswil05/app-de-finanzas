import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import type { SyncStatus } from '@fin/contracts';
import { MoneyText, StatusBadge, TransactionRow, FormShell, EmptyState, ConfirmDialog, ProgressValue, ResultCard } from '../../apps/web/src/ui';
import { AppShell } from '../../apps/web/src/app/AppShell';

const status: SyncStatus = { mode: 'synced', pending: 0, rejected: 0, hydrated: true, durable: true, lastSyncedAt: '2026-10-18T12:00:00Z' };

describe('financial presentation', () => {
  it('keeps currency, cents and negative sign explicit without combining currencies', () => {
    render(<><MoneyText value={{ currency: 'NIO', minor: -123456 }} /><MoneyText value={{ currency: 'USD', minor: 1 }} /></>);
    expect(screen.getByText('-C$ 1,234.56')).toBeVisible();
    expect(screen.getByText('US$ 0.01')).toBeVisible();
  });
  it('shows zero and the maximum supported amount without truncating digits', () => {
    render(<><MoneyText value={{ currency: 'NIO', minor: 0 }} /><MoneyText value={{ currency: 'USD', minor: 9000000000000 }} /></>);
    expect(screen.getByText('C$ 0.00')).toBeVisible();
    expect(screen.getByText('US$ 90,000,000,000.00')).toBeVisible();
  });
  it('shows transfer currencies separately and identifies movement type in text', () => {
    render(<TransactionRow description="Cambio para viaje" kind="transfer" value={{ currency: 'NIO', minor: 365000 }} receivedValue={{ currency: 'USD', minor: 10000 }} date="2026-10-18" accountLabel="Efectivo → Dólares" />);
    expect(screen.getByText('Transferencia')).toBeVisible();
    expect(screen.getByText('C$ 3,650.00')).toBeVisible();
    expect(screen.getByText('US$ 100.00')).toBeVisible();
    expect(screen.getByText('18/10/2026')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('opens a movement with the keyboard when a real action is supplied', async () => {
    function Example() { const [opened, setOpened] = useState(false); return opened ? <p>Detalle del café</p> : <TransactionRow description="Café" kind="expense" value={{ currency: 'NIO', minor: 6000 }} date="2026-10-18" accountLabel="Efectivo" onOpen={() => setOpened(true)} />; }
    render(<Example />);
    screen.getByRole('button', { name: /Café/u }).focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Detalle del café')).toBeVisible();
  });
});

describe('honest persistence status', () => {
  it.each([
    [{ ...status, hydrated: false }, 'Preparando datos…'],
    [{ ...status, hydrated: false, durable: false, mode: 'error' }, 'No se pudieron preparar los datos · intentá de nuevo'],
    [{ ...status, hydrated: false, rejected: 1 }, '1 cambio requiere revisión'],
    [{ ...status, durable: false }, 'Guardado local no disponible'],
    [{ ...status, mode: 'offline', pending: 2 }, 'Guardado en este dispositivo · 2 pendientes'],
    [{ ...status, mode: 'offline' }, 'Sin conexión'],
    [{ ...status, mode: 'syncing', pending: 1 }, 'Enviando… · 1 pendiente'],
    [{ ...status, mode: 'error', rejected: 1 }, '1 cambio requiere revisión'],
    [{ ...status, pending: 1 }, 'Guardado en este dispositivo · 1 pendiente'],
    [status, 'Sincronizado'],
    [{ mode: 'synced', hydrated: true, durable: true, pending: 0, rejected: 0 }, 'Sin confirmación remota'],
  ] as const)('presents the real state: %s', (value, label) => {
    render(<StatusBadge status={value} />);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });
});

describe('protected forms', () => {
  function FormExample({ dirty = true, busy = false }: { dirty?: boolean; busy?: boolean }) {
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(false);
    return <><button onClick={() => setOpen(true)}>Abrir registro</button><FormShell open={open} title="Registrar gasto" dirty={dirty} busy={busy} onClose={() => setOpen(false)} onSubmit={(event) => { event.preventDefault(); setSaved(true); }} submitLabel="Guardar gasto"><label>Descripción<input name="description" defaultValue="Café" /></label>{saved && <p>Registro recibido</p>}</FormShell></>;
  }
  it('requires confirmation before discarding, preserves fields on cancel, and restores focus on close', async () => {
    const user = userEvent.setup(); render(<FormExample />);
    await user.click(screen.getByRole('button', { name: 'Abrir registro' }));
    await user.type(screen.getByLabelText('Descripción'), ' de hoy');
    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: '¿Descartar borrador?' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByLabelText('Descripción')).toHaveValue('Café de hoy');
    await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));
    await user.click(screen.getByRole('button', { name: 'Descartar borrador' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir registro' })).toHaveFocus();
  });
  it('closes an untouched form directly with Escape', async () => {
    render(<FormExample dirty={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir registro' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('traps keyboard focus and submits the real form', async () => {
    render(<FormExample />); const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Abrir registro' }));
    screen.getByRole('button', { name: 'Guardar gasto' }).focus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Cerrar formulario' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Guardar gasto' }));
    expect(screen.getByText('Registro recibido')).toBeVisible();
  });
  it('prevents closing or submitting while a save is in progress', async () => {
    render(<FormExample busy />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir registro' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cerrar formulario' })).toBeDisabled();
  });
  it('starts destructive confirmation on its safe action and cancels with Escape', async () => {
    function Example() { const [open, setOpen] = useState(true); return <ConfirmDialog open={open} title="¿Anular gasto?" description="El historial conservará la anulación." confirmLabel="Anular gasto" onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />; }
    render(<Example />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('shared surfaces', () => {
  it('offers an actionable empty state without inventing account values', async () => {
    function Example() { const [create, setCreate] = useState(false); return create ? <p>Nueva cuenta</p> : <EmptyState title="Todavía no tenés cuentas" description="Creá la cuenta donde anotás tu dinero." action={{ label: 'Crear cuenta', onClick: () => setCreate(true) }} />; }
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Nueva cuenta')).toBeVisible();
  });
  it('retains overspending in readable text while bounding the progress meter', () => {
    render(<ProgressValue current={120} target={100} label="Alimentación" />);
    expect(screen.getByRole('progressbar', { name: 'Alimentación' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('120 de 100')).toBeVisible();
    expect(screen.getByText('Superaste el objetivo por 20')).toBeVisible();
  });
  it('does not turn missing or invalid progress into zero', () => {
    render(<ProgressValue current={0} target={0} label="Meta" />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Sin objetivo definido')).toBeVisible();
  });
  it('labels financial assistant results with period, source and actual sync state', () => {
    render(<ResultCard title="Gastos del período" period="Octubre 2026" values={[{ label: 'Córdobas', value: { currency: 'NIO', minor: 15000 } }, { label: 'Dólares', value: { currency: 'USD', minor: 500 } }]} source="Movimientos registrados" status={{ ...status, mode: 'offline', pending: 1 }} />);
    expect(screen.getByRole('heading', { name: 'Gastos del período' })).toBeVisible();
    expect(screen.getByText('Octubre 2026')).toBeVisible();
    expect(screen.getByText('Fuente: Movimientos registrados')).toBeVisible();
    expect(screen.getByText('C$ 150.00')).toBeVisible();
    expect(screen.getByText('US$ 5.00')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('1 pendiente');
  });
});

it('keeps five visible destinations, updates current page, and opens registration from the shell', async () => {
  function Example() { const location = useLocation(); const [register, setRegister] = useState(false); return <AppShell title="Tu espacio" onRegister={() => setRegister(true)}><p>{location.pathname}</p>{register && <p>Formulario de registro</p>}</AppShell>; }
  render(<MemoryRouter initialEntries={['/inicio']}><Example /></MemoryRouter>);
  const nav = screen.getByRole('navigation', { name: 'Principal' });
  expect(within(nav).getAllByRole('link')).toHaveLength(5);
  for (const name of ['Inicio', 'Movimientos', 'Cuentas', 'Planificar', 'Asistente']) expect(within(nav).getByRole('link', { name })).toBeVisible();
  expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
  await userEvent.click(within(nav).getByRole('link', { name: 'Cuentas' }));
  expect(within(nav).getByRole('link', { name: 'Cuentas' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByText('/cuentas')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
  expect(screen.getByText('Formulario de registro')).toBeVisible();
});
