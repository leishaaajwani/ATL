import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { useState } from 'react'
import { signInWithGoogle } from '../firebase/auth'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const { user, userDoc, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && user && userDoc) {
      if (!userDoc.profileCompleted) {
        navigate('/onboarding', { replace: true })
      } else {
        navigate(userDoc.role === 'teacher' ? '/teacher' : '/dashboard', { replace: true })
      }
    }
  }, [authLoading, user, userDoc])

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await signInWithGoogle()
      // redirect handled by useEffect above
    } catch (err) {
      toast.error('Sign-in failed. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-navy-700 flex items-center justify-center mb-4 shadow-card-md">
            <BookOpen size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Welcome to ATL Nexus</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to track your ATL journey</p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 disabled:opacity-50 shadow-card"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-300 border-t-navy-600 rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-slate-400 bg-white">Coming soon</span>
            </div>
          </div>

          <button
            disabled
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-400 cursor-not-allowed"
          >
            <MicrosoftIcon />
            Continue with Microsoft
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
          By signing in, you agree to use this platform for your IB Diploma Programme learning journey.
        </p>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  )
}
