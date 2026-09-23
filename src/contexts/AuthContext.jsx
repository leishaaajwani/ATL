import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { getMe, ApiError, DEV_LOGIN } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // Signed in with Google, but not on the school roster. This is a real state,
  // not an error to swallow: the person needs to be told who to ask.
  const [rejection, setRejection] = useState(null)

  const load = useCallback(async () => {
    try {
      const me = await getMe()
      setProfile(me)
      setRejection(null)
      return me
    } catch (err) {
      setProfile(null)
      if (err instanceof ApiError && [401, 403].includes(err.status)) {
        setRejection({ message: err.message, code: err.code })
      } else {
        setRejection({ message: 'Could not reach the server. Try again in a moment.', code: 'NETWORK' })
      }
      return null
    }
  }, [])

  useEffect(() => {
    // Dev login: there is no Google session to wait for, so go straight to /me.
    if (DEV_LOGIN) {
      setUser({ email: 'dev@local', uid: 'dev' })
      load().finally(() => setLoading(false))
      return
    }
    return onAuthStateChanged(auth, async firebaseUser => {
      setUser(firebaseUser)
      if (firebaseUser) await load()
      else { setProfile(null); setRejection(null) }
      setLoading(false)
    })
  }, [load])

  const role = profile?.role ?? null

  const value = {
    user,
    profile,
    loading,
    rejection,
    role,
    isStudent: role === 'student',
    isTeacher: role === 'teacher',
    isAdmin:   role === 'admin',
    // A teacher with no classes declared, or a student with no enrolments,
    // still has to finish setup before the app is useful to them.
    needsSetup:
      (role === 'teacher' && (profile?.sections?.length ?? 0) === 0) ||
      (role === 'student' && (profile?.enrollments?.length ?? 0) === 0),
    refresh: load,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function homeFor(role) {
  if (role === 'admin')   return '/admin'
  if (role === 'teacher') return '/teacher'
  return '/dashboard'
}
