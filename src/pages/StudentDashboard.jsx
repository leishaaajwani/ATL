import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PenLine, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMyUnits, getRatings } from '../api/client'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import { PageLoader } from '../components/ui/LoadingSpinner'
import { SCORE_MAP, SCORE_LABEL } from '../utils/atlFramework'
import toast from 'react-hot-toast'

// Entrance motion stays under the 200ms budget and barely moves: a dashboard
// somebody opens twenty times a day should not perform on each load.
const EASE = [0.4, 0, 0.2, 1]
const container = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } }
const item = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: EASE } },
}

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [units, setUnits]     = useState([])
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMyUnits(), getRatings({}).catch(() => ({ ratings: [] }))])
      .then(([u, r]) => { setUnits(u.units); setRatings(r.ratings ?? []) })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => ({
    total:     units.length,
    done:      units.filter(u => u.reflectionStatus === 'approved').length,
    pending:   units.filter(u => u.reflectionStatus === 'pending').length,
    returned:  units.filter(u => u.reflectionStatus === 'returned').length,
    todo:      units.filter(u => !u.reflectionStatus && u.isOpen).length,
  }), [units])

  const returned = units.filter(u => u.reflectionStatus === 'returned')

  if (loading) return <PageLoader />

  return (
    <PageLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title">
              Good {timeGreeting()}, {profile?.fullName?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="page-subtitle">Your ATL skills across every unit</p>
          </div>
          <Link to="/reflect"><button className="btn-primary"><PenLine size={15} /> New reflection</button></Link>
        </motion.div>

        {/* Returned work goes first, because it is the only thing that is blocked */}
        {returned.length > 0 && (
          <motion.div variants={item} className="card p-4 border-gold-200 bg-gold-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} className="text-gold-700" />
              <p className="text-sm font-semibold text-navy-900">
                {returned.length} {returned.length === 1 ? 'reflection needs' : 'reflections need'} revision
              </p>
            </div>
            <div className="space-y-2">
              {returned.map(u => (
                <div key={u.id} className="bg-white rounded-control p-3 border border-gold-200/60">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-caption font-medium text-slate-900">{u.subjectName}</p>
                      <p className="text-caption text-slate-500 mt-0.5">{u.term} · {u.name}</p>
                    </div>
                    <Link to={`/reflect?unitId=${u.id}`}>
                      <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition-colors">
                        Revise
                      </button>
                    </Link>
                  </div>
                  {u.teacherFeedback && (
                    <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100 leading-relaxed">
                      {u.teacherFeedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div variants={item}>
          <StatRail items={[
            { label: 'Units',      value: stats.total },
            { label: 'Approved',   value: stats.done },
            { label: 'Awaiting review', value: stats.pending },
            { label: 'Still to do', value: stats.todo, accent: stats.todo > 0 },
          ]} />
        </motion.div>

        <motion.div variants={item}>
          <Card flush>
            <CardHeader inset title="Your units" subtitle={`${units.length} across your subjects`} />
            {units.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">Nothing here yet</p>
                <p className="text-caption text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Units appear once your teachers create them and your class enrolment is confirmed.
                </p>
              </div>
            ) : (
              units.map(u => <UnitRow key={u.id} unit={u} />)
            )}
          </Card>
        </motion.div>

        {ratings.length > 0 && (
          <motion.div variants={item}>
            <TeacherRatings ratings={ratings} />
          </motion.div>
        )}
      </motion.div>
    </PageLayout>
  )
}

function UnitRow({ unit }) {
  const status = unit.reflectionStatus
  const badge =
    status === 'approved' ? { cls: 'badge-positive', text: 'Approved' }
  : status === 'pending'  ? { cls: 'badge-waiting',      text: 'Awaiting review' }
  : status === 'returned' ? { cls: 'badge-alert',       text: 'Needs revision' }
  : !unit.isOpen          ? { cls: 'badge-neutral',    text: 'Closed' }
  :                         { cls: 'badge-neutral',    text: 'Not started' }

  const clickable = !status || status === 'returned'

  const body = (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5
      border-b border-hairline last:border-0 transition-colors duration-200
      ${clickable && unit.isOpen ? 'hover:bg-slate-50 cursor-pointer' : ''}`}>
      <div className="min-w-0">
        <p className="text-caption font-medium text-slate-900 truncate">{unit.name}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {unit.subjectName} · {unit.term} · {unit.subskills?.length ?? 0} sub-skills
        </p>
      </div>
      <span className={`shrink-0 ${badge.cls}`}>{badge.text}</span>
    </div>
  )

  return clickable && unit.isOpen ? <Link to={`/reflect?unitId=${unit.id}`}>{body}</Link> : body
}

function TeacherRatings({ ratings }) {
  // Group by subject, then average each category so the student sees one honest
  // number per skill rather than a wall of per-unit rows.
  const bySubject = ratings.reduce((acc, r) => {
    (acc[r.subjectName] ??= []).push(r)
    return acc
  }, {})

  return (
    <Card>
      <CardHeader title="What your teachers said" subtitle="From published term reports" />
      <div className="space-y-4">
        {Object.entries(bySubject).map(([subject, list]) => {
          const byCategory = list.reduce((acc, r) => {
            (acc[r.categoryName] ??= { colour: r.colour, bg: r.bgColour, scores: [] })
              .scores.push(SCORE_MAP[r.level] ?? 0)
            return acc
          }, {})
          return (
            <div key={subject}>
              <p className="text-caption font-medium text-slate-800 mb-2">{subject}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(byCategory).map(([cat, { colour, bg, scores }]) => {
                  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                  return (
                    <span key={cat} className="text-[11px] font-medium px-2 py-1 rounded-lg"
                      style={{ backgroundColor: bg, color: colour }}>
                      {cat}: {SCORE_LABEL[Math.round(avg)]}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
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

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
