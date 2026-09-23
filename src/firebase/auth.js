import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, googleProvider } from './config'

// Firebase is now identity only. It proves who someone is; whether they have an
// account, and what they can do, is answered by the MySQL roster behind /api.
// Nothing is written to Firestore here any more.

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}
