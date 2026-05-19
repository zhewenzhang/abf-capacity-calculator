import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './config';

if (!auth) {
  throw new Error('Firebase auth not initialized. Check your .env configuration.');
}

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth!, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth!);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth!, callback);
}

export function getCurrentUser(): User | null {
  return auth!.currentUser;
}
