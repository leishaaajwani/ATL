import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCog, X } from 'lucide-react'
import { DEV_LOGIN, getDevUser, setDevUser, listDevUsers } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

// Development only. Switches which roster account this browser window is acting
// as, without touching .env or restarting anything. The choice is stored per
// window, so opening a second window and picking a student there gives you a
// genuine side-by-side view of both interfaces against the same database.
//
// DEV_LOGIN is false in any production build, so this renders nothing there.

export default function DevUserSwitcher() {
  const { profile } = useAuth()
  const [open, setOpen]   = useState(false)
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (!DEV_LOGIN || !open || users.length) return
    listDevUsers().then(d => setUsers(d.users)).catch(() => {})
  }, [open])

  if (!DEV_LOGIN) return null

  const current = getDevUser()

  function pick(email) {
    setDevUser(email === current ? null : email)
    window.location.reload()
  }

  const byRole = users.reduce((acc, u) => { (acc[u.role] ??= []).push(u); return acc }, {})

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full
                   bg-navy-900 text-white pl-3 pr-4 py-2 shadow-card-lg
                   border border-gold-500/40 hover:border-gold-500 transition-colors"
        title="Development: switch account"
      >
        <UserCog size={14} className="text-gold-400" />
        <span className="text-xs font-medium">
          {profile?.fullName ?? 'Not signed in'}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-gold-400">
          {profile?.role}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-16 right-4 z-50 w-80 max-h-[70vh] overflow-y-auto
                       rounded-2xl bg-white border border-slate-200 shadow-card-lg"
          >
            <div className="flex items-start justify-between gap-2 p-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Act as</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Development only. This is per tab, so open a second tab, pick a
                  student there, and you can watch both interfaces at once.
                </p>
              </div>
              <button onClick={() => setOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 shrink-0">
                <X size={14} />
              </button>
            </div>

            <div className="p-2">
              {['admin', 'teacher', 'student'].map(role => {
                const list = byRole[role] ?? []
                if (!list.length) return null
                return (
                  <div key={role} className="mb-2 last:mb-0">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {role}s
                    </p>
                    {list.map(u => (
                      <button key={u.email} onClick={() => pick(u.email)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                          u.email === current ? 'bg-navy-50 ring-1 ring-navy-200' : 'hover:bg-slate-50'
                        }`}>
                        <p className="text-xs font-medium text-slate-900">{u.fullName}</p>
                        <p className="text-[10px] text-slate-500">
                          {u.email}
                          {u.role === 'teacher' && ` · ${u.teaches} classes`}
                          {u.role === 'student' && ` · ${u.enrolled} enrolled`}
                        </p>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
