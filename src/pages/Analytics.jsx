import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useStudentEntries, useAllEntries } from '../hooks/useATLEntries'
import { useAnalytics } from '../hooks/useAnalytics'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import { LevelBadge, CategoryBadge, StatusBadge } from '../components/ui/Badge'
import ChartContainer from '../components/charts/ChartContainer'
import { SUBJECTS, ATL_CATEGORIES, ATL_CATEGORY_KEYS, TERMS } from '../utils/atlFramework'
import { formatDate, groupBy } from '../utils/helpers'
import { useState, useEffect } from 'react'
import { Filter } from 'lucide-react'
import { subscribeToStudentTeacherRatings } from '../firebase/firestore'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export default function Analytics() {
  const { userDoc, isTeacher } = useAuth()
  const [selectedStudent, setSelectedStudent] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterTerm, setFilterTerm] = useState('all')

  const { entries: allEntries, loading } = useAllEntries()
  const { entries: myEntries } = useStudentEntries(userDoc?.uid)

  const sourceEntries = isTeacher
    ? (selectedStudent === 'all' ? allEntries : allEntries.filter(e => e.studentId === selectedStudent))
    : myEntries

  const filtered = sourceEntries.filter(e => {
    if (filterSubject !== 'all' && e.subject !== filterSubject) return false
    if (filterTerm !== 'all' && e.term !== filterTerm) return false
    return true
  })

  const analytics = useAnalytics(filtered)

  const students = isTeacher
    ? [...new Map(allEntries.map(e => [e.studentId, { id: e.studentId, name: e.studentName }])).values()]
    : []

  // Teacher ratings for comparison
  const [teacherRatings, setTeacherRatings] = useState([])
  const [selectedRatingTerm, setSelectedRatingTerm] = useState(null)

  const comparisonStudentId = isTeacher
    ? (selectedStudent !== 'all' ? selectedStudent : null)
    : userDoc?.uid

  useEffect(() => {
    if (!comparisonStudentId) { setTeacherRatings([]); return }
    const unsub = subscribeToStudentTeacherRatings(comparisonStudentId, ratings => {
      setTeacherRatings(ratings)
      if (ratings.length > 0) setSelectedRatingTerm(ratings[0].term)
    })
    return unsub
  }, [comparisonStudentId])

  const activeTRating = teacherRatings.find(r => r.term === selectedRatingTerm)

  const comparisonData = ATL_CATEGORY_KEYS.map(cat => ({
    name: cat === 'Self-management' ? 'Self-Mgmt' : cat,
    'Your Rating': analytics.categoryAverages[cat] > 0
      ? parseFloat(analytics.categoryAverages[cat].toFixed(2)) : null,
    'Teacher Rating': activeTRating?.ratings?.[cat] ?? null,
  }))

  const hasComparison = teacherRatings.length > 0

  const journalEntries = filtered.slice().sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0
    const tb = b.createdAt?.toMillis?.() ?? 0
    return tb - ta
  })

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isTeacher ? 'Class ATL performance overview' : 'Your ATL skill progression'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Filter:</span>
            {isTeacher && (
              <select
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
                className="input-base py-1.5 text-xs w-auto min-w-[140px]"
              >
                <option value="all">All students</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="input-base py-1.5 text-xs w-auto min-w-[120px]"
            >
              <option value="all">All subjects</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterTerm}
              onChange={e => setFilterTerm(e.target.value)}
              className="input-base py-1.5 text-xs w-auto min-w-[120px]"
            >
              <option value="all">All terms</option>
              {TERMS.map(t => <option key={t} value={t}>{t} of Term</option>)}
            </select>
          </div>
        </div>

        {/* Stat summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Approved Entries" value={analytics.totalApproved} color="#10b981" />
          <SummaryCard label="Pending Review" value={analytics.totalPending} color="#f59e0b" />
          <SummaryCard label="Overall Score" value={analytics.overallAverage > 0 ? analytics.overallAverage.toFixed(1) : '—'} color="#6366f1" sub="/4" />
          <SummaryCard label="Total Reflections" value={filtered.length} color="#3b82f6" />
        </div>

        {/* Charts */}
        <ChartContainer
          radarData={analytics.radarData}
          termData={analytics.termData}
          categoryAverages={analytics.categoryAverages}
          title="ATL Category Performance"
        />

        {/* Teacher vs Student comparison */}
        {(hasComparison || isTeacher) && (
          <Card>
            <CardHeader
              title="Self vs Teacher Assessment"
              subtitle={hasComparison ? `${teacherRatings.length} teacher rating(s)` : 'No teacher ratings yet'}
            />
            {hasComparison ? (
              <div className="space-y-4">
                {/* Term selector */}
                {teacherRatings.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {teacherRatings.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRatingTerm(r.term)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          selectedRatingTerm === r.term
                            ? 'bg-navy-700 text-white border-navy-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {r.term}
                      </button>
                    ))}
                  </div>
                )}
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis domain={[0, 4]} tickCount={5} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      formatter={(v, name) => [v !== null ? v : '—', name]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Your Rating" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Teacher Rating" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                  {comparisonData.map(d => {
                    const diff = d['Teacher Rating'] !== null && d['Your Rating'] !== null
                      ? (d['Teacher Rating'] - d['Your Rating']).toFixed(1)
                      : null
                    return (
                      <div key={d.name} className="text-center">
                        <p className="text-[10px] text-slate-400 mb-1">{d.name}</p>
                        {diff !== null && (
                          <span className={`text-xs font-semibold ${
                            diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-400">
                {isTeacher
                  ? 'Select a student and use the Students page to add a term rating.'
                  : 'Your teacher has not submitted a rating yet.'}
              </div>
            )}
          </Card>
        )}

        {/* Category breakdown table */}
        <Card>
          <CardHeader title="Category Breakdown" subtitle="Approved entries only" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500">Category</th>
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500">Entries</th>
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500">Avg Score</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500">Progress</th>
                </tr>
              </thead>
              <tbody>
                {ATL_CATEGORY_KEYS.map(cat => {
                  const { color, bg } = ATL_CATEGORIES[cat]
                  const val = analytics.categoryAverages[cat]
                  const count = analytics.approvedEntries.filter(e => e.atlCategory === cat).length
                  return (
                    <tr key={cat} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: bg, color }}>
                            {cat[0]}
                          </div>
                          <span className="font-medium text-slate-800">{cat}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">{count}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold" style={{ color }}>{val > 0 ? val.toFixed(2) : '—'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${(val / 4) * 100}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8">{Math.round((val / 4) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Reflection Journal */}
        <Card>
          <CardHeader title="Reflection Journal" subtitle={`${journalEntries.length} entries`} />
          {journalEntries.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No entries match your filters.</div>
          ) : (
            <div className="space-y-3">
              {journalEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">{entry.subject}</span>
                      <CategoryBadge category={entry.atlCategory} />
                      <StatusBadge status={entry.approvalStatus} />
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <LevelBadge level={entry.selfAssessment} />
                      <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(entry.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-1 font-medium">{entry.substrand}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{entry.reflection}</p>
                  {entry.teacherFeedback && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border-l-2 border-slate-300">
                      <p className="text-xs font-medium text-slate-500 mb-0.5">Teacher feedback</p>
                      <p className="text-sm text-slate-700">{entry.teacherFeedback}</p>
                      {entry.teacherScore && entry.teacherScore !== entry.score && (
                        <p className="text-xs text-slate-400 mt-1">
                          Score overridden: <span className="text-slate-600 font-medium">{entry.teacherScore}/4</span>
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  )
}

function SummaryCard({ label, value, color, sub }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-semibold text-slate-900" style={{ color }}>
        {value}{sub && <span className="text-sm text-slate-400 font-normal ml-0.5">{sub}</span>}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
