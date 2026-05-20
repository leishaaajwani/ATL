import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { getUserDoc } from '../firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const doc = await getUserDoc(firebaseUser.uid)
        setUserDoc(doc)
      } else {
        setUser(null)
        setUserDoc(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const refreshUserDoc = async () => {
    if (!user) return
    const doc = await getUserDoc(user.uid)
    setUserDoc(doc)
  }

  const value = {
    user,
    userDoc,
    loading,
    isStudent: userDoc?.role === 'student',
    isTeacher: userDoc?.role === 'teacher',
    refreshUserDoc,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
