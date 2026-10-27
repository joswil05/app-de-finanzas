import { createContext, createElement, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { CategorySchema, FavoriteSchema, RevisionSchema, UserSettingsSchema, type Category, type Favorite, type Head, type Revision, type RevisionRepository, type Snapshot, type SyncStatus, type UserSettings } from '@fin/contracts';
import { projectHeads, projectionToSnapshotReport } from '@fin/domain';
import type { SessionController, SessionView } from '../features/auth/session';

export type FinanceView = { uid: string; deviceId: string; repository: RevisionRepository; snapshot: Snapshot; status: SyncStatus; revisions: Revision[]; heads: Head<unknown>[]; categories: Category[]; favorites: Favorite[]; settings: UserSettings | null; reasons: string[] };
const FinanceContext = createContext<FinanceView | null>(null);
const currentTime = () => new Date().toISOString();
const initialStatus: SyncStatus = { mode: 'syncing', pending: 0, rejected: 0, hydrated: false, durable: false };
type ProviderProps = { controller: SessionController; children: ReactNode; now?: () => string };
type Owner = { controller: SessionController; repository: RevisionRepository; uid: string; deviceId: string; now: () => string };

function authorized(session: SessionView): boolean {
  return session.ready && !session.locked && !session.blocked && session.user?.emailVerified === true && session.profile?.uid === session.user.uid && session.profile.setupComplete;
}

/** Mount behind the auth/PIN/setup guards. The wrapper must explain an unavailable repository. */
export function FinanceProvider({ controller, children, now = currentTime }: ProviderProps): ReactNode {
  const session = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const repository = controller.repository;
  if (!authorized(session) || !repository || !session.user) return null;
  // Remount the projection boundary before any child of a different owner can read its context.
  return createElement(OwnerFinanceProvider, { key: session.user.uid, controller, repository, uid: session.user.uid, deviceId: controller.deviceId, now, children });
}

function OwnerFinanceProvider({ children, ...owner }: Owner & { children: ReactNode }): ReactNode {
  const { controller, repository, uid, deviceId, now } = owner;
  const stream = useMemo(() => financeStream({ controller, repository, uid, deviceId, now }), [controller, repository, uid, deviceId, now]);
  const view = useSyncExternalStore(stream.subscribe, stream.getSnapshot, stream.getSnapshot);
  return createElement(FinanceContext.Provider, { value: view }, children);
}

export function useSnapshot(): FinanceView {
  const view = useContext(FinanceContext);
  if (!view) throw new Error('useSnapshot requiere un FinanceProvider con sesión autorizada.');
  return view;
}

/** One cached external-store view: no render-time subscriptions or financial side effects. */
function financeStream(owner: Owner) {
  let view = deriveView(owner, [], { ...initialStatus });
  const stillAuthorized = () => {
    const session = owner.controller.getSnapshot();
    return authorized(session) && session.user?.uid === owner.uid && owner.controller.repository === owner.repository;
  };
  return {
    getSnapshot: () => view,
    subscribe(listener: () => void): () => void {
      let active = true;
      let stop: (() => void) | undefined;
      const receive = (revisions: Revision[], status: SyncStatus) => {
        if (!active || !stillAuthorized()) return;
        view = deriveView(owner, structuredClone(revisions), { ...status });
        listener();
      };
      // The repository may deliver synchronously; every subscription owns its callback lifetime.
      try { stop = owner.repository.subscribe(receive); }
      catch {
        view = deriveView(owner, [], { ...initialStatus, mode: 'error' });
        view.reasons.push('Historial no disponible. Volvé a abrir tu sesión.');
        listener();
      }
      const timer = setInterval(() => receive(view.revisions, view.status), 60_000);
      return () => { active = false; clearInterval(timer); stop?.(); };
    },
  };
}

function deriveView(owner: Owner, revisions: Revision[], status: SyncStatus): FinanceView {
  const heads = projectHeads(revisions);
  const invalidAggregates = new Set(revisions.filter((revision) => !RevisionSchema.safeParse(revision).success).map((revision) => revision.aggregateId));
  const kinds = new Map(revisions.map((revision) => [revision.aggregateId, revision.kind]));
  const categories: Category[] = [];
  const favorites: Favorite[] = [];
  const settingsCandidates: UserSettings[] = [];
  for (const head of heads) {
    // Match the canonical projection: conflicts may expose their common effective ancestor.
    if (invalidAggregates.has(head.aggregateId) || head.state === 'invalid' || head.state === 'missingParents' || head.value === null) continue;
    switch (kinds.get(head.aggregateId)) {
      case 'category': { const parsed = CategorySchema.safeParse(head.value); if (parsed.success) categories.push(parsed.data); break; }
      case 'favorite': { const parsed = FavoriteSchema.safeParse(head.value); if (parsed.success) favorites.push(parsed.data); break; }
      case 'settings': { const parsed = UserSettingsSchema.safeParse(head.value); if (parsed.success) settingsCandidates.push(parsed.data); break; }
    }
  }
  const settings = settingsCandidates.length === 1 ? settingsCandidates[0]! : null;
  // Automatic rates enter through the authenticated rate service in T18; never seed demo rates.
  const rates = settings?.fxMode === 'manual' && settings.manualRate ? [settings.manualRate] : [];
  const { snapshot, reasons } = projectionToSnapshotReport(revisions, status, { asOf: owner.now(), rates });
  if (settingsCandidates.length > 1) { snapshot.complete = false; reasons.push('Hay varios ajustes efectivos; resolvé su identidad antes de usarlos.'); }
  return { uid: owner.uid, deviceId: owner.deviceId, repository: owner.repository, snapshot, status, revisions, heads, categories, favorites, settings, reasons };
}
