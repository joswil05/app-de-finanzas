import { AccountSchema, AllocationSchema, BudgetRuleSchema, FxRateSchema, GoalSchema, IsoTimestampSchema, MovementSchema, RecurringRuleSchema, RevisionSchema, SyncStatusSchema, type Account, type Commitment, type FxRate, type Head, type Id, type RecurringRule, type Revision, type Snapshot, type SyncStatus } from '@fin/contracts';
import { accountRegistry, balance } from './ledger';
import { projectHeads } from './revisions';

export type ProjectionOptions = { rates?: FxRate[]; asOf?: string };
export type ProjectionReport = { snapshot: Snapshot; reasons: string[] };
const epoch = '1970-01-01T00:00:00Z';
const dayMs = 86_400_000;
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** Strict Snapshot-compatible facade. Consumers needing diagnostics use projectionToSnapshotReport. */
export function projectionToSnapshot(revisions: Revision[], status: SyncStatus, options: ProjectionOptions = {}): Snapshot {
  return projectionToSnapshotReport(revisions, status, options).snapshot;
}

/** Stable, conservative baseline adapter. UID ownership is enforced by the repository/session. */
export function projectionToSnapshotReport(revisions: Revision[], status: SyncStatus, options: ProjectionOptions = {}): ProjectionReport {
  const reasons = new Set<string>();
  const asOf = options.asOf ?? status.lastSyncedAt ?? epoch;
  const validTime = IsoTimestampSchema.safeParse(asOf).success;
  if (!validTime || (options.asOf === undefined && status.lastSyncedAt === undefined)) reasons.add('Falta una fecha explícita para la proyección.');
  if (!SyncStatusSchema.safeParse(status).success) reasons.add('Estado de sincronización inválido.');
  if (!status.hydrated) reasons.add('Historial todavía no hidratado.');
  if (!status.durable) reasons.add('Persistencia local no disponible.');
  if (status.rejected > 0 || status.mode === 'error') reasons.add('Hay revisiones rechazadas o un error de sincronización.');
  const snapshot: Snapshot = { accounts: [], movements: [], goals: [], allocations: [], commitments: [], budgetRules: [], rates: [], asOf: validTime ? asOf : epoch, complete: false, pendingCount: Number.isSafeInteger(status.pending) && status.pending >= 0 ? status.pending : 0, conflictAggregateIds: [] };
  for (const rate of options.rates ?? []) {
    const parsed = FxRateSchema.safeParse(rate);
    if (parsed.success) snapshot.rates.push(parsed.data);
    else reasons.add('Tasa de cambio externa inválida.');
  }
  snapshot.rates.sort((a, b) => compare(a.effectiveDate, b.effectiveDate) || compare(a.fetchedAt, b.fetchedAt) || compare(a.nioPerUsd, b.nioPerUsd));
  const invalidPayloads = new Set(revisions.filter((revision) => !RevisionSchema.safeParse(revision).success).map((revision) => revision.aggregateId));
  const byAggregate = new Map<Id, Revision[]>();
  for (const revision of revisions) byAggregate.set(revision.aggregateId, [...(byAggregate.get(revision.aggregateId) ?? []), revision]);
  const candidates: { kind: Revision['kind']; value: unknown; aggregateId: Id }[] = [];
  for (const head of projectHeads(revisions)) {
    if (head.state !== 'resolved') {
      reasons.add(`Agregado ${head.aggregateId}: ${head.state}.`);
      if (head.state === 'conflict') snapshot.conflictAggregateIds.push(head.aggregateId);
    }
    if (invalidPayloads.has(head.aggregateId)) { reasons.add(`Payload inválido: ${head.aggregateId}.`); continue; }
    if (head.state === 'invalid' || head.state === 'missingParents') continue;
    const events = byAggregate.get(head.aggregateId)!;
    const kind = events[0]!.kind;
    if (head.value !== null) candidates.push({ kind, value: head.value, aggregateId: head.aggregateId });
    else if (kind === 'account') {
      // Account deletion is prohibited for referenced history. Retain reconstructible metadata.
      const restored = accountBeforeTombstone(events, head);
      if (restored) candidates.push({ kind, value: { ...restored, archived: true }, aggregateId: head.aggregateId });
      reasons.add(`Cuenta anulada: ${head.aggregateId}; se requiere archivo explícito y revisar referencias.`);
    }
  }
  const recurring: RecurringRule[] = [];
  for (const candidate of candidates) {
    switch (candidate.kind) {
      case 'account': {
        const account = AccountSchema.parse(candidate.value);
        try { accountRegistry([account]); snapshot.accounts.push(account); } catch { reasons.add(`Cuenta inválida: ${candidate.aggregateId}.`); }
        break;
      }
      case 'goal': snapshot.goals.push(GoalSchema.parse(candidate.value)); break;
      case 'budget': snapshot.budgetRules.push(BudgetRuleSchema.parse(candidate.value)); break;
      case 'recurring': recurring.push(RecurringRuleSchema.parse(candidate.value)); break;
      // These metadata aggregates are valid but have no independent balance effect.
      case 'category': case 'favorite': case 'settings': break;
      case 'movement': case 'allocation': break; // References are checked after accounts/goals exist.
      default: reasons.add(`Proyección pendiente del módulo ${candidate.kind}: ${candidate.aggregateId}.`);
    }
  }
  if (snapshot.accounts.some((account) => account.kind === 'card' || account.kind === 'loanPayable' || account.kind === 'loanReceivable')) reasons.add('Falta integrar vencimientos y pagos de tarjetas/préstamos.');
  for (const candidate of candidates) {
    if (candidate.kind === 'movement') {
      const movement = MovementSchema.parse(candidate.value);
      try { balance(snapshot.accounts, [movement]); snapshot.movements.push(movement); }
      catch { reasons.add(`Movimiento financieramente inválido o sin cuenta: ${candidate.aggregateId}.`); }
    } else if (candidate.kind === 'allocation') {
      const allocation = AllocationSchema.parse(candidate.value);
      const account = snapshot.accounts.find((item) => item.id === allocation.accountId);
      const goal = snapshot.goals.find((item) => item.id === allocation.goalId);
      if (!account || !goal || account.currency !== allocation.amount.currency || goal.target.currency !== allocation.amount.currency || (account.kind !== 'cash' && account.kind !== 'bank')) reasons.add(`Asignación sin referencias compatibles: ${candidate.aggregateId}.`);
      else snapshot.allocations.push(allocation);
    }
  }
  try { balance(snapshot.accounts, snapshot.movements); }
  catch { snapshot.movements = []; reasons.add('El libro acumulado supera los límites financieros; se excluyen movimientos.'); }
  if (validTime && (options.asOf !== undefined || status.lastSyncedAt !== undefined)) {
    const confirmed = new Set(snapshot.movements.flatMap((movement) => movement.occurrenceId ? [movement.occurrenceId] : []));
    for (const rule of recurring) snapshot.commitments.push(...recurringCommitments(rule, snapshot.asOf, snapshot.accounts, confirmed, reasons));
  }
  snapshot.commitments.sort((a, b) => compare(a.dueDate, b.dueDate) || compare(a.id, b.id));
  snapshot.complete = reasons.size === 0;
  return { snapshot, reasons: [...reasons].sort(compare) };
}

function accountBeforeTombstone(events: Revision[], head: Head<unknown>): Account | undefined {
  const byId = new Map(events.map((event) => [event.id, event]));
  const visit = [...head.headIds];
  const excluded = new Set<Id>();
  while (visit.length) {
    const event = byId.get(visit.pop()!);
    if (event?.payload === null && !excluded.has(event.id)) { excluded.add(event.id); visit.push(...event.parentIds); }
  }
  const retained = events.filter((event) => !excluded.has(event.id));
  const previous = projectHeads(retained)[0];
  const parsed = AccountSchema.safeParse(previous?.value);
  return parsed.success ? parsed.data : undefined;
}

function dateAt(start: string, frequency: RecurringRule['frequency'], ordinal: number): string {
  const origin = new Date(`${start}T00:00:00Z`);
  if (frequency === 'daily' || frequency === 'weekly') return new Date(origin.getTime() + ordinal * dayMs * (frequency === 'weekly' ? 7 : 1)).toISOString().slice(0, 10);
  const year = origin.getUTCFullYear() + (frequency === 'yearly' ? ordinal : Math.floor((origin.getUTCMonth() + ordinal) / 12));
  const month = frequency === 'yearly' ? origin.getUTCMonth() : (origin.getUTCMonth() + ordinal) % 12;
  const target = new Date(0);
  target.setUTCFullYear(year, month + 1, 0);
  const day = Math.min(origin.getUTCDate(), target.getUTCDate());
  target.setUTCFullYear(year, month, day);
  return target.toISOString().slice(0, 10);
}

/** Baseline T09 adapter: cash expenses only, bounded inclusive 90-day window. No paid amounts invented. */
function recurringCommitments(rule: RecurringRule, asOf: string, accounts: Account[], confirmed: Set<Id>, reasons: Set<string>): Commitment[] {
  if (rule.paused) return [];
  const today = new Date(asOf).toISOString().slice(0, 10);
  const through = new Date(new Date(`${today}T00:00:00Z`).getTime() + 90 * dayMs).toISOString().slice(0, 10);
  if (rule.start > through || (rule.end && rule.end < today)) return [];
  if (rule.template.kind === 'income') return [];
  const amount = rule.template.amount;
  const account = accounts.find((item) => item.id === rule.template.accountId);
  if (rule.template.kind !== 'expense' || !amount || !account || (account.kind !== 'cash' && account.kind !== 'bank') || account.currency !== amount.currency || !rule.template.categoryId) {
    reasons.add(`Plantilla recurrente no proyectable: ${rule.id}.`);
    return [];
  }
  // Jump near the current window, preserving ordinal from the original requested start date.
  const start = new Date(`${rule.start}T00:00:00Z`);
  const current = new Date(`${today}T00:00:00Z`);
  let ordinal = rule.frequency === 'daily' || rule.frequency === 'weekly'
    ? Math.max(0, Math.floor((current.getTime() - start.getTime()) / dayMs / (rule.frequency === 'weekly' ? 7 : 1)) - 1)
    : Math.max(0, (current.getUTCFullYear() - start.getUTCFullYear()) * (rule.frequency === 'monthly' ? 12 : 1) + (rule.frequency === 'monthly' ? current.getUTCMonth() - start.getUTCMonth() : 0) - 1);
  const result: Commitment[] = [];
  for (;;) {
    const date = dateAt(rule.start, rule.frequency, ordinal);
    if (date > through || (rule.end && date > rule.end)) break;
    const id = `${rule.id}:${date}:${ordinal}`;
    if (id.length > 128) { reasons.add(`ID de ocurrencia supera el límite: ${rule.id}.`); break; }
    if (date >= today && !confirmed.has(id)) result.push({ id, dueDate: date, amount: { ...amount }, paidMinor: 0, kind: 'cashExpense' });
    ordinal++;
  }
  return result;
}
