import { describe, expect, test } from 'vitest';
import { balance, projectHeads, projectionToSnapshot, projectionToSnapshotReport, resolveRevision } from '@fin/domain';
import { SnapshotSchema, type Account, type Movement, type Revision, type SyncStatus } from '@fin/contracts';
import { FIXTURE_NOW, fixtureRate, fixtureRevisions, fixtureSnapshot } from '@fin/testkit';

const at = '2026-10-15T12:00:00Z';
const status: SyncStatus = { mode: 'synced', pending: 0, rejected: 0, lastSyncedAt: at, hydrated: true, durable: true };
function r<T>(id: string, parentIds: string[], payload: T | null, aggregateId = 'm1', kind: Revision['kind'] = 'movement'): Revision<T> {
  return { schemaVersion: 1, id, aggregateId, kind, parentIds, payload, deviceId: 'd', createdAtClient: at };
}
const fork = [r('a', [], { amount: 100 }), r('b', ['a'], { amount: 200 }), r('c', ['a'], { amount: 300 })];
const bank: Account = { id: 'bank', name: 'Banco', kind: 'bank', currency: 'NIO', archived: false };
const opening: Movement = { id: 'opening', date: '2026-10-15', kind: 'opening', postings: [{ accountId: 'bank', amount: { currency: 'NIO', minor: 10000 } }, { accountId: 'sys-equity-NIO', amount: { currency: 'NIO', minor: -10000 } }], flows: [] };
const expense: Movement = { id: 'rule:2026-10-16:0', date: '2026-10-16', kind: 'expense', occurrenceId: 'rule:2026-10-16:0', postings: [{ accountId: 'bank', amount: { currency: 'NIO', minor: -1000 } }, { accountId: 'sys-expense-NIO', amount: { currency: 'NIO', minor: 1000 } }], flows: [{ kind: 'expense', amount: { currency: 'NIO', minor: 1000 }, categoryId: 'food' }] };
const base = [r('account', [], bank, 'bank', 'account'), r('opening-r', [], opening, 'opening')];

describe('immutable revision DAG', () => {
  test('V16: offline branches retain the unique common ancestor', () => {
    expect(projectHeads(fork)).toEqual([{ aggregateId: 'm1', state: 'conflict', value: { amount: 100 }, headIds: ['b', 'c'] }]);
  });
  test('V17: resolution is a new revision referencing all known heads', () => {
    const resolution = resolveRevision([fork[2]!, fork[1]!], { amount: 250 }, 'd', 'device2', at);
    expect(resolution.parentIds).toEqual(['b', 'c']);
    expect(projectHeads([...fork, resolution])[0]).toMatchObject({ state: 'resolved', value: { amount: 250 }, headIds: ['d'] });
    expect(projectHeads([...fork, resolution, r('late', ['a'], { amount: 900 })])[0]).toMatchObject({ state: 'conflict', value: { amount: 100 }, headIds: ['d', 'late'] });
  });
  test('all delivery permutations and client clocks yield the same projection', () => {
    const expected = [{ aggregateId: 'm1', state: 'conflict', value: { amount: 100 }, headIds: ['b', 'c'] }];
    for (const events of [fork, [...fork].reverse(), [fork[1]!, fork[0]!, fork[2]!], [fork[2]!, fork[1]!, fork[0]!]]) {
      expect(projectHeads(events.map((e, i) => ({ ...e, createdAtClient: i % 2 ? '2050-01-01T00:00:00Z' : '2000-01-01T00:00:00Z' })))).toEqual(expected);
    }
  });
  test('missing parent is pending and becomes resolvable when downloaded', () => {
    expect(projectHeads([fork[1]!])[0]).toMatchObject({ state: 'missingParents', value: null });
    expect(projectHeads([fork[1]!, fork[0]!])[0]).toMatchObject({ state: 'resolved', value: { amount: 200 } });
  });
  test.each([
    [r('a', ['b'], { amount: 1 }), r('b', ['a'], { amount: 2 })],
    [r('a', ['a'], { amount: 1 })],
    [r('a', [], { amount: 1 }), r('b', ['a', 'a'], { amount: 2 })],
    [r('a', [], { amount: 1 }), r('b', ['a'], { amount: 2 }, 'm1', 'goal')],
    [r('a', [], { amount: 1 }), r('a', [], { amount: 2 })],
  ])('rejects cycles, duplicate parents, mixed kinds and colliding IDs %#', (...events) => {
    expect(projectHeads(events)[0]).toMatchObject({ state: 'invalid', value: null });
  });
  test('parent from another aggregate invalidates the child aggregate', () => {
    expect(projectHeads([r('a', [], { amount: 1 }, 'other'), r('b', ['a'], { amount: 2 })])).toEqual([
      { aggregateId: 'm1', state: 'invalid', value: null, headIds: ['b'] },
      { aggregateId: 'other', state: 'resolved', value: { amount: 1 }, headIds: ['a'] },
    ]);
  });
  test('invalid external envelope is classified without crashing graph traversal', () => {
    const malformed = { ...r('a', [], { amount: 1 }), parentIds: undefined } as unknown as Revision<{ amount: number }>;
    expect(projectHeads([malformed])[0]).toMatchObject({ state: 'invalid', value: null });
  });
  test('V20: independent different roots exclude value, even when clocks agree', () => {
    expect(projectHeads([r('a', [], { amount: 1 }), r('b', [], { amount: 2 })])[0]).toMatchObject({ state: 'conflict', value: null });
  });
  test('equal concurrent edits still conflict and preserve evidence', () => {
    expect(projectHeads([fork[0]!, r('b', ['a'], { amount: 2 }), r('c', ['a'], { amount: 2 })])[0]).toMatchObject({ state: 'conflict', value: { amount: 100 }, headIds: ['b', 'c'] });
  });
  test('equal ordinary roots are distinct actions; primitive generic payloads are supported', () => {
    expect(projectHeads([r('a', [], 5), r('b', [], 5)])[0]).toMatchObject({ state: 'conflict', value: null });
    expect(projectHeads([r('a', [], 5), r('b', ['a'], 8)])[0]).toMatchObject({ state: 'resolved', value: 8 });
  });
  test('occurrence roots deduplicate normalized financial content, not notes', () => {
    const events = [r('a', [], { ...expense, note: 'first' }, expense.id), r('b', [], { ...expense, note: 'second', postings: [...expense.postings].reverse() }, expense.id)];
    expect(projectHeads(events)[0]).toMatchObject({ state: 'resolved', value: { id: expense.id }, headIds: ['a', 'b'] });
    expect(projectionToSnapshot([...base, ...events], status).movements).toHaveLength(2);
    expect(balance(projectionToSnapshot([...base, ...events], status).accounts, projectionToSnapshot([...base, ...events], status).movements).bank?.minor).toBe(9000);
    const changed = { ...expense, date: '2026-10-17' };
    expect(projectHeads([...events, r('c', [], changed, expense.id)])[0]).toMatchObject({ state: 'conflict', value: null });
  });
  test('multiple incomparable common ancestors are excluded conservatively', () => {
    const events = [r('a', [], { amount: 1 }), r('b', [], { amount: 2 }), r('c', ['a', 'b'], { amount: 3 }), r('d', ['b', 'a'], { amount: 4 })];
    expect(projectHeads(events)[0]).toMatchObject({ state: 'conflict', value: null });
  });
  test('editing one equivalent occurrence root is effective; two offline edits retain logical ancestor', () => {
    const roots = [r('a', [], expense, expense.id), r('b', [], { ...expense, note: 'same confirmation' }, expense.id)];
    const changed = { ...expense, date: '2026-10-17' };
    expect(projectHeads([...roots, r('c', ['a'], changed, expense.id)])[0]).toMatchObject({ state: 'resolved', value: { date: '2026-10-17' }, headIds: ['b', 'c'] });
    expect(projectHeads([...roots, r('c', ['a'], changed, expense.id), r('d', ['b'], { ...expense, date: '2026-10-18' }, expense.id)])[0]).toMatchObject({ state: 'conflict', value: { date: '2026-10-16' }, headIds: ['c', 'd'] });
  });
  test('tombstone is effective and conflicting deletion retains ancestor', () => {
    expect(projectHeads([fork[0]!, r('b', ['a'], null)])[0]).toMatchObject({ state: 'resolved', value: null });
    expect(projectHeads([fork[0]!, r('b', ['a'], null), fork[2]!])[0]).toMatchObject({ state: 'conflict', value: { amount: 100 } });
  });
  test('duplicate deliveries ignore receivedAtServer, never mutate input/output aliases', () => {
    const events = [...fork, { ...fork[0]!, receivedAtServer: at }];
    const before = structuredClone(events);
    const heads = projectHeads(events);
    heads[0]!.value!.amount = 999;
    heads[0]!.headIds.push('fake');
    expect(events).toEqual(before);
    expect(projectHeads(events)[0]?.value).toEqual({ amount: 100 });
  });
  test('resolution rejects mixed aggregates, empty heads and reused ID', () => {
    expect(() => resolveRevision([], {}, 'd', 'device', at)).toThrow();
    expect(() => resolveRevision([fork[1]!, r('x', [], { amount: 1 }, 'other')], { amount: 2 }, 'd', 'device', at)).toThrow();
    expect(() => resolveRevision([fork[1]!], { amount: 2 }, 'b', 'device', at)).toThrow();
  });
  test('resolution validates metadata and copies chosen payload rather than aliasing it', () => {
    const chosen = { amount: 250 };
    const result = resolveRevision([fork[1]!, fork[2]!], chosen, 'd', 'device', at);
    chosen.amount = 500;
    expect(result.payload).toEqual({ amount: 250 });
    expect(() => resolveRevision([fork[1]!], chosen, 'd', 'device', 'invalid')).toThrow();
    expect(() => resolveRevision([fork[0]!, fork[1]!], chosen, 'd', 'device', at)).toThrow();
  });
});

describe('canonical snapshot adapter', () => {
  test('T02 baseline fixture reconstructs account balances, goal allocation and next recurring obligation', () => {
    const snapshot = projectionToSnapshot(fixtureRevisions('baseline'), { ...status, lastSyncedAt: FIXTURE_NOW }, { rates: [fixtureRate] });
    const baseline = fixtureSnapshot('baseline');
    expect(snapshot.accounts).toEqual([...baseline.accounts].sort((a, b) => a.id < b.id ? -1 : 1));
    expect(snapshot.goals).toEqual(baseline.goals);
    expect(snapshot.allocations).toEqual(baseline.allocations);
    expect(snapshot.budgetRules).toEqual(baseline.budgetRules);
    expect(snapshot.commitments).toEqual(expect.arrayContaining(baseline.commitments));
    expect(snapshot.commitments.map((item) => item.dueDate)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31']);
    expect(balance(snapshot.accounts, snapshot.movements)).toMatchObject({ 'cash-nio': { currency: 'NIO', minor: 1200000 }, 'bank-usd': { currency: 'USD', minor: 10000 } });
    expect(snapshot).toMatchObject({ complete: true, rates: [fixtureRate] });
  });
  test.each(['card', 'loan'] as const)('T02 %s fixture retains ledger but marks missing obligation adapter incomplete', (name) => {
    const report = projectionToSnapshotReport(fixtureRevisions(name), { ...status, lastSyncedAt: FIXTURE_NOW });
    expect(report.snapshot.complete).toBe(false);
    expect(report.snapshot.movements.length).toBe(fixtureSnapshot(name).movements.length);
    expect(report.snapshot.commitments.every((item) => item.kind === 'cashExpense' && item.paidMinor === 0)).toBe(true);
    expect(report.reasons.length).toBeGreaterThan(0);
  });
  test('T02 conflict fixture conserves opening balance and reports its aggregate', () => {
    const snapshot = projectionToSnapshot(fixtureRevisions('conflict'), status);
    expect(snapshot).toMatchObject({ complete: false, conflictAggregateIds: ['opening-cash-nio'] });
    expect(balance(snapshot.accounts, snapshot.movements)['cash-nio']?.minor).toBe(1200000);
  });
  test('baseline accounts, balance, goal, allocation, budget and recurring obligations', () => {
    const events = [...base,
      r('goal-r', [], { id: 'goal', name: 'Viaje', target: { currency: 'NIO', minor: 5000 } }, 'goal', 'goal'),
      r('allocation-r', [], { id: 'alloc', goalId: 'goal', accountId: 'bank', amount: { currency: 'NIO', minor: 2000 } }, 'alloc', 'allocation'),
      r('budget-r', [], { id: 'budget', categoryId: 'food', currency: 'NIO', limitMinor: 3000, startsMonth: '2026-10', carryPositive: false }, 'budget', 'budget'),
      r('rule-r', [], { id: 'rule', start: '2026-10-16', end: '2026-10-16', frequency: 'monthly', paused: false, reminderDaysBefore: [], template: { kind: 'expense', accountId: 'bank', categoryId: 'food', amount: { currency: 'NIO', minor: 1000 } } }, 'rule', 'recurring'),
    ];
    const snapshot = projectionToSnapshot(events, status);
    expect(SnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(snapshot).toMatchObject({ complete: true, asOf: at, pendingCount: 0, rates: [], conflictAggregateIds: [], goals: [{ id: 'goal' }], allocations: [{ id: 'alloc' }], budgetRules: [{ id: 'budget' }], commitments: [{ id: 'rule:2026-10-16:0', dueDate: '2026-10-16', amount: { currency: 'NIO', minor: 1000 }, paidMinor: 0, kind: 'cashExpense' }] });
    expect(balance(snapshot.accounts, snapshot.movements).bank?.minor).toBe(10000);
    expect(projectionToSnapshot([...events].reverse(), status)).toEqual(snapshot);
  });
  test('movement conflict keeps baseline balance and signals incompleteness', () => {
    const edit = { ...opening, postings: opening.postings.map((p) => ({ ...p, amount: { ...p.amount, minor: p.amount.minor * 2 } })) };
    const snapshot = projectionToSnapshot([...base, r('b', ['opening-r'], edit, opening.id), r('c', ['opening-r'], opening, opening.id)], status);
    expect(snapshot.complete).toBe(false);
    expect(snapshot.conflictAggregateIds).toEqual(['opening']);
    expect(balance(snapshot.accounts, snapshot.movements).bank?.minor).toBe(10000);
  });
  test('movement tombstone removes effect; account tombstone retains archived metadata', () => {
    const snapshot = projectionToSnapshot([...base, r('deleted', ['account'], null, 'bank', 'account')], status);
    expect(snapshot.accounts).toEqual([{ ...bank, archived: true }]);
    expect(snapshot.complete).toBe(false);
    expect(balance(snapshot.accounts, snapshot.movements).bank?.minor).toBe(10000);
    expect(projectionToSnapshot([...base, r('deleted-m', ['opening-r'], null, 'opening')], status).movements).toEqual([]);
  });
  test('invalid payload, missing account and unbalanced ledger never reach totals', () => {
    expect(projectionToSnapshot([r('bad', [], { amount: 5 })], status)).toMatchObject({ complete: false, movements: [] });
    expect(projectionToSnapshot([base[1]!], status)).toMatchObject({ complete: false, movements: [] });
    const unbalanced = { ...opening, postings: [{ ...opening.postings[0]!, amount: { currency: 'NIO', minor: 3 } }, opening.postings[1]!] };
    expect(projectionToSnapshot([base[0]!, r('bad', [], unbalanced, 'opening')], status)).toMatchObject({ complete: false, movements: [] });
  });
  test('hydration, rejection, unavailable timestamp and unsupported debt are incomplete with reasons', () => {
    const report = projectionToSnapshotReport(base, { ...status, hydrated: false, rejected: 1, lastSyncedAt: undefined });
    expect(report.snapshot.complete).toBe(false);
    expect(report.reasons.length).toBeGreaterThan(0);
    const card: Account = { ...bank, id: 'card', kind: 'card' };
    expect(projectionToSnapshotReport([...base, r('card-r', [], card, card.id, 'account')], status)).toMatchObject({ snapshot: { complete: false } });
  });
  test('pending durable offline writes remain effective with count; missing durability is incomplete', () => {
    expect(projectionToSnapshot(base, { ...status, mode: 'offline', pending: 2 })).toMatchObject({ complete: true, pendingCount: 2 });
    expect(projectionToSnapshot(base, { ...status, durable: false })).toMatchObject({ complete: false });
  });
  test('recurrence clamps month end without losing requested day, suppresses confirmed occurrences', () => {
    const rule = r('rule-r', [], { id: 'rule', start: '2026-01-31', frequency: 'monthly', paused: false, reminderDaysBefore: [], template: { kind: 'expense', accountId: 'bank', categoryId: 'food', amount: { currency: 'NIO', minor: 1000 } } }, 'rule', 'recurring');
    const snapshot = projectionToSnapshot([...base, rule], { ...status, lastSyncedAt: '2026-02-01T00:00:00Z' });
    expect(snapshot.commitments.map((c) => c.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    expect(snapshot.commitments.map((c) => c.id)).toEqual(['rule:2026-01-31:0', 'rule:2026-02-28:1', 'rule:2026-03-31:2', 'rule:2026-04-30:3']);
    const confirmed = { ...expense, id: 'rule:2026-02-28:1', occurrenceId: 'rule:2026-02-28:1', date: '2026-02-28' };
    const updated = projectionToSnapshot([...base, rule, r('confirm', [], confirmed, confirmed.id)], { ...status, lastSyncedAt: '2026-02-01T00:00:00Z' });
    expect(updated.commitments.map((c) => c.dueDate)).toEqual(['2026-01-31', '2026-03-31', '2026-04-30']);
  });
  test('projection never mutates inputs and external rates are optional copied data', () => {
    const before = structuredClone(base);
    const rates = [{ nioPerUsd: '36.6243', effectiveDate: '2026-10-15', fetchedAt: at, source: 'manual' as const }];
    const snapshot = projectionToSnapshot(base, status, { rates });
    snapshot.accounts[0]!.name = 'changed';
    snapshot.rates[0]!.nioPerUsd = '1';
    expect(base).toEqual(before);
    expect(rates[0]!.nioPerUsd).toBe('36.6243');
  });
  test('explicit asOf enables pure offline projections and invalid clocks never leak invalid snapshots', () => {
    const noClock = { ...status, lastSyncedAt: undefined };
    expect(projectionToSnapshot(base, noClock, { asOf: at })).toMatchObject({ complete: true, asOf: at });
    const snapshot = projectionToSnapshot(base, status, { asOf: 'invalid' });
    expect(snapshot.complete).toBe(false);
    expect(SnapshotSchema.safeParse(snapshot).success).toBe(true);
  });
  test('archival preserves historical balances and allocation references are checked', () => {
    const archived = projectionToSnapshot([...base, r('archive', ['account'], { ...bank, archived: true }, bank.id, 'account')], status);
    expect(archived.complete).toBe(true);
    expect(balance(archived.accounts, archived.movements).bank?.minor).toBe(10000);
    expect(projectionToSnapshot([...base, r('alloc', [], { id: 'alloc', goalId: 'missing', accountId: 'bank', amount: { currency: 'NIO', minor: 1 } }, 'alloc', 'allocation')], status)).toMatchObject({ complete: false, allocations: [] });
  });
  test('occurrence overrides remain explicitly incomplete until the recurrence engine is integrated', () => {
    const report = projectionToSnapshotReport([...base, r('override-r', [], { id: 'override', occurrenceId: expense.id, action: 'skip' }, 'override', 'occurrenceOverride')], status);
    expect(report.snapshot.complete).toBe(false);
    expect(report.reasons.some((reason) => reason.includes('occurrenceOverride'))).toBe(true);
  });
  test.each(['2026-10-14', '2026-10-15', '2026-10-16', '2027-01-01'])('F01: unconfirmed obligation survives before, on and after due date at %s', (date) => {
    const rule = r('rule-r', [], { id: 'rule', start: '2026-10-15', end: '2026-10-15', frequency: 'daily', paused: false, reminderDaysBefore: [], template: { kind: 'expense', accountId: 'bank', categoryId: 'food', amount: { currency: 'NIO', minor: 1000 } } }, 'rule', 'recurring');
    const report = projectionToSnapshotReport([...base, rule], status, { asOf: `${date}T12:00:00Z` });
    expect(report.snapshot.commitments).toEqual([{ id: 'rule:2026-10-15:0', dueDate: '2026-10-15', amount: { currency: 'NIO', minor: 1000 }, paidMinor: 0, kind: 'cashExpense' }]);
    expect(report.snapshot.complete).toBe(true);
  });
  test('F01: confirmation removes exactly its overdue occurrence from an ended rule', () => {
    const rule = r('rule-r', [], { id: 'rule', start: '2026-10-15', end: '2026-10-16', frequency: 'daily', paused: false, reminderDaysBefore: [], template: { kind: 'expense', accountId: 'bank', categoryId: 'food', amount: { currency: 'NIO', minor: 1000 } } }, 'rule', 'recurring');
    const confirmed = { ...expense, id: 'rule:2026-10-15:0', occurrenceId: 'rule:2026-10-15:0', date: '2026-10-15' };
    const events = [...base, rule, r('confirm', [], confirmed, confirmed.id)];
    const report = projectionToSnapshotReport(events, status, { asOf: '2026-10-17T12:00:00Z' });
    expect(report.snapshot.commitments.map((item) => item.id)).toEqual(['rule:2026-10-16:1']);
    expect(report.snapshot.commitments[0]?.paidMinor).toBe(0);
    expect(report.snapshot.complete).toBe(true);
    const confirmedSecond = { ...expense, id: 'rule:2026-10-16:1', occurrenceId: 'rule:2026-10-16:1' };
    const fullyConfirmed = projectionToSnapshotReport([...events, r('confirm-second', [], confirmedSecond, confirmedSecond.id)], status, { asOf: '2026-10-18T12:00:00Z' });
    expect(fullyConfirmed.snapshot.commitments).toEqual([]);
    expect(fullyConfirmed.snapshot.complete).toBe(true);
  });
  test('F01: paused history cannot silently certify that overdue obligations disappeared', () => {
    const rule = r('rule-r', [], { id: 'rule', start: '2026-10-15', frequency: 'daily', paused: true, reminderDaysBefore: [], template: { kind: 'expense', accountId: 'bank', categoryId: 'food', amount: { currency: 'NIO', minor: 1000 } } }, 'rule', 'recurring');
    const report = projectionToSnapshotReport([...base, rule], status, { asOf: '2026-10-16T12:00:00Z' });
    expect(report.snapshot.complete).toBe(false);
    expect(report.reasons.length).toBeGreaterThan(0);
  });
  test('F01: bounded historical expansion reports incomplete coverage rather than asserting no pending obligations', () => {
    const rule = r('rule-r', [], { id: 'rule', start: '0001-01-01', frequency: 'daily', paused: false, reminderDaysBefore: [], template: { kind: 'expense', accountId: 'bank', categoryId: 'food', amount: { currency: 'NIO', minor: 1000 } } }, 'rule', 'recurring');
    const report = projectionToSnapshotReport([...base, rule], status);
    expect(report.snapshot.complete).toBe(false);
    expect(report.reasons.length).toBeGreaterThan(0);
    expect(report.snapshot.commitments[0]?.id).toBe('rule:0001-01-01:0');
    expect(SnapshotSchema.safeParse(report.snapshot).success).toBe(true);
  });
  test.each([
    ['daily', '9999-12-31', '9999-12-31', ['9999-12-31']],
    ['weekly', '9999-12-28', undefined, ['9999-12-28']],
    ['monthly', '9999-10-31', undefined, ['9999-10-31', '9999-11-30', '9999-12-31']],
    ['yearly', '9998-12-31', undefined, ['9998-12-31', '9999-12-31']],
  ] as const)('F02: %s recurrence retains valid final-calendar dates when +90 days crosses 9999', (frequency, start, end, dates) => {
    const rule = r('rule-r', [], { id: 'rule', start, ...(end ? { end } : {}), frequency, paused: false, reminderDaysBefore: [], template: { kind: 'expense', accountId: 'bank', categoryId: 'food', amount: { currency: 'NIO', minor: 1000 } } }, 'rule', 'recurring');
    const report = projectionToSnapshotReport([...base, rule], status, { asOf: '9999-12-30T12:00:00Z' });
    expect(report.snapshot.commitments.map((item) => item.dueDate)).toEqual(dates);
    expect(report.snapshot.complete).toBe(false);
    expect(report.reasons.length).toBeGreaterThan(0);
    expect(SnapshotSchema.safeParse(report.snapshot).success).toBe(true);
  });
  test('F02: the lower public year remains supported without 1900 adjustment', () => {
    const rule = r('rule-r', [], { id: 'rule', start: '0001-01-31', end: '0001-03-31', frequency: 'monthly', paused: false, reminderDaysBefore: [], template: { kind: 'expense', accountId: 'bank', categoryId: 'food', amount: { currency: 'NIO', minor: 1000 } } }, 'rule', 'recurring');
    const report = projectionToSnapshotReport([...base, rule], status, { asOf: '0001-01-01T12:00:00Z' });
    expect(report.snapshot.commitments.map((item) => item.dueDate)).toEqual(['0001-01-31', '0001-02-28', '0001-03-31']);
    expect(report.snapshot.complete).toBe(true);
    expect(SnapshotSchema.safeParse(report.snapshot).success).toBe(true);
  });
  test.each([
    ['daily', '2026-10-15', '2026-10-17', ['2026-10-15', '2026-10-16', '2026-10-17']],
    ['weekly', '2026-10-15', '2026-10-29', ['2026-10-15', '2026-10-22', '2026-10-29']],
    ['yearly', '2024-02-29', '2027-02-28', ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28']],
  ] as const)('recurrence frequency %s uses original date and stable ordinal', (frequency, start, end, dates) => {
    const rule = r('rule-r', [], { id: 'rule', start, end, frequency, paused: false, reminderDaysBefore: [], template: { kind: 'expense', accountId: 'bank', categoryId: 'food', amount: { currency: 'NIO', minor: 1000 } } }, 'rule', 'recurring');
    const snapshot = projectionToSnapshot([...base, rule], status, { asOf: frequency === 'yearly' ? '2027-01-01T00:00:00Z' : at });
    expect(snapshot.commitments.map((item) => item.dueDate)).toEqual(dates);
  });
});
