import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, BarChart3, CheckCircle, PenLine, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

const features = [
  {
    icon: PenLine,
    title: 'Structured Reflections',
    desc: 'Document ATL growth across all five skill categories with guided reflection prompts aligned to the IB framework.',
  },
  {
    icon: BarChart3,
    title: 'Visual Analytics',
    desc: 'Track progression across terms with radar charts, bar graphs, and line charts. See exactly where to focus next.',
  },
  {
    icon: CheckCircle,
    title: 'Teacher Feedback Loop',
    desc: 'Teachers review, comment, and validate entries. Only approved reflections contribute to your analytics.',
  },
  {
    icon: Sparkles,
    title: 'IB-Aligned Framework',
    desc: 'Built around the official ATL categories: Communication, Social, Self-management, Research, and Thinking.',
  },
]

const fade = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function Landing() {
  const { user, userDoc, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user && userDoc) {
      navigate(userDoc.role === 'teacher' ? '/teacher' : '/dashboard')
    }
  }, [loading, user, userDoc])

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-navy-700 flex items-center justify-center">
            <BookOpen size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900">ATL Nexus</span>
        </div>
        <Link
          to="/login"
          className="btn-primary text-sm py-2 px-4"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <motion.div
          variants={fade} initial="hidden" animate="show"
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-50 text-navy-700 text-xs font-medium mb-6 border border-navy-100">
            <Sparkles size={11} />
            Built for IB Diploma Programme
          </span>
          <h1 className="text-5xl sm:text-6xl font-semibold text-slate-900 tracking-tight leading-tight mb-6">
            Your ATL skills,
            <br />
            <span className="text-navy-700">clearly visible.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
            ATL Nexus helps IB students track, reflect on, and demonstrate growth
            in Approaches to Learning skills — with real teacher feedback and
            beautiful analytics.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/login" className="btn-primary gap-2">
              Get started <ArrowRight size={15} />
            </Link>
            <a
              href="#features"
              className="btn-secondary"
            >
              Learn more
            </a>
          </div>
        </motion.div>

        {/* Dashboard preview mockup */}
        <motion.div
          className="mt-16 rounded-3xl border border-slate-100 shadow-card-lg overflow-hidden bg-slate-50"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-amber-300" />
              <div className="w-3 h-3 rounded-full bg-green-300" />
            </div>
            <div className="flex-1 bg-slate-100 rounded-lg h-5 max-w-xs mx-auto" />
          </div>
          <div className="grid grid-cols-3 gap-3 p-5">
            {['Communication', 'Research', 'Thinking'].map((cat, i) => (
              <div key={cat} className="bg-white rounded-2xl p-4 shadow-card">
                <div className="w-8 h-8 rounded-xl mb-3" style={{ backgroundColor: ['#eef2ff','#eff6ff','#fdf2f8'][i] }} />
                <div className="h-2 bg-slate-100 rounded-full mb-1.5 w-3/4" />
                <div className="h-1.5 bg-slate-50 rounded-full w-1/2" />
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">
            Everything you need to track ATL growth
          </h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Designed for students who want clarity, and teachers who want insight.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="card p-6"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-4">
                <Icon size={18} className="text-navy-700" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="card p-10 bg-navy-950 border-none">
          <h2 className="text-2xl font-semibold text-white mb-3 tracking-tight">
            Ready to track your ATL journey?
          </h2>
          <p className="text-navy-200 mb-7 text-sm">
            Sign in with your school Google account to get started.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-white text-navy-900 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors">
            Sign in with Google <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-slate-400 border-t border-slate-100">
        ATL Nexus · IB Diploma Programme · Built for learners
      </footer>
    </div>
  )
}
