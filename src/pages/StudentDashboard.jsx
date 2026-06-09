import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PenLine, Clock, CheckCircle, XCircle, TrendingUp, BookOpen, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useStudentEntries } from '../hooks/useATLEntries'
import { useAnalytics } from '../hooks/useAnalytics'
import { subscribeToStudentUnitRatings } from '../firebase/firestore'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { LevelBadge, CategoryBadge, StatusBadge } from '../components/ui/Badge'
import ChartContainer from '../components/charts/ChartContainer'
import { ATL_CATEGORIES, ATL_CATEGORY_KEYS, SCORE_MAP, SCORE_LABEL } from '../utils/atlFramework'
import { formatDate, truncate } from '../utils/helpers'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function StudentDashboard() {
  const { user, userDoc } = useAuth()
  const { entries, loading } = useStudentEntries(userDoc?.uid)
  const analytics = useAnalytics(entries)
  const [unitRatings, setUnitRatings] = useState([])

  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToStudentUnitRatings(user.uid, setUnitRatings)
    return unsub
  }, [user])

  const recentEntries   = entries.slice(0, 5)
  const rejectedEntries = entries.filter(e => e.approvalStatus === 'rejected')

  return (
    <PageLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="page-title">
              Good {timeGreeting()}, {userDoc?.displayName?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Track your ATL growth across all subjects</p>
          </div>
          <Link to="/reflect">
            <Button icon={<PenLine size={15} />}>New Entry</Button>
          </Link>
        </motion.div>

        {/* Returned entries alert */}
        {rejectedEntries.length > 0 && (
          <motion.div variants={item} className="card p-4 border-rose-100 bg-rose-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} className="text-rose-500" />
              <p className="text-sm font-semibold text-rose-700">
                {rejectedEntries.length} {rejectedEntries.length === 1 ? 'entry' : 'entries'} returned for revision
              </p>
            </div>
            <div className="space-y-2">
              {rejectedEntries.map(e => (
                <div key={e.id} className="bg-white rounded-xl p-3 border border-rose-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-800">{e.subject}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{e.atlCategory}</span>
                    {e.unitName && <span className="text-[10px] text-slate-400">— {e.unitName}</span>}
                  </div>
                  {e.teacherFeedback && (
                    <p className="text-xs text-rose-600 italic">
                      Teacher: "{e.teacherFeedback}"
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-rose-500 mt-2">
              Submit a new entry addressing the feedback above.
            </p>
          </motion.div>
        )}

        {/* Stats row */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Entries" value={entries.length} icon={BookOpen} color="blue" />
          <StatCard label="Approved" value={analytics.totalApproved} icon={CheckCircle} color="green" />
          <StatCard label="Pending" value={analytics.totalPending} icon={Clock} color="amber" />
          <StatCard
            label="Overall Score"
            value={analytics.overallAverage > 0 ? analytics.overallAverage.toFixed(1) : '—'}
            icon={TrendingUp}
            color="purple"
            sub="/ 4.0"
          />
        </motion.div>

        {/* Chart + Subject cards */}
        <div className="grid lg:grid-cols-3 gap-5">
          <motion.div variants={item} className="lg:col-span-2">
            <ChartContainer
              radarData={analytics.radarData}
              termData={analytics.termData}
              categoryAverages={analytics.categoryAverages}
              title="ATL Performance Overview"
            />
          </motion.div>

          {/* Subject breakdown — only the student's enrolled subjects */}
          <motion.div variants={item} className="space-y-3">
            <h3 className="section-title px-0.5">My Subjects</h3>
            {(userDoc?.subjects ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 px-0.5">No subjects enrolled yet.</p>
            ) : (userDoc.subjects).map(sub => {
              const subjectEntries = analytics.approvedEntries.filter(e => e.subject === sub.name)
              const avg = subjectEntries.length
                ? (subjectEntries.reduce((s, e) => s + (e.teacherScore ?? e.score), 0) / subjectEntries.length).toFixed(1)
                : null

              // Teacher's unit ratings for this subject
              const subTeacherRatings = unitRatings.filter(r => r.subject === sub.name)
              const teacherAtlMap = ATL_CATEGORY_KEYS.reduce((acc, cat) => {
                const catR = subTeacherRatings.filter(r => r.atl === cat)
                if (catR.length > 0) {
                  const avgScore = catR.reduce((s, r) => s + (SCORE_MAP[r.level] ?? 0), 0) / catR.length
                  acc[cat] = SCORE_LABEL[Math.round(avgScore)]
                }
                return acc
              }, {})
              const hasTeacherRating = Object.keys(teacherAtlMap).length > 0

              return (
                <div key={sub.name} className="card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{sub.name}</span>
                    {avg
                      ? <span className="text-sm font-semibold text-navy-700">{avg}<span className="text-slate-400 font-normal text-xs">/4</span></span>
                      : <span className="text-xs text-slate-400">No data</span>
                    }
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{sub.teacher}</p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-navy-600 transition-all duration-500"
                      style={{ width: avg ? `${(avg / 4) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {subjectEntries.length} approved {subjectEntries.length === 1 ? 'entry' : 'entries'}
                  </p>

                  {/* Teacher's unit-based evaluation */}
                  {hasTeacherRating && (
                    <div className="mt-3 pt-3 border-t border-slate-50">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        Teacher's Evaluation
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(teacherAtlMap).map(([cat, label]) => {
                          const { color, bg } = ATL_CATEGORIES[cat]
                          return (
                            <span
                              key={cat}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: bg, color }}
                            >
                              {cat.split('-')[0]}: {label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </motion.div>
        </div>

        {/* Recent reflections */}
        <motion.div variants={item}>
          <Card>
            <CardHeader
              title="Recent Reflections"
              action={
                <Link to="/analytics" className="text-xs text-navy-600 hover:underline">View all</Link>
              }
            />
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentEntries.length === 0 ? (
              <EmptyReflections />
            ) : (
              <div className="space-y-3">
                {recentEntries.map(entry => (
                  <ReflectionRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* ATL category cards */}
        <motion.div variants={item}>
          <h3 className="section-title mb-3">ATL Skills Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ATL_CATEGORY_KEYS.map(cat => {
              const { color, bg } = ATL_CATEGORIES[cat]
              const val = analytics.categoryAverages[cat]
              return (
                <div key={cat} className="card p-4">
                  <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: bg }}>
                    <span className="text-base" style={{ color }}>{cat[0]}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 leading-tight">{cat}</p>
                  <p className="text-xl font-semibold mt-1" style={{ color }}>
                    {val > 0 ? val.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-slate-400">/ 4.0</p>
                </div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </PageLayout>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  const palette = {
    blue:   { bg: '#eff6ff', color: '#3b82f6' },
    green:  { bg: '#f0fdf4', color: '#22c55e' },
    amber:  { bg: '#fffbeb', color: '#f59e0b' },
    purple: { bg: '#faf5ff', color: '#a855f7' },
  }
  const { bg, color: c } = palette[color]
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Icon size={15} style={{ color: c }} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-slate-900">
        {value}{sub && <span className="text-sm text-slate-400 font-normal ml-0.5">{sub}</span>}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function ReflectionRow({ entry }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <div
        className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
        style={{ backgroundColor: ATL_CATEGORIES[entry.atlCategory]?.bg ?? '#f8fafc' }}
      >
        <span className="text-sm font-semibold" style={{ color: ATL_CATEGORIES[entry.atlCategory]?.color ?? '#64748b' }}>
          {entry.atlCategory?.[0]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-medium text-slate-800">{entry.subject}</span>
          <CategoryBadge category={entry.atlCategory} />
          <StatusBadge status={entry.approvalStatus} />
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{truncate(entry.reflection, 80)}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <LevelBadge level={entry.selfAssessment} />
        <p className="text-[10px] text-slate-400 mt-1">{formatDate(entry.createdAt)}</p>
      </div>
    </div>
  )
}

function EmptyReflections() {
  return (
    <div className="py-10 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-navy-50 flex items-center justify-center">
        <PenLine size={20} className="text-navy-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">No entries yet</p>
        <p className="text-xs text-slate-400 mt-0.5">Start tracking your ATL skills by submitting a reflection.</p>
      </div>
      <Link to="/reflect">
        <Button size="sm">Create first entry</Button>
      </Link>
    </div>
  )
}

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
