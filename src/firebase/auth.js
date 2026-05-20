import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, googleProvider, db } from './config'

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  const user = result.user
  await ensureUserDoc(user)
  return user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      displayName: user.displayName ?? '',
      email:       user.email ?? '',
      photoURL:    user.photoURL ?? '',
      role:        'student',     // default; teacher accounts are set manually
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    })
  }
  return snap.exists() ? snap.data() : null
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
