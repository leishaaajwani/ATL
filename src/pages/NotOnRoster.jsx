import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

// Signed in with Google, but not on the school roster. This is the expected
// outcome for anyone the DP coordinator has not added, so it reads as an
// instruction rather than an error.

export default function NotOnRoster() {
  const { rejection, user, refresh } = useAuth()
  const isNetwork = rejection?.code === 'NETWORK'

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <p className="text-gold-400 text-xs font-semibold tracking-widest uppercase mb-3">
          GEMS Modern Academy
        </p>
        <h1 className="text-2xl font-semibold text-white mb-3">
          {isNetwork ? 'Cannot reach the server' : 'You are not on the roster yet'}
        </h1>
        <p className="text-navy-200 text-sm leading-relaxed mb-2">
          {rejection?.message}
        </p>
        {user?.email && !isNetwork && (
          <p className="text-navy-300 text-xs mb-6">
            You signed in as <span className="text-white font-medium">{user.email}</span>.
            If that is not your school address, sign out and try the right one.
          </p>
        )}

        <div className="flex gap-2 mt-6">
          <button className="btn-accent" onClick={refresh}>Try again</button>
          <button
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-navy-100
                       border border-navy-700 hover:bg-navy-800 transition-colors"
            onClick={() => signOut(auth)}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
