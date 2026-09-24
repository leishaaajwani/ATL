import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PenLine, Clock, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMyUnits, getRatings } from '../api/client'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import { PageLoader } from '../components/ui/LoadingSpinner'
import { SCORE_MAP, SCORE_LABEL } from '../utils/atlFramework'
import toast from 'react-hot-toast'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

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
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title">
              Good {timeGreeting()}, {profile?.fullName?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">How your ATL skills are coming along</p>
          </div>
          <Link to="/reflect"><button className="btn-accent"><PenLine size={15} /> New reflection</button></Link>
        </motion.div>

        {/* Returned work goes first, because it is the only thing that is blocked */}
        {returned.length > 0 && (
          <motion.div variants={item} className="card p-4 border-gold-200 bg-gold-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} className="text-gold-700" />
              <p className="text-sm font-semibold text-navy-900">
                Your teacher sent {returned.length === 1 ? 'one back' : `${returned.length} back`}
              </p>
            </div>
            <div className="space-y-2">
              {returned.map(u => (
                <div key={u.id} className="bg-white rounded-xl p-3 border border-gold-200/60">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{u.subjectName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{u.term} · {u.name}</p>
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

        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Units"     value={stats.total}   icon={BookOpen}    tone="navy" />
          <Stat label="Approved"  value={stats.done}    icon={CheckCircle2} tone="green" />
          <Stat label="Awaiting review" value={stats.pending} icon={Clock}  tone="gold" />
          <Stat label="Still to do" value={stats.todo}  icon={PenLine}     tone="slate" />
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader title="Your units" subtitle={`${units.length} across your subjects`} />
            {units.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-slate-700">Nothing to do yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your units will show up here once your teachers have set them up.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {units.map(u => <UnitRow key={u.id} unit={u} />)}
              </div>
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
    status === 'approved' ? { cls: 'bg-emerald-50 text-emerald-700', text: 'Approved' }
  : status === 'pending'  ? { cls: 'bg-gold-100 text-gold-800',      text: 'Awaiting review' }
  : status === 'returned' ? { cls: 'bg-rose-50 text-rose-700',       text: 'Needs revision' }
  : !unit.isOpen          ? { cls: 'bg-slate-100 text-slate-500',    text: 'Closed' }
  :                         { cls: 'bg-navy-50 text-navy-700',       text: 'Not started' }

  const clickable = !status || status === 'returned'

  const body = (
    <div className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-colors
      ${clickable && unit.isOpen ? 'hover:bg-slate-50 cursor-pointer' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{unit.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {unit.subjectName} · {unit.term} · {unit.subskills?.length ?? 0} sub-skills
        </p>
      </div>
      <span className={`badge shrink-0 ${badge.cls}`}>{badge.text}</span>
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
      <CardHeader title="What your teachers said" subtitle="From your published term reports" />
      <div className="space-y-4">
        {Object.entries(bySubject).map(([subject, list]) => {
          const byCategory = list.reduce((acc, r) => {
            (acc[r.categoryName] ??= { colour: r.colour, bg: r.bgColour, scores: [] })
              .scores.push(SCORE_MAP[r.level] ?? 0)
            return acc
          }, {})
          return (
            <div key={subject}>
              <p className="text-sm font-medium text-slate-800 mb-2">{subject}</p>
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

function Stat({ label, value, icon: Icon, tone }) {
  const tones = {
    navy:  { bg: '#f2f6fc', fg: '#123a8a' },
    green: { bg: '#ecfdf5', fg: '#059669' },
    gold:  { bg: '#fbf3e3', fg: '#a67c1f' },
    slate: { bg: '#f8fafc', fg: '#475569' },
  }
  const { bg, fg } = tones[tone]
  return (
    <div className="card p-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
        <Icon size={15} style={{ color: fg }} />
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
