import { test, expect, createTestOwner, loginOwner, seedOwner, seedScenario } from '../fixtures';

test('acceso ofrece ambos métodos sin mostrar datos financieros', async ({ page }, testInfo) => {
  await page.goto('/acceso');
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await expect(page.getByLabel('Correo', { exact: true })).toBeVisible();
  await expect(page.getByText('Disponible estimado', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('access.png'), fullPage: true });
});
test('correo sin verificar queda fuera del espacio financiero', async ({ page }) => {
  const owner = await createTestOwner('unverified', false);
  await loginOwner(page, owner);
  await expect(page.getByRole('heading', { name: 'Revisá tu correo' })).toBeVisible();
  await page.goto('/inicio');
  await expect(page.getByRole('heading', { name: 'Revisá tu correo' })).toBeVisible();
  await expect(page.getByText('Base financiera en construcción')).toHaveCount(0);
});
test('dos usuarios válidos mantienen perfiles independientes en sesiones simultáneas', async ({ page, browser, owners }) => {
  const contextB = await browser.newContext(); const pageB = await contextB.newPage();
  await loginOwner(page, owners.a); await loginOwner(pageB, owners.b);
  await expect(page.getByRole('heading', { name: 'Hola, Ana ficticia' })).toBeVisible();
  await expect(pageB.getByRole('heading', { name: 'Hola, Bruno ficticio' })).toBeVisible();
  await expect(page.getByText('Hola, Bruno ficticio')).toHaveCount(0);
  await expect(pageB.getByText('Hola, Ana ficticia')).toHaveCount(0);
  await contextB.close();
});
test('cerrar y cambiar de cuenta desmonta el perfil anterior incluso al volver atrás', async ({ page, owners }) => {
  await loginOwner(page, owners.a); await expect(page.getByRole('heading', { name: 'Hola, Ana ficticia' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await loginOwner(page, owners.b); await expect(page.getByRole('heading', { name: 'Hola, Bruno ficticio' })).toBeVisible();
  await page.goBack(); await expect(page.getByText('Hola, Ana ficticia')).toHaveCount(0);
});
test('configuración reanuda preferencias y permite omitir cuenta sin inventar saldo', async ({ page }) => {
  const owner = await createTestOwner('new'); await seedOwner(owner, 'empty', false);
  await loginOwner(page, owner); await expect(page.getByRole('heading', { name: 'Hagamos espacio para vos' })).toBeVisible();
  await page.getByLabel('Cómo te llamás (opcional)').fill('María');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Tu primera cuenta' })).toBeVisible();
  await page.getByRole('button', { name: 'Omitir primera cuenta' }).click();
  await page.getByLabel('PIN de 6 dígitos', { exact: true }).fill('123456'); await page.getByLabel('Confirmar PIN').fill('123456');
  await page.getByRole('button', { name: 'Terminar configuración' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, María' })).toBeVisible();
  await expect(page.getByText('Disponible estimado', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Bloquear ahora' }).click();
  await expect(page.getByRole('heading', { name: 'Tu espacio está bloqueado' })).toBeVisible();
  await expect(page.getByText('Hola, María')).toHaveCount(0);
  for (let index = 0; index < 5; index++) {
    await page.getByLabel('PIN de 6 dígitos', { exact: true }).fill('000000'); await page.getByRole('button', { name: 'Desbloquear', exact: true }).click();
    if (index < 4) await expect(page.getByRole('alert')).toContainText('no coincide');
    else await expect(page.getByRole('alert')).toContainText('Esperá');
  }
  await expect(page.getByRole('button', { name: 'Desbloquear', exact: true })).toBeDisabled();
  await page.reload(); await expect(page.getByRole('button', { name: 'Desbloquear', exact: true })).toBeDisabled();
});
test('un enlace de recuperación inválido permite solicitar otro', async ({ page }) => {
  await page.goto('/recuperar-acceso?mode=resetPassword&oobCode=expired-fixture');
  await expect(page.getByRole('alert')).toContainText('Solicitá uno nuevo');
  await expect(page.getByRole('button', { name: 'Enviar enlace' })).toBeVisible();
});
test('escenario financiero se siembra antes del acceso mediante SDK real', async ({ page }) => {
  await seedScenario(page, 'baseline');
  await expect(page.getByRole('heading', { name: 'Hola, Ana ficticia' })).toBeVisible();
  await expect(page.getByText('Disponible estimado', { exact: true })).toHaveCount(0);
});

test('recuperar PIN confirma identidad y conserva el diario de pendientes', async ({ page, owners }) => {
  await loginOwner(page, owners.a); await expect(page.getByRole('heading', { name: 'Hola, Ana ficticia' })).toBeVisible();
  await page.getByText('Configurar PIN en este dispositivo', { exact: true }).click();
  await page.getByLabel('PIN de 6 dígitos', { exact: true }).fill('123456'); await page.getByLabel('Confirmar PIN').fill('123456'); await page.getByRole('button', { name: 'Guardar PIN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bloquear ahora' })).toBeVisible();
  await page.evaluate(async (uid) => {
    // Deliberate offline-journal fixture, scoped to the authenticated owner's UID.
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('finanzas-local-v1', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction('commands', 'readwrite'); tx.objectStore('commands').put({ uid, revisionId: 'pending-owner-only', state: 'pending', revision: { schemaVersion: 1, id: 'pending-owner-only', aggregateId: 'pending-cash', kind: 'account', parentIds: [], payload: { id: 'pending-cash', name: 'Pendiente privado', kind: 'cash', currency: 'NIO', archived: false }, deviceId: 'fixture-device', createdAtClient: new Date().toISOString() } }); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  }, owners.a.uid);
  await page.getByRole('button', { name: 'Bloquear ahora' }).click(); await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Descargar pendientes' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancelar cierre' }).click(); await page.getByRole('button', { name: 'Olvidé mi PIN' }).click();
  await page.getByLabel('Contraseña de tu cuenta').fill(owners.a.password); await page.getByLabel('Nuevo PIN de 6 dígitos').fill('654321'); await page.getByLabel('Confirmar PIN').fill('654321'); await page.getByRole('button', { name: 'Confirmar identidad y guardar PIN' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Ana ficticia' })).toBeVisible();
  const pending = await page.evaluate(async (uid) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('finanzas-local-v1', 1); request.onsuccess = () => resolve(request.result); });
    const entry = await new Promise<unknown>((resolve) => { const request = db.transaction('commands').objectStore('commands').get([uid, 'pending-owner-only']); request.onsuccess = () => resolve(request.result); }); db.close(); return entry;
  }, owners.a.uid);
  expect(pending).toMatchObject({ uid: owners.a.uid, revisionId: 'pending-owner-only', state: 'pending' });
});

test('dos minutos sin actividad desmontan la vista y el cierre libera otra pestaña', async ({ page, context, owners }) => {
  await loginOwner(page, owners.a); await expect(page.getByRole('heading', { name: 'Hola, Ana ficticia' })).toBeVisible();
  await page.getByText('Configurar PIN en este dispositivo', { exact: true }).click(); await page.getByLabel('PIN de 6 dígitos', { exact: true }).fill('123456'); await page.getByLabel('Confirmar PIN').fill('123456'); await page.getByRole('button', { name: 'Guardar PIN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bloquear ahora' })).toBeVisible();
  await page.clock.install(); await page.clock.fastForward(120_001);
  await expect(page.getByRole('heading', { name: 'Tu espacio está bloqueado' })).toBeVisible(); await expect(page.getByText('Hola, Ana ficticia')).toHaveCount(0);
  await page.getByLabel('PIN de 6 dígitos', { exact: true }).fill('123456'); await page.getByRole('button', { name: 'Desbloquear', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Hola, Ana ficticia' })).toBeVisible();
  const second = await context.newPage(); await second.goto('/inicio'); await expect(second.getByRole('heading', { name: 'Tu espacio está bloqueado' })).toBeVisible();
  await second.getByLabel('PIN de 6 dígitos', { exact: true }).fill('123456'); await second.getByRole('button', { name: 'Desbloquear', exact: true }).click(); await expect(second.getByRole('heading', { name: 'Hola, Ana ficticia' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click(); await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(second.getByText('Hola, Ana ficticia')).toHaveCount(0); await expect(second.getByRole('heading', { name: 'Pausa para cuidar tus datos' })).toBeVisible();
});
