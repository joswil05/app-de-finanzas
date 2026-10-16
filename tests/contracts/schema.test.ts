import { describe, expect, test } from 'vitest';
import { BackupSchema, financialRevisionContent, FxRateSchema, IdSchema, InstallmentPlanSchema, LocalDateSchema, MoneySchema, MovementIntentSchema, MovementSchema, RecurringRuleSchema, RevisionSchema, SnapshotSchema, ToolCallSchema, UserProfileSchema, VerifiedSessionSchema } from '@fin/contracts';
import { fixtureRevisions, fixtureSnapshot, fixtureUser, FIXTURE_NAMES } from '@fin/testkit';

test('rechaza cantidades que no representan centavos exactos', () => {
  expect(MoneySchema.safeParse({ currency: 'NIO', minor: 1.5 }).success).toBe(false);
  expect(MoneySchema.safeParse({ currency: 'EUR', minor: 100 }).success).toBe(false);
  expect(MoneySchema.parse({ currency: 'USD', minor: 100 }).minor).toBe(100);
});

test('límites monetarios seguros y claves externas cerradas', () => {
  for (const minor of [NaN, Infinity, -Infinity, 9_000_000_000_001, -9_000_000_000_001, Number.MAX_SAFE_INTEGER + 1]) {
    expect(MoneySchema.safeParse({ currency: 'NIO', minor }).success).toBe(false);
  }
  expect(MoneySchema.safeParse({ currency: 'USD', minor: -9_000_000_000_000 }).success).toBe(true);
  expect(MoneySchema.safeParse({ currency: 'USD', minor: 1, uid: 'other' }).success).toBe(false);
});

test('fechas reales incluyendo años bisiestos y rutas prohibidas', () => {
  for (const value of ['2026-02-29', '2028-02-30', '2026-13-01', '2026-00-01', '2026-1-01', '2026-04-31', '0000-01-01']) expect(LocalDateSchema.safeParse(value).success).toBe(false);
  expect(LocalDateSchema.parse('2028-02-29')).toBe('2028-02-29');
  for (const value of ['', '.', '..', '../owner', 'a/b', 'a\\b', 'a'.repeat(129)]) expect(IdSchema.safeParse(value).success).toBe(false);
  expect(IdSchema.parse('occurrence-2028-02-29')).toBe('occurrence-2028-02-29');
});

test('sesión requiere verificación y perfil no admite privilegios', () => {
  expect(VerifiedSessionSchema.safeParse({ uid: 'user-b', emailVerified: true }).success).toBe(true);
  expect(VerifiedSessionSchema.safeParse({ uid: 'user-b', emailVerified: false }).success).toBe(false);
  expect(UserProfileSchema.safeParse({ uid: 'user-b', setupComplete: false, role: 'admin' }).success).toBe(false);
});

test('tasas decimales positivas con ocho decimales como máximo', () => {
  const fx = { effectiveDate: '2026-10-15', fetchedAt: '2026-10-15T12:00:00.000Z', source: 'BCN' };
  expect(FxRateSchema.safeParse({ ...fx, nioPerUsd: '36.6243' }).success).toBe(true);
  for (const nioPerUsd of ['0', '-1', '1e3', '1.123456789', 'Infinity', '36,62']) expect(FxRateSchema.safeParse({ ...fx, nioPerUsd }).success).toBe(false);
});

test('payload revision valida kind, identidad, padres y tamaño de notas', () => {
  const initial = fixtureRevisions('baseline').find((r) => r.kind === 'movement');
  expect(initial).toBeDefined();
  expect(RevisionSchema.safeParse(initial).success).toBe(true);
  expect(RevisionSchema.safeParse({ ...initial, kind: 'goal' }).success).toBe(false);
  expect(RevisionSchema.safeParse({ ...initial, parentIds: ['parent', 'parent'] }).success).toBe(false);
  expect(RevisionSchema.safeParse({ ...initial, parentIds: Array.from({ length: 21 }, (_, i) => `p${i}`) }).success).toBe(false);
  expect(RevisionSchema.safeParse({ ...initial, parentIds: [initial?.id] }).success).toBe(false);
  expect(RevisionSchema.safeParse({ ...initial, aggregateId: 'different' }).success).toBe(false);
  const movement = fixtureSnapshot('baseline').movements[0];
  expect(MovementSchema.safeParse({ ...movement, note: 'n'.repeat(2000) }).success).toBe(true);
  expect(MovementSchema.safeParse({ ...movement, note: 'n'.repeat(2001) }).success).toBe(false);
  expect(MovementSchema.safeParse({ ...movement, extra: true }).success).toBe(false);
});

test('intenciones incompletas requieren aclaración', () => {
  const intent = { amount: { currency: 'NIO', minor: 100 }, date: '2026-10-15', accountId: 'cash-nio' };
  expect(MovementIntentSchema.safeParse({ ...intent, kind: 'expense' }).success).toBe(false);
  expect(MovementIntentSchema.safeParse({ ...intent, kind: 'expense', categoryId: 'food' }).success).toBe(true);
  expect(MovementIntentSchema.safeParse({ ...intent, kind: 'transfer' }).success).toBe(false);
  expect(MovementIntentSchema.safeParse({ ...intent, kind: 'transfer', destinationAccountId: 'bank-usd', receivedAmount: { currency: 'USD', minor: 3 } }).success).toBe(true);
  expect(MovementIntentSchema.safeParse({ ...intent, amount: { currency: 'NIO', minor: -1 }, kind: 'expense', categoryId: 'food' }).success).toBe(false);
});

test('límites de listas y metadatos independientes del contenido financiero', () => {
  const movement = fixtureSnapshot('baseline').movements[0];
  expect(movement).toBeDefined();
  expect(MovementSchema.safeParse({ ...movement, postings: Array.from({ length: 9 }, () => movement?.postings[0]) }).success).toBe(false);
  const recurring = { id: 'monthly', start: '2026-10-15', frequency: 'monthly', template: {}, paused: false, reminderDaysBefore: [0, 1, 2, 3, 4, 5] };
  expect(RecurringRuleSchema.safeParse(recurring).success).toBe(false);
  const installment = { ordinal: 1, dueDate: '2026-10-31', amount: { currency: 'NIO', minor: 100 } };
  expect(InstallmentPlanSchema.safeParse({ id: 'plan', movementId: 'purchase', cardId: 'card', installments: Array.from({ length: 61 }, () => installment) }).success).toBe(false);
  const original = fixtureRevisions('baseline')[0];
  expect(original).toBeDefined();
  if (!original) throw new Error('Fixture vacío');
  expect(financialRevisionContent({ ...original, receivedAtServer: '2026-10-16T12:00:00.000Z' })).toEqual(original);
  expect(original.receivedAtServer).toBeUndefined();
});

test('herramientas cerradas no aceptan destino UID ni comandos arbitrarios', () => {
  expect(ToolCallSchema.safeParse({ id: 'call', name: 'summary', args: { through: '2026-10-31' } }).success).toBe(true);
  expect(ToolCallSchema.safeParse({ id: 'call', name: 'summary', args: { through: '2026-10-31', uid: 'other-test' } }).success).toBe(false);
  expect(ToolCallSchema.safeParse({ id: 'call', name: 'setBalance', args: {} }).success).toBe(false);
  expect(ToolCallSchema.safeParse({ id: 'call', name: 'expenses', args: { from: '2026-10-31', to: '2026-10-01' } }).success).toBe(false);
});

describe('datos ficticios coherentes', () => {
  for (const name of FIXTURE_NAMES) test(name, () => {
    const snapshot = fixtureSnapshot(name);
    expect(SnapshotSchema.safeParse(snapshot).success).toBe(true);
    for (const revision of fixtureRevisions(name)) expect(RevisionSchema.safeParse(revision).success).toBe(true);
    for (const movement of snapshot.movements) {
      for (const currency of ['NIO', 'USD']) expect(movement.postings.filter((p) => p.amount.currency === currency).reduce((sum, p) => sum + p.amount.minor, 0)).toBe(0);
      for (const posting of movement.postings) expect(snapshot.accounts.some((a) => a.id === posting.accountId && a.currency === posting.amount.currency)).toBe(true);
    }
  });
  test('baseline V10 y cada llamada obtiene datos independientes', () => {
    const snapshot = fixtureSnapshot('baseline');
    const cash = snapshot.movements.flatMap((m) => m.postings).filter((p) => p.accountId === 'cash-nio').reduce((sum, p) => sum + p.amount.minor, 0);
    expect(cash).toBe(1_200_000);
    expect(snapshot.allocations[0]?.amount.minor).toBe(200_000);
    expect(snapshot.commitments[0]?.amount.minor).toBe(500_000);
    snapshot.accounts.length = 0;
    expect(fixtureSnapshot('baseline').accounts.length).toBeGreaterThan(0);
  });
  test('usuarios independientes reutilizan IDs sin copiar namespace', () => {
    const a = fixtureUser('owner-test');
    const b = fixtureUser('other-test');
    expect(a.session.uid).not.toBe(b.session.uid);
    expect(a.revisions[0]?.id).toBe(b.revisions[0]?.id);
    expect(BackupSchema.parse(a.backup).ownerUid).toBe(a.session.uid);
    expect(b.backup.ownerUid).toBe(b.session.uid);
    a.snapshot.accounts.length = 0;
    expect(b.snapshot.accounts.length).toBeGreaterThan(0);
  });
});
