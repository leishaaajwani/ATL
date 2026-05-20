import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PenLine, Clock, CheckCircle, XCircle, TrendingUp, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useStudentEntries } from '../hooks/useATLEntries'
import { useAnalytics } from '../hooks/useAnalytics'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { LevelBadge, CategoryBadge, StatusBadge } from '../components/ui/Badge'
import ChartContainer from '../components/charts/ChartContainer'
import { SUBJECTS, ATL_CATEGORIES, ATL_CATEGORY_KEYS } from '../utils/atlFramework'
import { formatDate, truncate } from '../utils/helpers'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function StudentDashboard() {
  const { userDoc } = useAuth()
  const { entries, loading } = useStudentEntries(userDoc?.uid)
  const analytics = useAnalytics(entries)

  const recentEntries = entries.slice(0, 5)

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

          {/* Subject breakdown */}
          <motion.div variants={item} className="space-y-3">
            <h3 className="section-title px-0.5">Subject Breakdown</h3>
            {SUBJECTS.map(subject => {
              const subjectEntries = analytics.approvedEntries.filter(e => e.subject === subject)
              const avg = subjectEntries.length
                ? (subjectEntries.reduce((s, e) => s + (e.teacherScore ?? e.score), 0) / subjectEntries.length).toFixed(1)
                : null
              return (
                <div key={subject} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-800">{subject}</span>
                    {avg
                      ? <span className="text-sm font-semibold text-navy-700">{avg}<span className="text-slate-400 font-normal text-xs">/4</span></span>
                      : <span className="text-xs text-slate-400">No data</span>
                    }
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-navy-600 transition-all duration-500"
                      style={{ width: avg ? `${(avg / 4) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {subjectEntries.length} approved {subjectEntries.length === 1 ? 'entry' : 'entries'}
                  </p>
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
