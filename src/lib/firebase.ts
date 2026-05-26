import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence, type AuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, FirestoreErrorInfo } from '../types';

const app = initializeApp(firebaseConfig);
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

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

async function loginWithProvider(provider: AuthProvider) {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    const errorCode = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

    if (
      errorCode === 'auth/popup-blocked' ||
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorCode === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    console.error("Login failed", error);
    throw error;
  }
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
  return loginWithProvider(googleProvider);
};

export const loginWithApple = async () => {
  return loginWithProvider(appleProvider);
};

export const completeRedirectLogin = () => getRedirectResult(auth);

export const logout = () => auth.signOut();
