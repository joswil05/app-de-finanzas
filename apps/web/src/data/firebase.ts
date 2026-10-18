import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { CACHE_SIZE_UNLIMITED, clearIndexedDbPersistence, connectFirestoreEmulator, enableMultiTabIndexedDbPersistence, initializeFirestore, terminate, type Firestore } from 'firebase/firestore';
import { type VerifiedSession, VerifiedSessionSchema } from '@fin/contracts';

export type FirebaseEnvironment = Partial<Record<'VITE_FIREBASE_API_KEY' | 'VITE_FIREBASE_AUTH_DOMAIN' | 'VITE_FIREBASE_PROJECT_ID' | 'VITE_FIREBASE_APP_ID' | 'VITE_FIREBASE_STORAGE_BUCKET' | 'VITE_FIREBASE_MESSAGING_SENDER_ID' | 'VITE_USE_FIREBASE_EMULATORS' | 'VITE_FIREBASE_AUTH_EMULATOR_PORT' | 'VITE_FIREBASE_FIRESTORE_EMULATOR_PORT', string>>;
export type PersistenceReadiness = { state: 'persistent' } | { state: 'unavailable'; code: string };
export type FirebaseRuntime = { app: FirebaseApp; auth: Auth; firestore: Firestore; persistenceReady: Promise<PersistenceReadiness>; clearPersistence: () => Promise<void>; assertSession: (session: VerifiedSession) => void };
export type FirebaseConfiguration = { state: 'disabled'; reason: string } | { state: 'configured'; runtime: FirebaseRuntime };

/** No demo identity or in-memory fallback is substituted for missing production credentials. */
export function configureFirebase(env: FirebaseEnvironment = import.meta.env as FirebaseEnvironment): FirebaseConfiguration {
  const { VITE_FIREBASE_API_KEY: apiKey, VITE_FIREBASE_AUTH_DOMAIN: authDomain, VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_APP_ID: appId } = env;
  if (!apiKey || !authDomain || !projectId || !appId) return { state: 'disabled', reason: 'Firebase no está configurado. El acceso a datos requiere una sesión verificada.' };
  const emulators = env.VITE_USE_FIREBASE_EMULATORS === 'true';
  const port = (value: string | undefined, fallback: number): number => {
    if (value === undefined) return fallback;
    if (!/^[0-9]{1,5}$/u.test(value) || Number(value) < 1 || Number(value) > 65535) throw new Error('INVALID_INPUT: emulator port');
    return Number(value);
  };
  const authPort = port(env.VITE_FIREBASE_AUTH_EMULATOR_PORT, 9109);
  const firestorePort = port(env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT, 8180);
  if (projectId.startsWith('demo-') && !emulators) return { state: 'disabled', reason: 'La configuración de demostración requiere emuladores locales.' };
  const app = initializeApp({ apiKey, authDomain, projectId, appId, ...(env.VITE_FIREBASE_STORAGE_BUCKET ? { storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET } : {}), ...(env.VITE_FIREBASE_MESSAGING_SENDER_ID ? { messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID } : {}) });
  const auth = getAuth(app);
  const firestore = initializeFirestore(app, { cacheSizeBytes: CACHE_SIZE_UNLIMITED });
  if (emulators) { connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true }); connectFirestoreEmulator(firestore, '127.0.0.1', firestorePort); }
  // This supported public API is deprecated, but uniquely exposes persistence startup failure
  // as a Promise in SDK13. A configured localCache silently falls back to memory instead.
  let persistenceReady: Promise<PersistenceReadiness>;
  const unavailable = (cause: unknown): PersistenceReadiness => ({ state: 'unavailable', code: cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : 'PERSISTENCE_UNAVAILABLE' });
  try { persistenceReady = enableMultiTabIndexedDbPersistence(firestore).then(() => ({ state: 'persistent' as const }), unavailable); }
  catch (cause) { persistenceReady = Promise.resolve(unavailable(cause)); }
  return {
    state: 'configured',
    runtime: { app, auth, firestore, persistenceReady,
      async clearPersistence() { await terminate(firestore); await clearIndexedDbPersistence(firestore); },
      assertSession(session) {
        VerifiedSessionSchema.parse(session);
        if (!auth.currentUser || auth.currentUser.uid !== session.uid || auth.currentUser.emailVerified !== true) throw new Error('UNAUTHORIZED');
      },
    },
  };
}
