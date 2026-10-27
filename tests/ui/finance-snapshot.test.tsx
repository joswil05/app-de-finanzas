import { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { MAX_MINOR, type Account, type Category, type Favorite, type Movement, type Revision, type RevisionRepository, type SyncStatus, type UserSettings } from '@fin/contracts';
import { FinanceProvider, useSnapshot, type FinanceView } from '../../apps/web/src/data/use-snapshot';
import type { SessionController, SessionView } from '../../apps/web/src/features/auth/session';

const instant = '2026-10-18T12:00:00Z';
const now = () => instant;
const synced: SyncStatus = { mode: 'synced', hydrated: true, durable: true, pending: 0, rejected: 0 };
const account: Account = { id: 'cash', name: 'Mi efectivo', kind: 'cash', currency: 'NIO', archived: false };
const category: Category = { id: 'food', name: 'Alimentación', flowKind: 'expense', archived: false };
const favorite: Favorite = { id: 'lunch', name: 'Almuerzo', template: { kind: 'expense', amount: { currency: 'NIO', minor: 25000 }, accountId: 'cash', categoryId: 'food' } };
const settings: UserSettings = { summaryCurrency: 'NIO', timezone: 'America/Managua', locale: 'es-NI', fxMode: 'automatic', hidePushAmounts: true, notificationsEnabled: false, assistantConsent: false };
const opening: Movement = { id: 'opening', date: '2026-10-18', kind: 'opening', postings: [{ accountId: 'cash', amount: { currency: 'NIO', minor: 100000 } }, { accountId: 'sys-equity-NIO', amount: { currency: 'NIO', minor: -100000 } }], flows: [] };
function revision(kind: Revision['kind'], aggregateId: string, payload: unknown, id = `${aggregateId}-root`, parentIds: string[] = []): Revision {
  return { schemaVersion: 1, kind, aggregateId, payload, id, parentIds, deviceId: 'phone', createdAtClient: instant };
}
const records = () => [revision('account', 'cash', account), revision('movement', 'opening', opening), revision('category', 'food', category), revision('favorite', 'lunch', favorite), revision('settings', 'settings', settings)];

/** External stream boundary: no Firebase and no replacement for the real projector. */
class StreamRepository implements RevisionRepository {
  listeners = new Set<(revisions: Revision[], status: SyncStatus) => void>();
  oldListeners: ((revisions: Revision[], status: SyncStatus) => void)[] = [];
  revisions: Revision[] = []; status: SyncStatus = { ...synced, hydrated: false, mode: 'syncing' };
  publish(revisions: Revision[], status: SyncStatus = synced) { this.revisions = revisions; this.status = status; for (const listener of this.listeners) listener(revisions, status); }
  subscribe(listener: (revisions: Revision[], status: SyncStatus) => void) { this.listeners.add(listener); this.oldListeners.push(listener); listener(this.revisions, this.status); return () => { this.listeners.delete(listener); }; }
  async append(): Promise<never> { throw new Error('The read bridge must not append.'); }
  async retry(): Promise<never> { throw new Error('The read bridge must not retry.'); }
  async exportPending(): Promise<Revision[]> { return []; }
  async close(): Promise<never> { throw new Error('SessionController owns the repository.'); }
}
function owner(repository: RevisionRepository | null = new StreamRepository(), uid = 'alice') {
  let view: SessionView = { ready: true, user: { uid, emailVerified: true } as User, profile: { uid, setupComplete: true }, locked: false, blocked: false, error: null, persistence: 'persistent' };
  const listeners = new Set<() => void>();
  const boundary = { repository, deviceId: 'phone', getSnapshot: () => view, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
  return { controller: boundary as unknown as SessionController, change(patch: Partial<SessionView>, repo: RevisionRepository | null = boundary.repository) { view = { ...view, ...patch }; boundary.repository = repo; for (const listener of listeners) listener(); }, listeners };
}
function observe() {
  const state: { value?: FinanceView; renders: FinanceView[] } = { renders: [] };
  function Probe() { const value = useSnapshot(); state.value = value; state.renders.push(value); return <output data-testid="finance">{value.uid}:{value.snapshot.complete ? 'complete' : 'incomplete'}:{value.snapshot.accounts.map((item) => item.name).join(',')}</output>; }
  return { state, Probe };
}
afterEach(() => vi.useRealTimers());

describe('FinanceProvider stream projection', () => {
  it('keeps hydration honestly incomplete, then projects all financial and metadata data from one stream', () => {
    const repository = new StreamRepository(); const { controller } = owner(repository); const { state, Probe } = observe();
    render(<FinanceProvider controller={controller} now={now}><Probe /></FinanceProvider>);
    expect(state.value!.snapshot.complete).toBe(false); expect(state.value!.reasons.join(' ')).toMatch(/hidratado/u);
    act(() => repository.publish(records()));
    expect(state.value).toMatchObject({ uid: 'alice', deviceId: 'phone', snapshot: { complete: true, asOf: instant, movements: [opening], accounts: [account], rates: [] }, categories: [category], favorites: [favorite], settings, reasons: [], status: synced });
    expect(state.value!.repository).toBe(repository); expect(state.value!.revisions).toHaveLength(5); expect(state.value!.heads).toHaveLength(5);
  });
  it('updates local pending and remote ACK states without writing or claiming sync early', () => {
    const repository = new StreamRepository(); const { controller } = owner(repository); const { state, Probe } = observe();
    render(<FinanceProvider controller={controller} now={now}><Probe /></FinanceProvider>);
    act(() => repository.publish(records(), { ...synced, mode: 'offline', pending: 2 }));
    expect(state.value).toMatchObject({ snapshot: { complete: true, pendingCount: 2 }, status: { mode: 'offline', pending: 2 } });
    act(() => repository.publish(records(), { ...synced, lastSyncedAt: instant }));
    expect(state.value).toMatchObject({ snapshot: { pendingCount: 0 }, status: { mode: 'synced', lastSyncedAt: instant } });
    act(() => repository.publish(records(), { ...synced, mode: 'error', rejected: 1 }));
    expect(state.value!.snapshot.complete).toBe(false); expect(state.value!.snapshot.movements).toHaveLength(1); expect(state.value!.reasons.join(' ')).toMatch(/rechazadas/u);
  });
  it('retains effective metadata ancestors in a conflict and never selects by timestamp', () => {
    const repository = new StreamRepository(); const { controller } = owner(repository); const { state, Probe } = observe();
    render(<FinanceProvider controller={controller} now={now}><Probe /></FinanceProvider>);
    const branches = [revision('category', 'food', { ...category, name: 'Rama A' }, 'branch-a', ['food-root']), { ...revision('category', 'food', { ...category, name: 'Rama B' }, 'branch-b', ['food-root']), createdAtClient: '2099-01-01T00:00:00Z' }];
    act(() => repository.publish([...records(), ...branches]));
    expect(state.value!.categories).toEqual([category]); expect(state.value!.snapshot.complete).toBe(false);
    expect(state.value!.snapshot.conflictAggregateIds).toEqual(['food']); expect(state.value!.reasons.join(' ')).toMatch(/conflict/u);
    act(() => repository.publish([...records(), ...branches, revision('category', 'food', { ...category, name: 'Resuelta' }, 'resolution', ['branch-a', 'branch-b'])]));
    expect(state.value!.categories[0]!.name).toBe('Resuelta'); expect(state.value!.snapshot.complete).toBe(true);
  });
  it('excludes missing-parent, invalid and tombstoned metadata', () => {
    const repository = new StreamRepository(); const { controller } = owner(repository); const { state, Probe } = observe();
    render(<FinanceProvider controller={controller} now={now}><Probe /></FinanceProvider>);
    act(() => repository.publish([revision('category', 'food', category, 'orphan', ['unseen']), revision('favorite', 'lunch', { ...favorite, template: { kind: 'delete' } }), revision('settings', 'settings', settings), revision('settings', 'settings', null, 'settings-deleted', ['settings-root'])]));
    expect(state.value!.categories).toEqual([]); expect(state.value!.favorites).toEqual([]); expect(state.value!.settings).toBeNull();
    expect(state.value!.snapshot.complete).toBe(false); expect(state.value!.reasons.join(' ')).toMatch(/missingParents|inválido/u);
  });
  it('does not publish a valid-looking metadata head if its history contains an invalid payload', () => {
    const repository = new StreamRepository(); const { controller } = owner(repository); const { state, Probe } = observe();
    render(<FinanceProvider controller={controller} now={now}><Probe /></FinanceProvider>);
    act(() => repository.publish([revision('category', 'food', { ...category, archived: 'no' }), revision('category', 'food', category, 'fixed', ['food-root'])]));
    expect(state.value!.categories).toEqual([]); expect(state.value!.snapshot.complete).toBe(false);
  });
  it('uses a manual real rate only from effective settings, automatic mode stays empty', () => {
    const repository = new StreamRepository(); const { controller } = owner(repository); const { state, Probe } = observe();
    const manualRate = { nioPerUsd: '36.72', effectiveDate: '2026-10-18', fetchedAt: instant, source: 'manual' };
    render(<FinanceProvider controller={controller} now={now}><Probe /></FinanceProvider>);
    act(() => repository.publish([revision('settings', 'settings', { ...settings, fxMode: 'manual', manualRate })]));
    expect(state.value!.snapshot.rates).toEqual([manualRate]);
    act(() => repository.publish([revision('settings', 'settings', { ...settings, manualRate })]));
    expect(state.value!.snapshot.rates).toEqual([]);
  });
  it('makes multiple settings aggregates explicitly incomplete instead of choosing a winner', () => {
    const repository = new StreamRepository(); const { controller } = owner(repository); const { state, Probe } = observe();
    render(<FinanceProvider controller={controller} now={now}><Probe /></FinanceProvider>);
    act(() => repository.publish([revision('settings', 'one', settings), { ...revision('settings', 'two', { ...settings, summaryCurrency: 'USD' }), createdAtClient: '2099-01-01T00:00:00Z' }]));
    expect(state.value!.settings).toBeNull(); expect(state.value!.snapshot.complete).toBe(false); expect(state.value!.reasons.length).toBeGreaterThan(0);
  });
  it('propagates unknown account references and overflow as incomplete, not an authoritative zero', () => {
    const repository = new StreamRepository(); const { controller } = owner(repository); const { state, Probe } = observe();
    render(<FinanceProvider controller={controller} now={now}><Probe /></FinanceProvider>);
    act(() => repository.publish([revision('movement', 'opening', opening)]));
    expect(state.value!.snapshot.complete).toBe(false); expect(state.value!.reasons.join(' ')).toMatch(/sin cuenta/u);
    const large: Movement = { ...opening, postings: opening.postings.map((posting) => ({ ...posting, amount: { currency: 'NIO', minor: posting.amount.minor > 0 ? MAX_MINOR : -MAX_MINOR } })) };
    act(() => repository.publish([revision('account', 'cash', account), revision('movement', 'opening', large), revision('movement', 'other', { ...opening, id: 'other' })]));
    expect(state.value!.snapshot.complete).toBe(false); expect(state.value!.reasons.join(' ')).toMatch(/límites/u); expect(state.value!.revisions).toHaveLength(3);
  });
  it('keeps cached view identity across rerenders and token refreshes of the same owner', () => {
    const repository = new StreamRepository(); repository.publish(records()); const session = owner(repository); const { state, Probe } = observe();
    const tree = () => <FinanceProvider controller={session.controller} now={now}><Probe /></FinanceProvider>;
    const mounted = render(tree()); const first = state.value;
    mounted.rerender(tree()); expect(state.value).toBe(first);
    act(() => session.change({ user: { uid: 'alice', emailVerified: true } as User })); expect(state.value).toBe(first);
  });
  it('owns one live stream under StrictMode and ignores late callbacks after unmount', () => {
    const repository = new StreamRepository(); repository.publish(records()); const session = owner(repository); const { state, Probe } = observe();
    const mounted = render(<StrictMode><FinanceProvider controller={session.controller} now={now}><Probe /></FinanceProvider></StrictMode>);
    expect(repository.listeners.size).toBe(1); const previous = state.value;
    mounted.unmount(); expect(repository.listeners.size).toBe(0); expect(session.listeners.size).toBe(0);
    act(() => { for (const listener of repository.oldListeners) listener([], synced); });
    expect(state.value).toBe(previous);
  });
  it('hides data synchronously on lock and rebuilds an unhydrated view on unlock', () => {
    const repository = new StreamRepository(); repository.publish(records()); const session = owner(repository); const { state, Probe } = observe();
    render(<FinanceProvider controller={session.controller} now={now}><Probe /></FinanceProvider>);
    act(() => session.change({ locked: true })); expect(screen.queryByTestId('finance')).toBeNull(); expect(repository.listeners.size).toBe(0);
    repository.publish([], { ...synced, hydrated: false, mode: 'syncing' });
    act(() => session.change({ locked: false })); expect(state.value!.snapshot.complete).toBe(false); expect(state.value!.snapshot.accounts).toEqual([]);
  });
  it('changes UID and repository without exposing any frame from the previous owner', () => {
    const alice = new StreamRepository(); alice.publish(records()); const bob = new StreamRepository(); const session = owner(alice); const { state, Probe } = observe();
    render(<FinanceProvider controller={session.controller} now={now}><Probe /></FinanceProvider>);
    const oldCount = state.renders.length;
    act(() => session.change({ user: { uid: 'bob', emailVerified: true } as User, profile: { uid: 'bob', setupComplete: true } }, bob));
    expect(screen.getByTestId('finance').textContent).toBe('bob:incomplete:');
    expect(state.renders.slice(oldCount).every((view) => view.uid === 'bob' && view.snapshot.accounts.length === 0)).toBe(true);
    expect(alice.listeners.size).toBe(0); expect(bob.listeners.size).toBe(1);
    act(() => { for (const listener of alice.oldListeners) listener(records(), synced); });
    expect(state.value!.uid).toBe('bob'); expect(state.value!.snapshot.accounts).toEqual([]);
    act(() => bob.publish([revision('account', 'cash', { ...account, name: 'Solo Bob' })]));
    expect(screen.getByTestId('finance').textContent).toBe('bob:complete:Solo Bob');
  });
  it.each([{ user: null }, { ready: false }, { blocked: true }, { locked: true }, { profile: null }, { user: { uid: 'alice', emailVerified: false } as User }])('does not expose a stream without session authorization (%j)', (patch) => {
    const repository = new StreamRepository(); repository.publish(records()); const session = owner(repository); session.change(patch); const { Probe } = observe();
    render(<FinanceProvider controller={session.controller} now={now}><Probe /></FinanceProvider>);
    expect(screen.queryByTestId('finance')).toBeNull(); expect(repository.listeners.size).toBe(0);
  });
  it('a missing repository never produces a confirmed empty book', () => {
    const session = owner(null); const { Probe } = observe();
    render(<FinanceProvider controller={session.controller} now={now}><Probe /></FinanceProvider>);
    expect(screen.queryByTestId('finance')).toBeNull();
  });
  it('refreshes the explicit clock every minute and releases its timer on unmount', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(instant));
    const repository = new StreamRepository(); repository.publish(records()); const session = owner(repository); const { state, Probe } = observe();
    const clock = () => new Date().toISOString();
    const mounted = render(<FinanceProvider controller={session.controller} now={clock}><Probe /></FinanceProvider>);
    expect(state.value!.snapshot.asOf).toBe('2026-10-18T12:00:00.000Z');
    act(() => vi.advanceTimersByTime(60000)); expect(state.value!.snapshot.asOf).toBe('2026-10-18T12:01:00.000Z');
    mounted.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('uses a current explicit clock by default and preserves invalid-clock diagnostics', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(instant));
    const repository = new StreamRepository(); repository.publish(records()); const session = owner(repository); const { state, Probe } = observe();
    const mounted = render(<FinanceProvider controller={session.controller}><Probe /></FinanceProvider>);
    expect(state.value!.snapshot.asOf).toBe('2026-10-18T12:00:00.000Z');
    mounted.rerender(<FinanceProvider controller={session.controller} now={() => 'invalid'}><Probe /></FinanceProvider>);
    expect(state.value!.snapshot.complete).toBe(false); expect(state.value!.reasons.join(' ')).toMatch(/fecha explícita/u);
  });
  it('requires a provider instead of inventing an unowned snapshot', () => {
    const { Probe } = observe(); expect(() => render(<Probe />)).toThrow(/FinanceProvider/u);
  });
});
