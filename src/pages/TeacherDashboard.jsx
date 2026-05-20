import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, CheckCircle, Users, TrendingUp, ArrowRight, BarChart3 } from 'lucide-react'
import { useAllEntries, usePendingEntries } from '../hooks/useATLEntries'
import { useAnalytics } from '../hooks/useAnalytics'
import { subscribeToStudents } from '../firebase/firestore'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { LevelBadge, CategoryBadge, StatusBadge } from '../components/ui/Badge'
import ChartContainer from '../components/charts/ChartContainer'
import { ATL_CATEGORIES, ATL_CATEGORY_KEYS } from '../utils/atlFramework'
import { formatDate, truncate } from '../utils/helpers'
import { useEffect, useState } from 'react'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function TeacherDashboard() {
  const { entries: allEntries, loading } = useAllEntries()
  const { entries: pendingEntries } = usePendingEntries()
  const analytics = useAnalytics(allEntries)
  const [students, setStudents] = useState([])

  useEffect(() => {
    const unsub = subscribeToStudents(setStudents)
    return unsub
  }, [])

  // Per-student summary
  const studentSummaries = students.map(s => {
    const sEntries = allEntries.filter(e => e.studentId === s.id)
    const approved = sEntries.filter(e => e.approvalStatus === 'approved')
    const scores   = approved.map(e => e.teacherScore ?? e.score)
    const avg      = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    return {
      ...s,
      totalEntries: sEntries.length,
      approvedCount: approved.length,
      pendingCount: sEntries.filter(e => e.approvalStatus === 'pending').length,
      average: avg,
    }
  })

  return (
    <PageLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Class Overview</h1>
            <p className="text-sm text-slate-500 mt-0.5">Monitor student ATL progress and manage approvals</p>
          </div>
          <Link to="/approvals">
            <Button icon={<CheckCircle size={15} />}>
              Review Approvals
              {pendingEntries.length > 0 && (
                <span className="ml-1 bg-white text-navy-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingEntries.length}
                </span>
              )}
            </Button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Students" value={students.length} icon={Users} color="blue" />
          <StatCard label="Total Entries" value={allEntries.length} icon={BarChart3} color="purple" />
          <StatCard label="Pending Review" value={pendingEntries.length} icon={Clock} color="amber" urgent={pendingEntries.length > 0} />
          <StatCard
            label="Class Avg Score"
            value={analytics.overallAverage > 0 ? analytics.overallAverage.toFixed(1) : '—'}
            icon={TrendingUp}
            color="green"
            sub="/4"
          />
        </motion.div>

        {/* Chart + pending preview */}
        <div className="grid lg:grid-cols-3 gap-5">
          <motion.div variants={item} className="lg:col-span-2">
            <ChartContainer
              radarData={analytics.radarData}
              termData={analytics.termData}
              categoryAverages={analytics.categoryAverages}
              title="Class ATL Performance"
            />
          </motion.div>

          {/* Pending queue */}
          <motion.div variants={item}>
            <Card className="h-full">
              <CardHeader
                title="Pending Approvals"
                action={
                  pendingEntries.length > 0 && (
                    <Link to="/approvals" className="text-xs text-navy-600 hover:underline flex items-center gap-1">
                      View all <ArrowRight size={11} />
                    </Link>
                  )
                }
              />
              {pendingEntries.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-2 text-center">
                  <CheckCircle size={24} className="text-green-400" />
                  <p className="text-sm text-slate-500">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingEntries.slice(0, 4).map(entry => (
                    <div key={entry.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-800">{entry.studentName}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(entry.createdAt)}</span>
                      </div>
                      <CategoryBadge category={entry.atlCategory} className="mb-1" />
                      <p className="text-xs text-slate-600 leading-relaxed">{truncate(entry.reflection, 60)}</p>
                    </div>
                  ))}
                  {pendingEntries.length > 4 && (
                    <Link to="/approvals" className="block text-center text-xs text-navy-600 hover:underline py-1">
                      +{pendingEntries.length - 4} more
                    </Link>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Category averages */}
        <motion.div variants={item}>
          <h3 className="section-title mb-3">Class ATL Category Averages</h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {ATL_CATEGORY_KEYS.map(cat => {
              const { color, bg } = ATL_CATEGORIES[cat]
              const val = analytics.categoryAverages[cat]
              return (
                <div key={cat} className="card p-4">
                  <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: bg }}>
                    <span style={{ color }} className="text-sm font-semibold">{cat[0]}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 leading-tight mb-1">{cat}</p>
                  <p className="text-xl font-semibold" style={{ color }}>{val > 0 ? val.toFixed(1) : '—'}</p>
                  <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1">
                    <div className="h-1 rounded-full" style={{ width: `${(val / 4) * 100}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Student progress table */}
        <motion.div variants={item}>
          <Card>
            <CardHeader title="Student Progress" subtitle={`${students.length} students`} />
            {studentSummaries.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No student data yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500">Student</th>
                      <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500">Entries</th>
                      <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500">Approved</th>
                      <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500">Pending</th>
                      <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentSummaries.map(s => (
                      <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {s.photoURL
                              ? <img src={s.photoURL} alt="" className="w-7 h-7 rounded-full" />
                              : <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 text-xs font-semibold">
                                  {(s.displayName ?? '?').charAt(0)}
                                </div>
                            }
                            <div>
                              <p className="font-medium text-slate-900">{s.displayName}</p>
                              <p className="text-xs text-slate-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">{s.totalEntries}</td>
                        <td className="py-3 px-3 text-center text-green-600 font-medium">{s.approvedCount}</td>
                        <td className="py-3 px-3 text-center">
                          {s.pendingCount > 0
                            ? <span className="badge bg-amber-50 text-amber-700">{s.pendingCount}</span>
                            : <span className="text-slate-400">—</span>
                          }
                        </td>
                        <td className="py-3 px-3 text-center">
                          {s.average != null
                            ? <span className="font-semibold text-navy-700">{s.average.toFixed(1)}</span>
                            : <span className="text-slate-400">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </PageLayout>
  )
}

function StatCard({ label, value, icon: Icon, color, sub, urgent }) {
  const palette = {
    blue:   { bg: '#eff6ff', color: '#3b82f6' },
    green:  { bg: '#f0fdf4', color: '#22c55e' },
    amber:  { bg: '#fffbeb', color: '#f59e0b' },
    purple: { bg: '#faf5ff', color: '#a855f7' },
  }
  const { bg, color: c } = palette[color]
  return (
    <div className={`card p-4 ${urgent ? 'border-amber-200' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Icon size={15} style={{ color: c }} />
        </div>
        {urgent && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
      </div>
      <p className="text-2xl font-semibold text-slate-900">
        {value}{sub && <span className="text-sm text-slate-400 font-normal ml-0.5">{sub}</span>}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
