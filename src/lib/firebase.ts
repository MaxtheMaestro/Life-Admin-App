import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, FirestoreErrorInfo } from '../types';

function getRuntimeFirebaseConfig() {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  return {
    ...firebaseConfig,
    authDomain: isLocalhost ? firebaseConfig.authDomain : window.location.host,
  };
}

const app = initializeApp(getRuntimeFirebaseConfig());
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Use local persistence to stay logged in after browser close/refresh
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence setup failed", error);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

function shouldUseRedirectSignIn() {
  const userAgent = navigator.userAgent || '';
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return isAppleMobile || isAndroid || isStandalone;
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const loginWithGoogle = async () => {
  try {
    if (shouldUseRedirectSignIn()) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    const errorCode = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

    if (errorCode === 'auth/popup-blocked' || errorCode === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    console.error("Login failed", error);
    throw error;
  }
};

export const completeRedirectLogin = () => getRedirectResult(auth);

export const logout = () => auth.signOut();
