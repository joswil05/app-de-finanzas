import { beforeAuthStateChanged, createUserWithEmailAndPassword, EmailAuthProvider, getIdTokenResult, GoogleAuthProvider, linkWithCredential, linkWithPopup, onIdTokenChanged, reauthenticateWithCredential, reauthenticateWithPopup, reload, sendEmailVerification, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, runTransaction, terminate } from 'firebase/firestore';
import { UserProfileSchema, type RevisionRepository, type UserProfile, type VerifiedSession } from '@fin/contracts';
import type { FirebaseRuntime } from '../../data/firebase';
import { IndexedDbOutbox } from '../../data/outbox';
import { createRevisionRepository } from '../../data/firestore-repository';
import { closeSession, loadSessionOwnerGuard, type SessionOwnerGuard, SessionTabCoordinator } from '../../data/session-cleanup';
import { AUTO_LOCK_MS, deviceIdentity, LocalPinLock } from '../security/local-lock';
import { authError } from './errors';

export type SessionView = { ready: boolean; user: User | null; profile: UserProfile | null; locked: boolean; error: string | null; blocked: boolean; persistence: 'checking' | 'persistent' | 'unavailable' };
export class SessionController {
  private view: SessionView = { ready: false, user: null, profile: null, locked: false, error: null, blocked: false, persistence: 'checking' };
  private listeners = new Set<() => void>();
  private generation = 0;
  private pin: LocalPinLock | null = null;
  private owner: SessionOwnerGuard | null = null;
  private outbox: IndexedDbOutbox | null = null;
  repository: RevisionRepository | null = null;
  private closing = false;
  private lastActivity = Date.now();
  private coordinator: SessionTabCoordinator | null = null;
  private stopAuth: (() => void) | null = null;
  private stopBeforeAuth: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  readonly deviceId: string;
  constructor(readonly runtime: FirebaseRuntime) { this.deviceId = deviceIdentity(); }
  getSnapshot = (): SessionView => this.view;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private update(patch: Partial<SessionView>) { this.view = { ...this.view, ...patch }; for (const listener of this.listeners) listener(); }
  start(): () => void {
    this.stopBeforeAuth = beforeAuthStateChanged(this.runtime.auth, async (next) => {
      const current = this.runtime.auth.currentUser;
      if (current && current.uid !== next?.uid && !this.closing) {
        if (next) throw new Error('Cerrá la sesión actual antes de cambiar de cuenta.');
        // Expiration/revocation may sign out outside the explicit cleanup flow.
        // Hide first, preserve the owner journal, and require that owner to return.
        this.generation++; this.update({ ready: false, user: null, profile: null, locked: true });
        await this.repository?.close(); this.repository = null;
      }
    });
    this.stopAuth = onIdTokenChanged(this.runtime.auth, (user) => { void this.acceptIdentity(user); }, (cause) => this.update({ ready: true, user: null, profile: null, blocked: true, error: authError(cause) }));
    if (typeof BroadcastChannel !== 'undefined') this.coordinator = new SessionTabCoordinator(async () => {
      this.closing = true; this.generation++; this.update({ user: null, profile: null, ready: true, blocked: true, error: 'Se cerró la sesión en otra pestaña. Recargá para continuar.' });
      await this.repository?.close(); this.repository = null;
      await this.outbox?.close(); this.outbox = null;
      await terminate(this.runtime.firestore);
    });
    const activity = () => { if (Date.now() - this.lastActivity >= AUTO_LOCK_MS) this.lock(); this.lastActivity = Date.now(); };
    const visibility = () => { if (document.visibilityState === 'visible') activity(); };
    for (const event of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(event, activity, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    this.timer = setInterval(() => { if (Date.now() - this.lastActivity >= AUTO_LOCK_MS) this.lock(); }, 1000);
    return () => { this.stopAuth?.(); this.stopBeforeAuth?.(); this.coordinator?.close(); if (this.timer) clearInterval(this.timer); for (const event of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(event, activity); document.removeEventListener('visibilitychange', visibility); void this.repository?.close(); };
  }
  private async acceptIdentity(user: User | null) {
    if (this.closing || this.view.blocked) return;
    const generation = ++this.generation;
    const same = user?.uid === this.view.user?.uid;
    if (same && user && this.view.profile) { this.update({ user }); return; }
    this.update({ ready: false, user: null, profile: null, error: null });
    try {
      if (!user) { this.pin = null; this.update({ ready: true, user: null, locked: false }); return; }
      if (!user.emailVerified) { this.update({ ready: true, user, locked: false }); return; }
      const token = await getIdTokenResult(user);
      if (generation !== this.generation) return;
      if (token.claims.email_verified !== true) { this.update({ ready: true, user, locked: false, error: 'Actualizá tu sesión para confirmar la verificación.' }); return; }
      const session: VerifiedSession = { uid: user.uid, emailVerified: true };
      this.outbox = new IndexedDbOutbox(session);
      this.owner = await loadSessionOwnerGuard(session);
      await this.owner.activate(session, navigator.onLine);
      if (generation !== this.generation) return;
      this.pin = new LocalPinLock(user.uid, this.deviceId);
      this.update({ ready: true, user, locked: this.pin.configured });
      if (!this.pin.configured) await this.openOwner(user, generation);
    } catch (cause) { if (generation === this.generation) this.update({ ready: true, blocked: true, profile: null, error: authError(cause) }); }
  }
  private async openOwner(user: User, generation = this.generation) {
    this.update({ ready: false });
    const persistence = await this.runtime.persistenceReady;
    this.update({ persistence: persistence.state === 'persistent' ? 'persistent' : 'unavailable' });
    if (persistence.state !== 'persistent' && !navigator.onLine) throw new Error('Este navegador no pudo conservar el historial. Necesitás conexión para continuar.');
    const session: VerifiedSession = { uid: user.uid, emailVerified: true };
    this.runtime.assertSession(session);
    if (!this.outbox) this.outbox = new IndexedDbOutbox(session);
    if (!this.owner) this.owner = await loadSessionOwnerGuard(session);
    await this.owner.activate(session, navigator.onLine);
    const profileRef = doc(this.runtime.firestore, 'users', session.uid);
    let profile: UserProfile;
    const existing = await getDoc(profileRef);
    if (existing.exists()) profile = UserProfileSchema.parse(existing.data());
    else {
      if (!navigator.onLine) throw new Error('La primera configuración necesita conexión.');
      profile = await runTransaction(this.runtime.firestore, async (transaction) => {
        const previous = await transaction.get(profileRef);
        if (previous.exists()) return UserProfileSchema.parse(previous.data());
        const initial: UserProfile = { uid: session.uid, setupComplete: false };
        transaction.set(profileRef, initial); return initial;
      });
    }
    if (generation !== this.generation || this.runtime.auth.currentUser?.uid !== session.uid) return;
    if (profile.uid !== session.uid) throw new Error('El perfil no corresponde a esta cuenta.');
    if (!this.repository) this.repository = createRevisionRepository(session, { firestore: this.runtime.firestore, persistenceReady: this.runtime.persistenceReady, outbox: this.outbox, guard: this.owner, assertCurrentSession: () => this.runtime.assertSession(session) });
    this.lastActivity = Date.now();
    this.update({ ready: true, user, profile, locked: false, error: null });
  }
  login = async (email: string, password: string) => { await signInWithEmailAndPassword(this.runtime.auth, email, password); };
  register = async (email: string, password: string) => { const result = await createUserWithEmailAndPassword(this.runtime.auth, email, password); await sendEmailVerification(result.user); };
  google = async () => { await signInWithPopup(this.runtime.auth, new GoogleAuthProvider()); };
  resendVerification = async () => { const user = this.runtime.auth.currentUser; if (!user) throw new Error('Volvé a entrar.'); await sendEmailVerification(user); };
  refreshVerification = async () => {
    const user = this.runtime.auth.currentUser; if (!user) throw new Error('Volvé a entrar.');
    await reload(user); await user.getIdToken(true);
    if (!user.emailVerified) throw new Error('Tu correo todavía no está verificado. Revisá tu bandeja de entrada.');
    await this.acceptIdentity(user);
  };
  lock = () => { if (this.pin?.configured && this.view.user && !this.view.locked) { this.generation++; this.update({ locked: true }); } };
  unlock = async (pin: string) => {
    const user = this.runtime.auth.currentUser; const lock = this.pin;
    if (!user || !lock) throw new Error('Volvé a entrar.');
    const generation = this.generation;
    const result = await lock.verify(pin);
    if (!result.ok) throw new Error(result.retryAfterMs > 0 ? `Esperá ${Math.ceil(result.retryAfterMs / 1000)} segundos antes de intentar otra vez.` : 'El PIN no coincide. Intentá de nuevo.');
    if (generation !== this.generation || user.uid !== this.view.user?.uid) return;
    await this.openOwner(user, generation);
  };
  getPinWait = () => { try { return this.pin?.retryAfterMs ?? 0; } catch { return 0; } };
  get hasPin(): boolean { return this.pin?.configured ?? false; }
  setInitialPin = async (pin: string) => { if (!this.pin || this.pin.configured) throw new Error('Para cambiar el PIN, confirmá tu identidad.'); await this.pin.setPin(pin); this.update({}); };
  resetPin = async (pin: string, password?: string) => {
    if (!navigator.onLine) throw new Error('Necesitás conexión para recuperar el PIN.');
    const user = this.runtime.auth.currentUser; if (!user || !this.pin) throw new Error('Volvé a entrar.');
    if (user.providerData.some((provider) => provider.providerId === 'password')) {
      if (!user.email || !password) throw new Error('Ingresá la contraseña de tu cuenta.');
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    } else await reauthenticateWithPopup(user, new GoogleAuthProvider());
    if (this.runtime.auth.currentUser?.uid !== user.uid) throw new Error('La sesión cambió. Volvé a entrar.');
    await this.pin.setPin(pin); await this.openOwner(user);
  };
  linkGoogle = async (password: string) => { const user = this.runtime.auth.currentUser; if (!user?.email) throw new Error('Volvé a entrar.'); await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password)); await linkWithPopup(user, new GoogleAuthProvider()); };
  linkPassword = async (password: string) => { const user = this.runtime.auth.currentUser; if (!user?.email) throw new Error('Falta un correo verificado.'); await reauthenticateWithPopup(user, new GoogleAuthProvider()); await linkWithCredential(user, EmailAuthProvider.credential(user.email, password)); };
  completeSetup = async () => { const user = this.runtime.auth.currentUser; if (user) await this.openOwner(user); };
  recoverAccess = async () => {
    // This does not authorize another UID or discard the previous owner's data.
    this.closing = true; this.generation++; this.update({ ready: false, profile: null, locked: true });
    await this.repository?.close(); await this.outbox?.close(); await signOut(this.runtime.auth);
    window.location.replace('/acceso');
  };
  pending = async () => this.repository ? this.repository.exportPending() : (await this.outbox?.list() ?? []).map((entry) => entry.revision);
  logout = async (pendingDecision?: 'exported') => {
    if (this.closing) return;
    const uid = this.runtime.auth.currentUser?.uid ?? this.view.user?.uid;
    try {
    if (this.repository && this.owner) {
      await closeSession({ repository: this.repository, guard: this.owner, clearPersistence: this.runtime.clearPersistence, clearUserState: async () => { this.closing = true; this.generation++; this.update({ ready: false, profile: null, locked: true }); }, releaseOtherTabs: async () => { await this.coordinator?.requestRelease(); }, signOut: async () => { await signOut(this.runtime.auth); }, ...(pendingDecision ? { pendingDecision } : {}) });
    } else {
      const pending = await this.pending();
      if (pending.length && !pendingDecision) throw new Error('PENDING_COMMANDS: synchronize, export or cancel');
      this.closing = true; this.generation++; this.update({ ready: false, profile: null, locked: true });
      await this.coordinator?.requestRelease(); await this.runtime.clearPersistence(); await this.owner?.clear(); await signOut(this.runtime.auth);
    }
    if (uid) localStorage.removeItem(`finanzas-onboarding-v1:${uid}`);
    await this.outbox?.close();
    window.location.replace('/acceso');
    } catch (cause) {
      if (this.closing) this.update({ ready: true, blocked: true, profile: null, error: 'No pudimos limpiar los datos locales. Cerrá las otras pestañas y recargá antes de cambiar de cuenta.' });
      throw cause;
    }
  };
}
