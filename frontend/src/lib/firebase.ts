import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  type Auth, 
  type User 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
  } else {
    console.warn('[Virasat Firebase] Missing VITE_FIREBASE_* environment variables. Firebase not initialized.');
  }
} catch (error) {
  console.error('[Virasat Firebase] Failed to initialize Firebase:', error);
}

export { app, auth };

/**
 * Ensures an authenticated anonymous session exists.
 * Returns the active user or null if authentication fails or is disabled.
 */
export async function ensureAnonymousSession(): Promise<User | null> {
  if (!auth) {
    console.warn('[Virasat Firebase] Auth not initialized.');
    return null;
  }

  // If already authenticated, reuse session
  if (auth.currentUser) {
    return auth.currentUser;
  }

  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (error: any) {
    console.error('[Virasat Firebase] Anonymous sign-in failed:', error.code, error.message);
    if (error.code === 'auth/admin-restricted-operation') {
      console.warn('[Virasat Firebase] Anonymous authentication is not enabled in Firebase Console.');
    }
    return null;
  }
}

/**
 * Retrieves the current Firebase ID token for Authorization headers.
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  if (!auth) return null;
  const user = auth.currentUser || (await ensureAnonymousSession());
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (err) {
    console.error('[Virasat Firebase] Failed to get ID token:', err);
    return null;
  }
}

/**
 * Listens for auth state changes.
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
