import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, PenLine, BarChart3, CheckCircle,
  BookOpen, LogOut, Users, ChevronRight, BookMarked, FileText,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { signOut } from '../../firebase/auth'
import { cn } from '../../utils/helpers'
import toast from 'react-hot-toast'

const studentNav = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/reflect',    label: 'New Entry',   icon: PenLine },
  { to: '/analytics',  label: 'Analytics',   icon: BarChart3 },
]

const teacherNav = [
  { to: '/teacher',    label: 'Overview',      icon: LayoutDashboard },
  { to: '/approvals',  label: 'Approvals',     icon: CheckCircle },
  { to: '/units',      label: 'Unit Planning', icon: BookMarked },
  { to: '/reports',    label: 'Reports',       icon: FileText },
  { to: '/students',   label: 'Students',      icon: Users },
  { to: '/analytics',  label: 'Analytics',     icon: BarChart3 },
]

export default function Sidebar({ mobile, onClose }) {
  const { userDoc, isTeacher } = useAuth()
  const navigate = useNavigate()
  const navItems = isTeacher ? teacherNav : studentNav

  async function handleSignOut() {
    await signOut()
    navigate('/')
    toast.success('Signed out')
  }

  return (
    <aside className={cn(
      'flex flex-col h-full bg-white border-r border-slate-100',
      mobile ? 'w-full' : 'w-60',
    )}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-navy-700 flex items-center justify-center">
            <BookOpen size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-none">ATL Nexus</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-none">IB Diploma</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-navy-50 text-navy-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          {userDoc?.photoURL
            ? <img src={userDoc.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
            : <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 text-xs font-semibold">
                {(userDoc?.displayName ?? '?').charAt(0)}
              </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{userDoc?.displayName ?? 'User'}</p>
            <p className="text-[11px] text-slate-400 capitalize">{userDoc?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
