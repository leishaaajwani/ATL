import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import Crest from './Crest'

export default function PageLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="sidebar"
              className="fixed inset-y-0 left-0 z-40 w-72 lg:hidden"
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <Sidebar mobile onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar, same navy-and-gold as the sidebar */}
        <div className="lg:hidden bg-navy-900">
          <div className="h-1 bg-gold-500" />
          <div className="flex items-center px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-navy-100 hover:bg-navy-800 transition-colors"
            >
              <Menu size={20} />
            </button>
            <Crest size={22} className="ml-2" />
            <span className="ml-2 text-sm font-semibold text-white">ATL Tracker</span>
          </div>
        </div>

        {/* Scrollable page area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
