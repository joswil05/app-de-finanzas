import { test as base, expect, type Page } from '@playwright/test';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, getIdTokenResult, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, initializeFirestore, serverTimestamp, terminate, writeBatch } from 'firebase/firestore';
import { fixtureRevisions, type FixtureName } from '@fin/testkit';

export const EMULATOR_PROJECT = 'demo-finanzas-tests';
export const AUTH_EMULATOR = 'http://127.0.0.1:9109';
const API_KEY = 'demo-public-api-key';
export type TestOwner = { uid: string; email: string; password: string; displayName: string };
export type TestOwners = { a: TestOwner; b: TestOwner };
const scenarios = new WeakMap<Page, TestOwners>();

/** Deliberate test-only REST adaptation: no Admin SDK or production fallback. */
function emulatorOnly(url: string): URL {
  const parsed = new URL(url);
  if (!EMULATOR_PROJECT.startsWith('demo-') || parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1' || parsed.port !== '9109') throw new Error('Fixtures require the isolated loopback Auth emulator.');
  return parsed;
}
async function authRequest(action: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = emulatorOnly(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:${action}?key=${API_KEY}`);
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Auth emulator fixture ${action} failed (${response.status}): ${await response.text()}`);
  return await response.json() as Record<string, unknown>;
}
export async function createTestOwner(label: string, verified = true): Promise<TestOwner> {
  const email = `${label}-${crypto.randomUUID()}@example.test`;
  const password = 'Ficticia-123456!';
  const account = await authRequest('signUp', { email, password, returnSecureToken: true });
  if (typeof account.localId !== 'string' || typeof account.idToken !== 'string') throw new Error('Auth emulator returned no identity.');
  if (verified) {
    await authRequest('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: account.idToken });
    const response = await fetch(emulatorOnly(`${AUTH_EMULATOR}/emulator/v1/projects/${EMULATOR_PROJECT}/oobCodes`));
    if (!response.ok) throw new Error('Auth emulator OOB codes are unavailable.');
    const data = await response.json() as { oobCodes: { email: string; oobCode: string; requestType: string }[] };
    const code = data.oobCodes.find((entry) => entry.email === email && entry.requestType === 'VERIFY_EMAIL');
    if (!code) throw new Error('Auth emulator did not produce a verification code.');
    await authRequest('update', { oobCode: code.oobCode });
  }
  return { uid: account.localId, email, password, displayName: label === 'a' ? 'Ana ficticia' : 'Bruno ficticio' };
}
export async function seedOwner(owner: TestOwner, name: FixtureName = 'empty', setupComplete = true): Promise<void> {
  emulatorOnly(AUTH_EMULATOR);
  const app = initializeApp({ apiKey: API_KEY, authDomain: `${EMULATOR_PROJECT}.firebaseapp.com`, projectId: EMULATOR_PROJECT, appId: '1:000000000000:web:test' }, `fixture-${crypto.randomUUID()}`);
  const auth = getAuth(app); connectAuthEmulator(auth, AUTH_EMULATOR, { disableWarnings: true });
  const firestore = initializeFirestore(app, {}); connectFirestoreEmulator(firestore, '127.0.0.1', 8180);
  try {
    const signedIn = await signInWithEmailAndPassword(auth, owner.email, owner.password);
    if ((await getIdTokenResult(signedIn.user, true)).claims.email_verified !== true) throw new Error('Fixture requires a freshly verified session.');
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'users', owner.uid), { uid: owner.uid, displayName: owner.displayName, setupComplete });
    for (const revision of fixtureRevisions(name)) batch.set(doc(firestore, 'users', owner.uid, 'revisions', revision.id), { ...revision, receivedAtServer: serverTimestamp() });
    await batch.commit();
  } finally { await terminate(firestore); await deleteApp(app); }
}
export async function loginOwner(page: Page, owner: TestOwner): Promise<void> {
  await page.goto('/acceso');
  await page.getByLabel('Correo', { exact: true }).fill(owner.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(owner.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
export async function seedScenario(page: Page, name: FixtureName): Promise<void> {
  const owners = { a: await createTestOwner('a'), b: await createTestOwner('b') };
  await seedOwner(owners.a, name); await seedOwner(owners.b, 'empty');
  scenarios.set(page, owners);
  await loginOwner(page, owners.a);
}
export function scenarioOwners(page: Page): TestOwners {
  const owners = scenarios.get(page); if (!owners) throw new Error('Call seedScenario before requesting its identities.'); return owners;
}
export const test = base.extend<{ owners: TestOwners }>({
  owners: async ({ page }, use) => {
    // Fixture belongs to this browser context; no cross-test shared identity/cache.
    const owners = { a: await createTestOwner('a'), b: await createTestOwner('b') };
    await seedOwner(owners.a); await seedOwner(owners.b); scenarios.set(page, owners);
    await use(owners);
  },
});
export { expect };
