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

// Matte navy. The active item is marked by a 2px rule at the left edge and a
// shift in text colour, not by a filled pill: a sidebar of glowing capsules
// competes with the content it is meant to frame.

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
  { to: '/admin', label: 'Roster', icon: Users },
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
      'flex flex-col h-full bg-navy-900 border-r border-navy-950',
      mobile ? 'w-full' : 'w-[216px]',
    )}>
      <div className="px-4 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <Crest size={24} />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-white leading-tight truncate">
              GEMS Modern Academy
            </p>
            <p className="text-[11px] text-navy-300 leading-tight mt-px">ATL Tracker</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'relative flex items-center gap-2.5 pl-3 pr-2 py-[7px] rounded-[7px]',
              'text-caption transition-colors duration-200',
              isActive
                ? 'text-white font-medium bg-white/[0.06]'
                : 'text-navy-200 font-normal hover:text-white hover:bg-white/[0.03]',
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-gold-500" />
                )}
                <Icon size={15} className={isActive ? 'text-white' : 'text-navy-300'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.12]
                          flex items-center justify-center text-white text-[11px] font-medium shrink-0">
            {(profile?.fullName ?? '?').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-caption text-white truncate leading-tight">
              {profile?.fullName ?? 'User'}
            </p>
            <p className="text-[11px] text-navy-300 capitalize leading-tight">{profile?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md text-navy-300 hover:text-white hover:bg-white/[0.06]
                       transition-colors duration-200"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
