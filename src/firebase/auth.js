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
      uid:              user.uid,
      displayName:      user.displayName ?? '',
      email:            user.email ?? '',
      photoURL:         user.photoURL ?? '',
      role:             null,   // set during onboarding
      profileCompleted: false,
      createdAt:        serverTimestamp(),
      updatedAt:        serverTimestamp(),
    })
  }
  return snap.exists() ? snap.data() : null
}

export async function saveStudentProfile(uid, { displayName, grade, subjects }) {
  await setDoc(doc(db, 'users', uid), {
    displayName,
    grade,
    subjects,  // [{ name, teacher }]
    role: 'student',
    profileCompleted: true,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function saveTeacherProfile(uid, { displayName, teachingGroups }) {
  await setDoc(doc(db, 'users', uid), {
    displayName,
    teachingGroups, // [{ subject, grade }]
    role: 'teacher',
    profileCompleted: true,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
