import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useStudentEntries, useAllEntries } from '../hooks/useATLEntries'
import { useAnalytics } from '../hooks/useAnalytics'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import { LevelBadge, CategoryBadge, StatusBadge } from '../components/ui/Badge'
import ChartContainer from '../components/charts/ChartContainer'
import { ATL_CATEGORIES, ATL_CATEGORY_KEYS, SCORE_MAP } from '../utils/atlFramework'
import { formatDate, getMyStudents } from '../utils/helpers'
import { useState, useEffect } from 'react'
import { Filter } from 'lucide-react'
import {
  subscribeToStudentUnitRatings,
  subscribeToStudents,
} from '../firebase/firestore'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const REPORT_TERMS = ['Term 1', 'Term 2', 'Term 3']

export default function Analytics() {
  const { user, userDoc, isTeacher } = useAuth()
  const [selectedStudent, setSelectedStudent]       = useState('all')
  const [filterSubject, setFilterSubject]           = useState('all')
  const [filterTerm, setFilterTerm]                 = useState('all')
  const [filterTeacherSubject, setFilterTeacherSubject] = useState('all')

  const { entries: allEntries } = useAllEntries()
  const { entries: myEntries }  = useStudentEntries(userDoc?.uid)

  // Teacher: get own students only
  const [allStudents, setAllStudents] = useState([])
  useEffect(() => {
    if (!isTeacher) return
    const unsub = subscribeToStudents(setAllStudents)
    return unsub
  }, [isTeacher])
  const allMyStudents = isTeacher
    ? getMyStudents(userDoc?.displayName, userDoc?.teachingGroups, allStudents)
    : []

  // Teacher subject filter: narrows student list to those in a specific subject
  const teacherSubjects = [...new Set((userDoc?.teachingGroups ?? []).map(g => g.subject))].sort()
  const myStudents = isTeacher && filterTeacherSubject !== 'all'
    ? allMyStudents.filter(s =>
        (s.subjects ?? []).some(sub =>
          sub.name === filterTeacherSubject &&
          String(sub.teacher ?? '').trim().toLowerCase() === String(userDoc?.displayName ?? '').trim().toLowerCase(),
        ),
      )
    : allMyStudents

  const sourceEntries = isTeacher
    ? (selectedStudent === 'all'
        ? allEntries.filter(e => myStudents.some(s => s.id === e.studentId))
        : allEntries.filter(e => e.studentId === selectedStudent))
    : myEntries

  // Subject options — student sees only enrolled subjects
  const subjectOptions = isTeacher
    ? [...new Set(sourceEntries.map(e => e.subject))].sort()
    : (userDoc?.subjects ?? []).map(s => s.name)

  // Term options — use actual terms in entries
  const termOptions = [...new Set(sourceEntries.map(e => e.term).filter(Boolean))].sort()

  const filtered = sourceEntries.filter(e => {
    if (filterSubject !== 'all' && e.subject !== filterSubject) return false
    if (filterTerm !== 'all' && e.term !== filterTerm) return false
    return true
  })

  const analytics = useAnalytics(filtered)

  // Unit ratings for comparison (student's own, or selected student for teacher)
  const comparisonStudentId = isTeacher
    ? (selectedStudent !== 'all' ? selectedStudent : null)
    : user?.uid

  const [unitRatings, setUnitRatings] = useState([])
  const [selectedRatingTerm, setSelectedRatingTerm] = useState('all')

  useEffect(() => {
    if (!comparisonStudentId) { setUnitRatings([]); return }
    const unsub = subscribeToStudentUnitRatings(comparisonStudentId, setUnitRatings)
    return unsub
  }, [comparisonStudentId])

  // Build comparison data: student avg self-assessment vs teacher avg unit rating, per ATL
  const ratingTerms = [...new Set(unitRatings.map(r => r.term))].sort()
  const filteredRatings = selectedRatingTerm === 'all'
    ? unitRatings
    : unitRatings.filter(r => r.term === selectedRatingTerm)

  // Label for the student's bar — student's own name when teacher is viewing a specific student
  const selectedStudentDoc = myStudents.find(s => s.id === selectedStudent)
  const studentBarLabel = isTeacher && selectedStudentDoc
    ? `${selectedStudentDoc.displayName?.split(' ')[0]}'s Rating`
    : 'Your Rating'

  const comparisonData = ATL_CATEGORY_KEYS.map(cat => {
    const studentEntries = analytics.approvedEntries.filter(e => e.atlCategory === cat)
    const studentAvg = studentEntries.length
      ? studentEntries.reduce((s, e) => s + (SCORE_MAP[e.selfAssessment] ?? 0), 0) / studentEntries.length
      : null

    const catRatings = filteredRatings.filter(r => r.atl === cat)
    const teacherAvg = catRatings.length
      ? catRatings.reduce((s, r) => s + (SCORE_MAP[r.level] ?? 0), 0) / catRatings.length
      : null

    return {
      name: cat === 'Self-management' ? 'Self-Mgmt' : cat,
      [studentBarLabel]: studentAvg !== null ? parseFloat(studentAvg.toFixed(2)) : null,
      'Teacher Rating':  teacherAvg !== null ? parseFloat(teacherAvg.toFixed(2)) : null,
    }
  })

  const hasUnitRatings = unitRatings.length > 0

  const journalEntries = filtered.slice().sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0
    const tb = b.createdAt?.toMillis?.() ?? 0
    return tb - ta
  })

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isTeacher ? 'Class ATL performance overview' : 'Your ATL skill progression'}
          </p>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Filter:</span>

            {isTeacher && (
              <>
                <select
                  value={filterTeacherSubject}
                  onChange={e => { setFilterTeacherSubject(e.target.value); setSelectedStudent('all') }}
                  className="input-base py-1.5 text-xs w-auto min-w-[160px]"
                >
                  <option value="all">All subjects</option>
                  {teacherSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={selectedStudent}
                  onChange={e => setSelectedStudent(e.target.value)}
                  className="input-base py-1.5 text-xs w-auto min-w-[140px]"
                >
                  <option value="all">All students</option>
                  {myStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.displayName}</option>
                  ))}
                </select>
              </>
            )}

            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="input-base py-1.5 text-xs w-auto min-w-[140px]"
            >
              <option value="all">All subjects</option>
              {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={filterTerm}
              onChange={e => setFilterTerm(e.target.value)}
              className="input-base py-1.5 text-xs w-auto min-w-[100px]"
            >
              <option value="all">All terms</option>
              {termOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Stat summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Approved Entries" value={analytics.totalApproved} color="#10b981" />
          <SummaryCard label="Pending Review"   value={analytics.totalPending}  color="#f59e0b" />
          <SummaryCard label="Overall Score"
            value={analytics.overallAverage > 0 ? analytics.overallAverage.toFixed(1) : '—'}
            color="#6366f1" sub="/4"
          />
          <SummaryCard label="Total Reflections" value={filtered.length} color="#3b82f6" />
        </div>

        {/* Charts */}
        <ChartContainer
          radarData={analytics.radarData}
          termData={analytics.termData}
          categoryAverages={analytics.categoryAverages}
          title="ATL Category Performance"
        />

        {/* Self vs Teacher comparison (unit ratings) */}
        <Card>
          <CardHeader
            title={isTeacher && selectedStudentDoc ? `${selectedStudentDoc.displayName?.split(' ')[0]}'s Self vs Your Rating` : 'Self vs Teacher Assessment'}
            subtitle={
              isTeacher && selectedStudent === 'all'
                ? 'Select a student above to compare their self-assessment with your unit ratings'
                : hasUnitRatings ? `${unitRatings.length} teacher rating(s) across units` : 'No teacher ratings yet'
            }
          />
          {isTeacher && selectedStudent === 'all' ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Select a student from the filter above to see their self-assessment compared with your unit ratings.
            </div>
          ) : hasUnitRatings ? (
            <div className="space-y-4">
              {/* Term filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedRatingTerm('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedRatingTerm === 'all'
                      ? 'bg-navy-700 text-white border-navy-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  All Terms
                </button>
                {ratingTerms.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedRatingTerm(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedRatingTerm === t
                        ? 'bg-navy-700 text-white border-navy-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Grouped bar chart */}
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]}
                    tickFormatter={v => (['', 'E', 'D', 'P', 'A'][v] || '')}
                    tick={{ fontSize: 11, fill: '#94a3b8' }} width={22} />
                  <Tooltip
                    formatter={(v, name) => [
                      v !== null ? (['', 'Emerging', 'Developing', 'Proficient', 'Advanced'][Math.round(v)] || v) : '—',
                      name,
                    ]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey={studentBarLabel} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Teacher Rating"  fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>

              {/* Diff row */}
              <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                {comparisonData.map(d => {
                  const diff = d['Teacher Rating'] !== null && d[studentBarLabel] !== null
                    ? (d['Teacher Rating'] - d[studentBarLabel]).toFixed(1)
                    : null
                  return (
                    <div key={d.name} className="text-center">
                      <p className="text-[10px] text-slate-400 mb-1">{d.name}</p>
                      {diff !== null ? (
                        <span className={`text-xs font-semibold ${
                          Number(diff) > 0 ? 'text-emerald-600' : Number(diff) < 0 ? 'text-rose-500' : 'text-slate-400'
                        }`}>
                          {Number(diff) > 0 ? `+${diff}` : diff}
                        </span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              {isTeacher
                ? 'Go to Reports to add unit ratings for this student.'
                : 'Your teacher has not submitted unit ratings yet.'}
            </div>
          )}
        </Card>

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
                  const val   = analytics.categoryAverages[cat]
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
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${(val / 4) * 100}%`, backgroundColor: color }} />
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

        {/* Reflection Journal — students only */}
        {!isTeacher && <Card>
          <CardHeader title="Reflection Journal" subtitle={`${journalEntries.length} entries`} />
          {journalEntries.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No entries match your filters.</div>
          ) : (
            <div className="space-y-3">
              {journalEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">{entry.subject}</span>
                      {entry.unitName && (
                        <span className="text-xs text-slate-400">— {entry.unitName}</span>
                      )}
                      <CategoryBadge category={entry.atlCategory} />
                      <StatusBadge status={entry.approvalStatus} />
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <LevelBadge level={entry.selfAssessment} />
                      <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(entry.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{entry.reflection}</p>
                  {entry.teacherFeedback && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border-l-2 border-slate-300">
                      <p className="text-xs font-medium text-slate-500 mb-0.5">Teacher feedback</p>
                      <p className="text-sm text-slate-700">{entry.teacherFeedback}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </Card>}
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
