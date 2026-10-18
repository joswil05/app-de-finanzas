import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { AccountSchema, LocalDateSchema, RevisionSchema, UserProfileSchema, UserSettingsSchema, type Currency, type Revision } from '@fin/contracts';
import { buildOpening, parseMoney } from '@fin/domain';
import { z } from 'zod';
import type { SessionAuthorization, SessionController } from '../auth/session';

export type SetupDraft = { step: number; displayName: string; summaryCurrency: Currency; timezone: string; skipAccount: boolean; accountName: string; accountKind: 'cash' | 'bank'; accountCurrency: Currency; balance: string; date: string };
const SetupDraftSchema = z.object({ step: z.number().int().min(1).max(3), displayName: z.string().max(200), summaryCurrency: z.enum(['NIO', 'USD']), timezone: z.string().max(100), skipAccount: z.boolean(), accountName: z.string().max(200), accountKind: z.enum(['cash', 'bank']), accountCurrency: z.enum(['NIO', 'USD']), balance: z.string().max(20), date: z.string().max(10) }).strict();
export function initialDraft(uid: string): SetupDraft {
  const empty: SetupDraft = { step: 1, displayName: '', summaryCurrency: 'NIO', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Managua', skipAccount: false, accountName: '', accountKind: 'cash', accountCurrency: 'NIO', balance: '0', date: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) };
  try { const saved = SetupDraftSchema.safeParse(JSON.parse(localStorage.getItem(`finanzas-onboarding-v1:${uid}`) ?? 'null')); return saved.success ? saved.data : empty; } catch { return empty; }
}
export async function finishSetup(controller: SessionController, draft: SetupDraft, authorization: SessionAuthorization = controller.captureAccess()): Promise<void> {
  if (!navigator.onLine) throw new Error('La primera configuración necesita conexión. Conservamos lo que completaste para reintentar.');
  const user = controller.runtime.auth.currentUser;
  if (!user?.emailVerified) throw new Error('Verificá tu correo antes de continuar.');
  const currentAccess = controller.captureAccess();
  if (currentAccess.uid !== authorization.uid || currentAccess.generation !== authorization.generation) throw new Error('La sesión cambió durante la configuración. Desbloqueá tu espacio e intentá de nuevo.');
  controller.runtime.assertSession({ uid: user.uid, emailVerified: true });
  const settings = UserSettingsSchema.parse({ summaryCurrency: draft.summaryCurrency, timezone: draft.timezone, locale: 'es-NI', fxMode: 'automatic', hidePushAmounts: true, notificationsEnabled: false, assistantConsent: false });
  const profile = UserProfileSchema.parse({ uid: user.uid, ...(draft.displayName.trim() ? { displayName: draft.displayName.trim() } : {}), setupComplete: true });
  const createdAtClient = new Date().toISOString();
  const revision = (id: string, aggregateId: string, kind: Revision['kind'], payload: unknown): Revision => RevisionSchema.parse({ schemaVersion: 1, id, aggregateId, kind, payload, parentIds: [], deviceId: controller.deviceId, createdAtClient });
  const revisions: Revision[] = [revision('onboarding-settings-v1', 'settings', 'settings', settings)];
  for (const category of [{ id: 'food', name: 'Alimentación', flowKind: 'expense' }, { id: 'transport', name: 'Transporte', flowKind: 'expense' }, { id: 'other-expense', name: 'Otros gastos', flowKind: 'expense' }, { id: 'income', name: 'Ingresos', flowKind: 'income' }]) revisions.push(revision(`onboarding-category-${category.id}-v1`, category.id, 'category', { ...category, archived: false }));
  if (!draft.skipAccount) {
    const account = AccountSchema.parse({ id: 'initial-account', name: draft.accountName.trim(), kind: draft.accountKind, currency: draft.accountCurrency, archived: false });
    const amount = parseMoney(draft.balance, account.currency);
    if (amount.minor < 0) throw new Error('El saldo inicial de efectivo o banco no puede ser negativo.');
    const date = LocalDateSchema.parse(draft.date);
    revisions.push(revision('onboarding-account-v1', account.id, 'account', account));
    if (amount.minor !== 0) revisions.push(revision('onboarding-opening-v1', 'initial-opening', 'movement', buildOpening({ id: 'initial-opening', accountId: account.id, date, amount }, [account])));
  }
  // Profile completion and immutable initial records share one online transaction.
  // Deterministic IDs and the profile read make retries/unknown ACKs idempotent.
  const profileRef = doc(controller.runtime.firestore, 'users', user.uid);
  await runTransaction(controller.runtime.firestore, async (transaction) => {
    const previous = await transaction.get(profileRef);
    if (previous.exists() && UserProfileSchema.parse(previous.data()).setupComplete) return;
    controller.runtime.assertSession({ uid: user.uid, emailVerified: true });
    for (const value of revisions) transaction.set(doc(controller.runtime.firestore, 'users', user.uid, 'revisions', value.id), { ...value, receivedAtServer: serverTimestamp() });
    transaction.set(profileRef, profile);
  });
  localStorage.removeItem(`finanzas-onboarding-v1:${user.uid}`);
  await controller.completeSetup(authorization);
}
