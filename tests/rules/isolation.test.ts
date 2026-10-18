import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const fixture = (id = 'r1') => ({ schemaVersion: 1, id, aggregateId: 'cash', kind: 'account', parentIds: [], deviceId: 'phone', createdAtClient: '2026-10-15T12:00:00.000Z', receivedAtServer: serverTimestamp(), payload: { id: 'cash', name: 'Efectivo', kind: 'cash', currency: 'NIO', archived: false } });
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: process.env['FIN_RULES_PROJECT_ID'] ?? 'demo-finanzas-tests', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
beforeEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env?.cleanup(); });

describe('verified independent users', () => {
  it('allows A and B to create and read the same logical ID exclusively in their namespace', async () => {
    for (const uid of ['alice', 'bob']) {
      const db = env.authenticatedContext(uid, { email_verified: true }).firestore();
      await assertSucceeds(setDoc(doc(db, `users/${uid}/revisions/r1`), fixture()));
      await assertSucceeds(getDocs(collection(db, `users/${uid}/revisions`)));
      const other = uid === 'alice' ? 'bob' : 'alice';
      await assertFails(getDoc(doc(db, `users/${other}/revisions/r1`)));
      await assertFails(setDoc(doc(db, `users/${other}/revisions/r2`), fixture('r2')));
    }
  });
  it('denies anonymous and unverified sessions even in their own namespace', async () => {
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('alice', { email_verified: false }).firestore()]) {
      await assertFails(getDocs(collection(db, 'users/alice/revisions')));
      await assertFails(setDoc(doc(db, 'users/alice/revisions/r1'), fixture()));
    }
  });
  it('forbids revision rewrite, deletion and malformed envelope or payload', async () => {
    const db = env.authenticatedContext('alice', { email_verified: true }).firestore();
    const ref = doc(db, 'users/alice/revisions/r1');
    await assertSucceeds(setDoc(ref, fixture()));
    await assertFails(updateDoc(ref, { deviceId: 'other' }));
    await assertFails(deleteDoc(ref));
    for (const invalid of [
      { ...fixture('bad'), privileged: true },
      { ...fixture('bad'), id: 'wrong' },
      { ...fixture('bad'), parentIds: Array.from({ length: 21 }, () => 'parent') },
      { ...fixture('bad'), parentIds: ['a/b'] },
      { ...fixture('bad'), parentIds: ['a', 5] },
      { ...fixture('bad'), parentIds: ['a', 'a'] },
      { ...fixture('bad'), parentIds: ['a'.repeat(129)] },
      { ...fixture('bad'), payload: { ...fixture().payload, admin: true } },
      { ...fixture('bad'), payload: { ...fixture().payload, currency: 'BTC' } },
      { ...fixture('bad'), payload: { ...fixture().payload, name: 'a'.repeat(201) } },
      { ...fixture('bad'), receivedAtServer: 'forged' },
    ]) await assertFails(setDoc(doc(db, 'users/alice/revisions/bad'), invalid));
  });
  it('restricts profiles, devices, reminders and global server state', async () => {
    const db = env.authenticatedContext('alice', { email_verified: true }).firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { uid: 'alice', setupComplete: false }));
    await assertFails(updateDoc(doc(db, 'users/alice'), { admin: true }));
    await assertSucceeds(setDoc(doc(db, 'users/alice/devices/phone'), { token: 'private-push-token', consent: true, updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, 'users/alice/reminders/r1'), { id: 'r1', uid: 'alice', occurrenceId: 'r1', dueAt: '2026-10-15T12:00:00.000Z', state: 'pending', deviceIds: ['phone'] }));
    const bob = env.authenticatedContext('bob', { email_verified: true }).firestore();
    await assertFails(getDoc(doc(bob, 'users/alice/devices/phone')));
    await assertFails(getDoc(doc(bob, 'users/alice/reminders/r1')));
    await assertFails(setDoc(doc(db, 'users/bob/devices/phone'), { token: 't', consent: true, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, 'users/alice/reminders/r1'), { id: 'r1', uid: 'bob', occurrenceId: 'r1', dueAt: '2026-10-15T12:00:00.000Z', state: 'pending', deviceIds: ['phone'] }));
    for (const path of ['fxRates/2026-10-15', 'users/alice/aiUsage/day', 'serviceUsage/ai/days/day', 'serviceState/reminderScheduler']) await assertFails(setDoc(doc(db, path), { count: 0 }));
    await assertFails(getDocs(collection(db, 'users')));
  });
  it('validates balanced postings and rejects an injected ninth posting', async () => {
    const db = env.authenticatedContext('alice', { email_verified: true }).firestore();
    const movement = { id: 'cash', date: '2026-10-15', kind: 'expense', postings: [{ accountId: 'cash', amount: { currency: 'NIO', minor: -100 } }, { accountId: 'sys-expense-NIO', amount: { currency: 'NIO', minor: 100 } }], flows: [{ kind: 'expense', categoryId: 'food', amount: { currency: 'NIO', minor: 100 } }] };
    await assertSucceeds(setDoc(doc(db, 'users/alice/revisions/m1'), { ...fixture('m1'), kind: 'movement', payload: movement }));
    await assertFails(setDoc(doc(db, 'users/alice/revisions/m2'), { ...fixture('m2'), kind: 'movement', payload: { ...movement, postings: [{ accountId: 'cash', amount: { currency: 'NIO', minor: -99 } }, movement.postings[1]] } }));
    await assertFails(setDoc(doc(db, 'users/alice/revisions/m3'), { ...fixture('m3'), kind: 'movement', payload: { ...movement, postings: [...movement.postings, ...Array.from({ length: 7 }, () => movement.postings[0])] } }));
    await assertSucceeds(setDoc(doc(db, 'users/alice/revisions/m4'), { ...fixture('m4'), kind: 'movement', payload: { ...movement, postings: [...movement.postings, ...movement.postings, ...movement.postings, ...movement.postings], flows: [] } }));
  });
  it('accepts all supported aggregate shapes and twenty parent references', async () => {
    const db = env.authenticatedContext('alice', { email_verified: true }).firestore();
    const amount = { currency: 'NIO', minor: 100 };
    const shapes = {
      budget: { id: 'cash', categoryId: 'food', currency: 'NIO', limitMinor: 100, startsMonth: '2026-10', carryPositive: false },
      goal: { id: 'cash', name: 'Meta', target: amount },
      allocation: { id: 'cash', goalId: 'goal', accountId: 'bank', amount },
      loan: { id: 'cash', direction: 'payable', principal: amount, counterparty: 'Persona', accountId: 'bank', openedAt: '2026-10-15', initialMode: 'new', archived: false },
      investment: { id: 'cash', name: 'Inversión', currency: 'NIO', accountId: 'bank', initialValue: amount, initialDate: '2026-10-15', archived: false },
      valuation: { id: 'cash', investmentId: 'investment', date: '2026-10-15', value: amount },
      recurring: { id: 'cash', start: '2026-10-15', frequency: 'monthly', template: {}, paused: false, reminderDaysBefore: [] },
      occurrenceOverride: { id: 'cash', occurrenceId: 'occurrence', action: 'skip' },
      card: { id: 'cash', name: 'Tarjeta', accountIds: ['bank'], terms: { closingDay: 20, dueDay: 5 }, limit: { mode: 'shared', amount } },
      category: { id: 'cash', name: 'Comida', flowKind: 'expense', archived: false },
      favorite: { id: 'cash', name: 'Favorito', template: {} },
      settings: { summaryCurrency: 'NIO', timezone: 'America/Managua', locale: 'es-NI', fxMode: 'automatic', hidePushAmounts: true, notificationsEnabled: false, assistantConsent: false },
    };
    for (const [kind, payload] of Object.entries(shapes)) await assertSucceeds(setDoc(doc(db, `users/alice/revisions/${kind}`), { ...fixture(kind), kind, payload })).catch((cause: unknown) => { throw new Error(kind, { cause }); });
    await assertSucceeds(setDoc(doc(db, 'users/alice/revisions/parents'), { ...fixture('parents'), parentIds: Array.from({ length: 20 }, (_, i) => `parent-${i}`) }));
  });
  it('bounds installment plans to sixty; nested validation is enforced on client reads and writes', async () => {
    const db = env.authenticatedContext('alice', { email_verified: true }).firestore();
    const installments = Array.from({ length: 60 }, (_, i) => ({ ordinal: i + 1, dueDate: '2026-10-15', amount: { currency: 'NIO', minor: 100 } }));
    const plan = { id: 'cash', movementId: 'purchase', cardId: 'card', installments };
    await assertSucceeds(setDoc(doc(db, 'users/alice/revisions/p1'), { ...fixture('p1'), kind: 'installmentPlan', payload: plan }));
    await assertFails(setDoc(doc(db, 'users/alice/revisions/p2'), { ...fixture('p2'), kind: 'installmentPlan', payload: { ...plan, installments: [...installments, installments[0]] } }));
    // Explicit characterization of the documented server expression-budget limitation.
    await assertSucceeds(setDoc(doc(db, 'users/alice/revisions/p3'), { ...fixture('p3'), kind: 'installmentPlan', payload: { ...plan, installments: [...installments.slice(0, 59), { ...installments[59], amount: { currency: 'NIO', minor: 'bad' } }] } }));
  });
});
