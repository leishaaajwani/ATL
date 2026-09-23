import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, PenLine, BarChart3, CheckCircle,
  LogOut, Users, BookMarked, FileText,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { signOut } from '../../firebase/auth'
import { cn } from '../../utils/helpers'
import Crest from './Crest'
import toast from 'react-hot-toast'

// Navy carries the structure and gold marks the active item, which is how both
// the school site and Modern Eventure use the two colours. Gold appears once
// per screen here, on the item you are actually on.

const studentNav = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/reflect',   label: 'New Entry',  icon: PenLine },
  { to: '/analytics', label: 'Analytics',  icon: BarChart3 },
]

const teacherNav = [
  { to: '/teacher',   label: 'Overview',      icon: LayoutDashboard },
  { to: '/approvals', label: 'Approvals',     icon: CheckCircle },
  { to: '/units',     label: 'Unit Planning', icon: BookMarked },
  { to: '/reports',   label: 'Reports',       icon: FileText },
  { to: '/students',  label: 'Students',      icon: Users },
  { to: '/analytics', label: 'Analytics',     icon: BarChart3 },
]

const adminNav = [
  { to: '/admin',     label: 'Roster',        icon: Users },
]

export default function Sidebar({ mobile, onClose }) {
  const { profile, role } = useAuth()
  const navigate = useNavigate()
  const navItems = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav

  async function handleSignOut() {
    await signOut()
    navigate('/')
    toast.success('Signed out')
  }

  return (
    <aside className={cn(
      'flex flex-col h-full bg-navy-900',
      mobile ? 'w-full' : 'w-64',
    )}>
      {/* Gold rule, the school's accent band */}
      <div className="h-1 bg-gold-500 shrink-0" />

      <div className="px-5 py-5 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <Crest size={30} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white leading-tight truncate">
              GEMS Modern Academy
            </p>
            <p className="text-[11px] text-gold-400 mt-0.5 leading-none tracking-wide">
              ATL Tracker
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative',
              isActive
                ? 'bg-navy-800 text-white'
                : 'text-navy-200 hover:bg-navy-800/60 hover:text-white',
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-gold-500" />
                )}
                <Icon size={16} className={isActive ? 'text-gold-400' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-navy-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center
                          text-navy-900 text-xs font-bold shrink-0">
            {(profile?.fullName ?? '?').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.fullName ?? 'User'}</p>
            <p className="text-[11px] text-navy-300 capitalize">{profile?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-navy-300 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
