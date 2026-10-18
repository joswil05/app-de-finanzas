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

test('las herramientas secundarias se descubren desde Inicio, Planificar y Ajustes', async ({ page }) => {
  await seedScenario(page, 'empty');
  const main = page.getByRole('main'); const header = page.getByRole('banner');
  for (const title of ['Reportes', 'Simulador de compra']) {
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio', exact: true }).click();
    await main.getByRole('link', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: `${title}: en preparación`, exact: true })).toBeVisible();
    const back = main.getByRole('link', { name: 'Volver a Inicio', exact: true });
    const bounds = await back.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44); expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }
  for (const title of ['Presupuestos', 'Metas', 'Agenda', 'Préstamos', 'Inversiones']) {
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Planificar', exact: true }).click();
    await main.getByRole('link', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: `${title}: en preparación`, exact: true })).toBeVisible();
  }
  await header.getByRole('link', { name: 'Avisos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Avisos: en preparación', exact: true })).toBeVisible();
  for (const title of ['Presupuestos', 'Metas', 'Agenda', 'Préstamos', 'Inversiones', 'Reportes', 'Simulador de compra', 'Avisos', 'Sincronización']) {
    await header.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('region', { name: 'Todas las herramientas', exact: true }).getByRole('link', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: `${title}: en preparación`, exact: true })).toBeVisible();
  }
});

test('los campos de acceso se distinguen en reposo por un borde con contraste suficiente', async ({ page }) => {
  await page.goto('/acceso');
  for (const label of ['Correo', 'Contraseña']) {
    const field = page.getByLabel(label, { exact: true });
    await expect(field).toBeVisible();
    const contrast = await field.evaluate((element) => {
      const style = getComputedStyle(element);
      const luminance = (color: string) => {
        const channels = (color.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number).map((channel) => {
          const value = channel / 255;
          return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        });
        return .2126 * (channels[0] ?? 0) + .7152 * (channels[1] ?? 0) + .0722 * (channels[2] ?? 0);
      };
      const border = luminance(style.borderTopColor); const background = luminance(style.backgroundColor);
      return (Math.max(border, background) + .05) / (Math.min(border, background) + .05);
    });
    expect(contrast).toBeGreaterThanOrEqual(3);
  }
});
