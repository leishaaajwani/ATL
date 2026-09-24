import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import Crest from './Crest'

export default function PageLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#f7f8fa] overflow-hidden">
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
              className="fixed inset-0 bg-navy-950/30 z-30 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="sidebar"
              className="fixed inset-y-0 left-0 z-40 w-64 lg:hidden"
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <Sidebar mobile onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar, matching the sidebar's matte navy */}
        <div className="lg:hidden bg-navy-900 border-b border-navy-950">
          <div className="flex items-center px-3 py-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-navy-200 hover:text-white hover:bg-white/[0.06]
                         transition-colors duration-200"
            >
              <Menu size={18} />
            </button>
            <Crest size={20} className="ml-2" />
            <span className="ml-2 text-caption font-medium text-white">ATL Tracker</span>
          </div>
        </div>

        {/* Scrollable page area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-content mx-auto px-5 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
