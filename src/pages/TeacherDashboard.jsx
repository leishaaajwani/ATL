import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getReviewQueue, getRoster, decideEnrollment } from '../api/client'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import { PageLoader } from '../components/ui/LoadingSpinner'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

// Entrance motion stays under the 200ms budget and barely moves: a dashboard
// somebody opens twenty times a day should not perform on each load.
const EASE = [0.4, 0, 0.2, 1]
const container = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } }
const item = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: EASE } },
}

export default function TeacherDashboard() {
  const { profile, refresh } = useAuth()
  const sections = profile?.sections ?? []

  const [queue, setQueue]     = useState([])
  const [pendingEnrol, setPE] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const [q, ...rosters] = await Promise.all([
        getReviewQueue('pending'),
        ...sections.filter(s => s.pendingStudents > 0).map(s =>
          getRoster(s.id).then(r => ({ section: s, students: r.students }))),
      ])
      setQueue(q.reflections)
      setPE(rosters.flatMap(({ section, students }) =>
        students.filter(st => st.enrollmentStatus === 'pending')
          .map(st => ({ ...st, section }))))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { if (sections.length) load(); else setLoading(false) }, [profile])

  async function decide(enrollmentId, action) {
    try {
      await decideEnrollment(enrollmentId, action)
      toast.success(action === 'approve' ? 'Student added to your class' : 'Request declined')
      await refresh()
      await load()
    } catch (err) { toast.error(err.message) }
  }

  const totalStudents = sections.reduce((n, s) => n + Number(s.activeStudents ?? 0), 0)

  if (loading) return <PageLoader />

  return (
    <PageLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title">
              {profile?.fullName?.split(' ')[0]}'s classes
            </h1>
            <p className="page-subtitle">
              {sections.length} {sections.length === 1 ? 'class' : 'classes'} ·{' '}
              {totalStudents} {totalStudents === 1 ? 'student' : 'students'}
            </p>
          </div>
          {queue.length > 0 && (
            <Link to="/approvals">
              <button className="btn-primary">
                Review {queue.length} {queue.length === 1 ? 'reflection' : 'reflections'}
              </button>
            </Link>
          )}
        </motion.div>

        {/* Enrolment requests are the thing that blocks a class from being real */}
        {pendingEnrol.length > 0 && (
          <motion.div variants={item} className="card p-4 border-gold-200 bg-gold-50">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus size={15} className="text-gold-700" />
              <p className="text-sm font-semibold text-navy-900">
                {pendingEnrol.length} {pendingEnrol.length === 1 ? 'student wants' : 'students want'} to join
              </p>
            </div>
            <div className="space-y-2">
              {pendingEnrol.map(s => (
                <div key={s.enrollmentId} className="bg-white rounded-control p-3 border border-gold-200/60
                                                    flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-caption font-medium text-slate-900">{s.fullName}</p>
                    <p className="text-caption text-slate-500 mt-0.5">
                      {s.section.subjectName} · {s.section.grade} · {s.email}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 transition-colors"
                      onClick={() => decide(s.enrollmentId, 'drop')}>
                      Not my student
                    </button>
                    <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition-colors"
                      onClick={() => decide(s.enrollmentId, 'approve')}>
                      Confirm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div variants={item}>
          <StatRail items={[
            { label: 'Classes',   value: sections.length },
            { label: 'Students',  value: totalStudents },
            { label: 'To review', value: queue.length, accent: queue.length > 0 },
            { label: 'Units',     value: sections.reduce((n, s) => n + Number(s.unitCount ?? 0), 0) },
          ]} />
        </motion.div>

        <motion.div variants={item}>
          <Card flush>
            <CardHeader inset title="Your classes" action={
              <Link to="/units" className="text-caption text-navy-700 hover:underline">Plan units</Link>
            } />
            {sections.map(s => (
              <Link key={s.id} to="/units"
                className="flex items-center justify-between gap-3 px-4 py-2.5
                           border-b border-hairline last:border-0
                           hover:bg-slate-50 transition-colors duration-200">
                <div className="min-w-0">
                  <p className="text-caption font-medium text-slate-900">{s.subjectName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {s.grade} · {s.activeStudents} {s.activeStudents === 1 ? 'student' : 'students'}
                    {' · '}{s.unitCount ?? 0} {s.unitCount === 1 ? 'unit' : 'units'}
                  </p>
                </div>
                <ArrowRight size={14} className="text-slate-300 shrink-0" />
              </Link>
            ))}
          </Card>
        </motion.div>

        {queue.length > 0 && (
          <motion.div variants={item}>
            <Card>
              <CardHeader title="Waiting on you" action={
                <Link to="/approvals" className="text-xs text-navy-700 hover:underline">View all</Link>
              } />
              <div className="space-y-2">
                {queue.slice(0, 5).map(r => (
                  <div key={r.id} className="p-3 rounded-control bg-slate-50">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <span className="text-caption font-medium text-slate-900">{r.studentName}</span>
                      <span className="text-[11px] text-slate-400">{formatDate(r.submittedAt)}</span>
                    </div>
                    <p className="text-caption text-slate-500">
                      {r.subjectName} · {r.unitName} · {r.ticks?.length ?? 0} sub-skills claimed
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PageLayout>
  )
}

// A metric rail, not four floating cards. One surface divided by hairlines
// reads as a single summary; four bordered boxes with icon chips is the
// generic dashboard look this interface is trying not to have.
function StatRail({ items }) {
  return (
    <div className="card flush grid grid-cols-2 sm:grid-cols-4 divide-x divide-hairline">
      {items.map(({ label, value, accent }) => (
        <div key={label} className="px-4 py-3">
          <p className="text-caption text-slate-500 leading-tight">{label}</p>
          <p className={`text-[26px] font-semibold leading-none mt-1.5 tabular-nums
            ${accent ? 'text-gold-700' : 'text-navy-900'}`}>
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

