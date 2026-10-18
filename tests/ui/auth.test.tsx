import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { applyActionCode, type Auth } from 'firebase/auth';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AccessPage } from '../../apps/web/src/features/auth/AccessPage';
import { App } from '../../apps/web/src/app/App';
import { ApplicationRoutes } from '../../apps/web/src/app/router';
import type { SessionController, SessionView } from '../../apps/web/src/features/auth/session';
import { RecoveryPage } from '../../apps/web/src/features/auth/RecoveryPage';
vi.mock('firebase/auth', async (original) => ({ ...await original<typeof import('firebase/auth')>(), applyActionCode: vi.fn(async () => {}) }));
const actions = () => ({ login: vi.fn(async () => {}), register: vi.fn(async () => {}), google: vi.fn(async () => {}) });
it('offers both real auth methods without exposing financial data', () => {
  render(<MemoryRouter><AccessPage actions={actions()} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  expect(screen.getByLabelText('Correo')).toBeVisible();
  expect(screen.queryByText('Disponible estimado', { exact: true })).not.toBeInTheDocument();
});
it('submits credentials only after confirmation matches during registration', async () => {
  const auth = actions(); const user = userEvent.setup();
  render(<MemoryRouter><AccessPage actions={auth} /></MemoryRouter>);
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  await user.type(screen.getByLabelText('Correo'), 'ana@example.test');
  await user.type(screen.getByLabelText('Contraseña', { exact: true }), 'password123');
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'different123');
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(screen.getByRole('alert')).toHaveTextContent('no coinciden'); expect(auth.register).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Confirmar contraseña')); await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(auth.register).toHaveBeenCalledWith('ana@example.test', 'password123');
});
it('explains a cancelled Google sign-in and keeps access available', async () => {
  const auth = actions(); auth.google.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
  render(<MemoryRouter><AccessPage actions={auth} /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Cancelaste');
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
});
it('opens the local emulator guide from the honest missing-configuration state', async () => {
  window.history.replaceState(null, '', '/acceso');
  render(<App configurationError="Firebase no está configurado." />);
  await userEvent.click(screen.getByRole('link', { name: 'Abrir guía de emuladores locales' }));
  expect(screen.getByRole('heading', { name: 'Prueba local' })).toBeVisible();
  expect(screen.getByText('.env.local', { exact: true })).toBeVisible();
  expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument();
});
it('removes the private view from the DOM while locked', () => {
  const view = { ready: true, user: { uid: 'alice', emailVerified: true, email: 'a@example.test', providerData: [] }, profile: { uid: 'alice', displayName: 'Alice private', setupComplete: true }, locked: true, blocked: false, error: null } as unknown as SessionView;
  const controller = { getSnapshot: () => view, subscribe: () => () => {}, getPinWait: () => 0 } as unknown as SessionController;
  render(<MemoryRouter initialEntries={['/inicio']}><ApplicationRoutes controller={controller} /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Tu espacio está bloqueado' })).toBeVisible();
  expect(screen.queryByText('Hola, Alice private')).not.toBeInTheDocument();
});
it('consumes an email action link once when Strict Mode repeats effects', async () => {
  vi.mocked(applyActionCode).mockClear();
  render(<StrictMode><MemoryRouter initialEntries={['/recuperar-acceso?mode=verifyEmail&oobCode=verify-once']}><RecoveryPage auth={{} as Auth} /></MemoryRouter></StrictMode>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Correo verificado'));
  expect(applyActionCode).toHaveBeenCalledTimes(1);
});
it('returns an expired session to access even if a stale profile exists', async () => {
  const view = { ready: true, user: null, profile: { uid: 'alice', displayName: 'Alice private', setupComplete: true }, locked: false, blocked: false, error: null, persistence: 'persistent' } as SessionView;
  const controller = { ...actions(), getSnapshot: () => view, subscribe: () => () => {} } as unknown as SessionController;
  render(<MemoryRouter initialEntries={['/inicio']}><ApplicationRoutes controller={controller} /></MemoryRouter>);
  expect(await screen.findByRole('button', { name: 'Entrar' })).toBeVisible();
  expect(screen.queryByText('Hola, Alice private')).not.toBeInTheDocument();
});
