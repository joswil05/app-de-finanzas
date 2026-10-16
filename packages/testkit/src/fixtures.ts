import type { Account, AggregateKind, Backup, Card, Category, Currency, FxRate, Investment, LoanDetails, Money, Movement, RecurringRule, Revision, Snapshot, UserSettings, VerifiedSession } from '@fin/contracts';

export const FIXTURE_NOW = '2026-10-15T12:00:00.000Z';
export const FIXTURE_DATE = '2026-10-15';
export const FIXTURE_UID = 'owner-test';
export const FIXTURE_NAMES = ['empty', 'baseline', 'card', 'loan', 'investment', 'conflict'] as const;
export type FixtureName = typeof FIXTURE_NAMES[number];
export const fixtureRate: FxRate = { nioPerUsd: '36.6243', effectiveDate: FIXTURE_DATE, fetchedAt: FIXTURE_NOW, source: 'BCN' };
export const fixtureCategories: Category[] = [
  { id: 'food', name: 'Comida', flowKind: 'expense', archived: false },
  { id: 'other', name: 'Otros', flowKind: 'expense', archived: false },
  { id: 'business', name: 'Mi negocio', flowKind: 'income', archived: false },
];
export const fixtureSettings: UserSettings = { summaryCurrency: 'NIO', timezone: 'America/Managua', locale: 'es-NI', fxMode: 'automatic', hidePushAmounts: true, notificationsEnabled: false, assistantConsent: false };
const money = (minor: number, currency: Currency = 'NIO'): Money => ({ currency, minor });
const account = (id: string, name: string, kind: Account['kind'], currency: Currency = 'NIO'): Account => ({ id, name, kind, currency, archived: false });
function systemAccounts(): Account[] {
  return (['NIO', 'USD'] as const).flatMap((currency) => ['income', 'expense', 'equity', 'adjustment', 'fx'].map((kind) => account(`sys-${kind}-${currency}`, `Contrapartida ${kind} ${currency}`, 'system', currency)));
}
function posting(accountId: string, minor: number, currency: Currency = 'NIO') { return { accountId, amount: money(minor, currency) }; }
function opening(id: string, accountId: string, minor: number, currency: Currency = 'NIO'): Movement {
  return { id, date: FIXTURE_DATE, kind: 'opening', postings: [posting(accountId, minor, currency), posting(`sys-equity-${currency}`, -minor, currency)], flows: [] };
}
export const fixtureRecurringRule: RecurringRule = {
  id: 'commitment-monthly', start: '2026-10-31', frequency: 'monthly', paused: false, reminderDaysBefore: [1],
  template: { kind: 'expense', amount: money(500_000), accountId: 'cash-nio', categoryId: 'other' },
};
export const fixtureCard: Card = { id: 'card-main', name: 'Tarjeta ficticia', accountIds: ['card-nio'], terms: { closingDay: 20, dueDay: 31 }, limit: { mode: 'shared', amount: money(100_000) } };
export const fixtureLoan: LoanDetails = { id: 'loan-main', direction: 'payable', principal: money(100_000), counterparty: 'Persona ficticia', accountId: 'loan-payable-nio', openedAt: FIXTURE_DATE, dueDate: '2026-11-15', initialMode: 'existing', archived: false };
export const fixtureInvestment: Investment = { id: 'investment-main', name: 'Inversión ficticia', currency: 'NIO', accountId: 'investment-nio', initialValue: money(10_000), initialDate: FIXTURE_DATE, archived: false };

/** Independent clones; financial fixtures contain no real data and never call domain code. */
export function fixtureSnapshot(name: FixtureName): Snapshot {
  const snapshot: Snapshot = { accounts: [], movements: [], goals: [], allocations: [], commitments: [], budgetRules: [], rates: [], asOf: FIXTURE_NOW, complete: true, pendingCount: 0, conflictAggregateIds: [] };
  if (name === 'empty') return snapshot;
  snapshot.accounts.push(account('cash-nio', 'Efectivo', 'cash'), account('bank-usd', 'Banco USD', 'bank', 'USD'), ...systemAccounts());
  snapshot.movements.push(opening('opening-cash-nio', 'cash-nio', 1_200_000), opening('opening-bank-usd', 'bank-usd', 10_000, 'USD'));
  snapshot.goals.push({ id: 'goal-reserve', name: 'Reserva', target: money(200_000) });
  snapshot.allocations.push({ id: 'allocation-reserve', goalId: 'goal-reserve', accountId: 'cash-nio', amount: money(200_000) });
  snapshot.commitments.push({ id: 'commitment-monthly:2026-10-31:0', dueDate: '2026-10-31', amount: money(500_000), paidMinor: 0, kind: 'cashExpense' });
  snapshot.budgetRules.push({ id: 'budget-food', categoryId: 'food', currency: 'NIO', limitMinor: 100_000, startsMonth: '2026-10', carryPositive: true });
  snapshot.rates.push(structuredClone(fixtureRate));
  if (name === 'card') {
    snapshot.accounts.push(account('card-nio', 'Tarjeta NIO', 'card'));
    snapshot.movements.push(
      { id: 'card-purchase', date: FIXTURE_DATE, kind: 'cardPurchase', linkedId: 'card-main', postings: [posting('card-nio', -10_000), posting('sys-expense-NIO', 10_000)], flows: [{ kind: 'expense', amount: money(10_000), categoryId: 'food' }] },
      { id: 'card-payment', date: FIXTURE_DATE, kind: 'cardPayment', linkedId: 'card-main', postings: [posting('cash-nio', -4_000), posting('card-nio', 4_000)], flows: [] },
    );
    snapshot.commitments.push({ id: 'card-main:2026-10-31', dueDate: '2026-10-31', amount: money(10_000), paidMinor: 4_000, kind: 'cardDue' });
  }
  if (name === 'loan') {
    snapshot.accounts.push(account('loan-payable-nio', 'Deuda ficticia', 'loanPayable'));
    snapshot.movements.push(
      { ...opening('loan-opening', 'loan-payable-nio', -100_000), linkedId: 'loan-main' },
      { id: 'loan-repayment', date: FIXTURE_DATE, kind: 'loanPrincipal', linkedId: 'loan-main', postings: [posting('cash-nio', -25_000), posting('loan-payable-nio', 25_000)], flows: [] },
      { id: 'loan-interest', date: FIXTURE_DATE, kind: 'interest', linkedId: 'loan-main', postings: [posting('cash-nio', -3_000), posting('sys-expense-NIO', 3_000)], flows: [{ kind: 'expense', amount: money(3_000), categoryId: 'other' }] },
    );
    snapshot.commitments.push({ id: 'loan-main:2026-11-15', dueDate: '2026-11-15', amount: money(100_000), paidMinor: 25_000, kind: 'loanDue' });
  }
  if (name === 'investment') {
    snapshot.accounts.push(account('investment-nio', 'Inversión ficticia', 'investment'));
    snapshot.movements.push(
      { ...opening('investment-opening', 'investment-nio', 10_000), linkedId: 'investment-main' },
      { id: 'investment-contribution', date: FIXTURE_DATE, kind: 'investmentTransfer', linkedId: 'investment-main', postings: [posting('cash-nio', -5_000), posting('investment-nio', 5_000)], flows: [] },
      { id: 'investment-withdrawal', date: FIXTURE_DATE, kind: 'investmentTransfer', linkedId: 'investment-main', postings: [posting('investment-nio', -2_000), posting('cash-nio', 2_000)], flows: [] },
      { id: 'investment-yield', date: FIXTURE_DATE, kind: 'investmentYield', linkedId: 'investment-main', postings: [posting('cash-nio', 500), posting('sys-income-NIO', -500)], flows: [{ kind: 'income', amount: money(500), categoryId: 'business' }] },
    );
  }
  if (name === 'conflict') { snapshot.complete = false; snapshot.conflictAggregateIds = ['opening-cash-nio']; }
  return snapshot;
}

function revision(kind: AggregateKind, aggregateId: string, payload: unknown): Revision {
  return { schemaVersion: 1, id: `revision-${kind}-${aggregateId}`, aggregateId, kind, parentIds: [], payload, deviceId: 'device-test', createdAtClient: FIXTURE_NOW };
}
export function fixtureRevisions(name: FixtureName): Revision[] {
  if (name === 'empty') return [];
  const snapshot = fixtureSnapshot(name);
  const revisions: Revision[] = [
    ...snapshot.accounts.map((value) => revision('account', value.id, value)),
    ...snapshot.movements.map((value) => revision('movement', value.id, value)),
    ...snapshot.goals.map((value) => revision('goal', value.id, value)),
    ...snapshot.allocations.map((value) => revision('allocation', value.id, value)),
    ...snapshot.budgetRules.map((value) => revision('budget', value.id, value)),
    ...fixtureCategories.map((value) => revision('category', value.id, structuredClone(value))),
    revision('settings', 'settings-main', structuredClone(fixtureSettings)),
    revision('recurring', fixtureRecurringRule.id, structuredClone(fixtureRecurringRule)),
  ];
  if (name === 'card') revisions.push(revision('card', fixtureCard.id, structuredClone(fixtureCard)), revision('installmentPlan', 'card-plan', { id: 'card-plan', cardId: fixtureCard.id, movementId: 'card-purchase', installments: [{ ordinal: 1, dueDate: '2026-10-31', amount: money(10_000) }] }));
  if (name === 'loan') revisions.push(revision('loan', fixtureLoan.id, structuredClone(fixtureLoan)));
  if (name === 'investment') revisions.push(revision('investment', fixtureInvestment.id, structuredClone(fixtureInvestment)), revision('valuation', 'investment-valuation', { id: 'investment-valuation', investmentId: fixtureInvestment.id, date: FIXTURE_DATE, value: money(14_000) }));
  if (name === 'conflict') {
    const parentId = 'revision-movement-opening-cash-nio';
    for (const [index, minor] of [1_100_000, 1_300_000].entries()) revisions.push({ ...revision('movement', 'opening-cash-nio', opening('opening-cash-nio', 'cash-nio', minor)), id: `revision-conflict-${index}`, parentIds: [parentId], deviceId: `device-test-${index}` });
  }
  return revisions;
}

export type UserFixture = { session: VerifiedSession; snapshot: Snapshot; revisions: Revision[]; backup: Backup };
/** UID is metadata only: identical logical IDs are intentionally valid in different namespaces. */
export function fixtureUser(uid: string = FIXTURE_UID, name: FixtureName = 'baseline'): UserFixture {
  const revisions = fixtureRevisions(name);
  return { session: { uid, emailVerified: true }, snapshot: fixtureSnapshot(name), revisions, backup: { schemaVersion: 1, exportedAt: FIXTURE_NOW, ownerUid: uid, revisions: structuredClone(revisions) } };
}
