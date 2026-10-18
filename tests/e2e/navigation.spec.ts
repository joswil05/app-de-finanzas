import { test, expect, seedScenario } from '../fixtures';

test('la navegación privada conserva cinco destinos y la ruta activa', async ({ page }) => {
  await seedScenario(page, 'empty');
  await page.goto('/inicio');
  const navigation = page.getByRole('navigation', { name: 'Principal' });
  for (const name of ['Inicio', 'Movimientos', 'Cuentas', 'Planificar', 'Asistente']) {
    await expect(navigation.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await navigation.getByRole('link', { name: 'Movimientos', exact: true }).click();
  await expect(page).toHaveURL(/\/movimientos$/u);
  await expect(navigation.getByRole('link', { name: 'Movimientos', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page).toHaveURL(/\/movimientos$/u);
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
});

test('una ruta financiera requiere acceso antes de mostrar navegación privada', async ({ page }) => {
  await page.goto('/cuentas');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
});
