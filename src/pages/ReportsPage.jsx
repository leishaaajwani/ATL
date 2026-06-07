import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Users, FileText } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import {
  subscribeToStudents,
  subscribeToTeacherUnits,
  subscribeToAllEntries,
  saveUnitRating,
  subscribeToTeacherStudentUnitRatings,
} from '../firebase/firestore'
import PageLayout from '../components/layout/PageLayout'
import { ATL_CATEGORIES, ASSESSMENT_LEVELS, SCORE_MAP } from '../utils/atlFramework'
import toast from 'react-hot-toast'

const REPORT_TERMS = ['Term 1', 'Term 2', 'Term 3']

const ATL_COLORS = {
  Communication:    '#6366f1',
  Social:           '#10b981',
  'Self-management':'#f59e0b',
  Research:         '#3b82f6',
  Thinking:         '#ec4899',
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [selectedTerm, setSelectedTerm] = useState('Term 1')
  const [students, setStudents] = useState([])
  const [units, setUnits] = useState([])
  const [allEntries, setAllEntries] = useState([])
  const [openStudent, setOpenStudent] = useState(null)

  useEffect(() => {
    const u1 = subscribeToStudents(setStudents)
    const u2 = subscribeToTeacherUnits(user.uid, setUnits)
    const u3 = subscribeToAllEntries(setAllEntries)
    return () => { u1(); u2(); u3() }
  }, [user])

  const termUnits = units.filter(u => u.term === selectedTerm)

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Term Reports</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Review student ATL evidence and set your final evaluations
            </p>
          </div>
          <Link to="/units" className="btn-ghost text-sm flex items-center gap-1.5 border border-slate-200 px-3 py-2 rounded-xl">
            <FileText size={14} />
            Unit Planning
          </Link>
        </div>

        {/* Term tabs */}
        <div className="flex gap-2">
          {REPORT_TERMS.map(t => (
            <button
              key={t}
              onClick={() => { setSelectedTerm(t); setOpenStudent(null) }}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedTerm === t
                  ? 'bg-navy-700 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Info pill if no units planned */}
        {termUnits.length === 0 && (
          <div className="card p-4 bg-amber-50 border-amber-100 flex items-center gap-3">
            <span className="text-amber-500 text-sm">⚠</span>
            <p className="text-xs text-amber-700">
              No units planned for {selectedTerm} yet.{' '}
              <Link to="/units" className="font-semibold underline">Go to Unit Planning →</Link>
            </p>
          </div>
        )}

        {/* Student list */}
        {students.length === 0 ? (
          <div className="card p-14 text-center">
            <Users size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No students enrolled yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map(student => {
              const termUnitIds = new Set(termUnits.map(u => u.id))
              const studentTermEntries = allEntries.filter(
                e => e.studentId === student.id &&
                     e.approvalStatus === 'approved' &&
                     e.unitId && termUnitIds.has(e.unitId),
              )
              const isOpen = openStudent === student.id

              return (
                <div key={student.id} className="card overflow-hidden">
                  {/* Clickable header */}
                  <button
                    onClick={() => setOpenStudent(isOpen ? null : student.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 text-sm font-bold flex-shrink-0">
                      {(student.displayName ?? '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{student.displayName}</p>
                      <p className="text-xs text-slate-400">
                        {student.grade} · {studentTermEntries.length} approved {selectedTerm} entries
                      </p>
                    </div>
                    <div className="text-slate-400 flex-shrink-0">
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>

                  {/* Expanded report */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="border-t border-slate-100 overflow-hidden"
                      >
                        <StudentReport
                          teacherUid={user.uid}
                          student={student}
                          term={selectedTerm}
                          termUnits={termUnits}
                          studentEntries={studentTermEntries}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

// ─── Student expanded report ───────────────────────────────────────────────────

function StudentReport({ teacherUid, student, term, termUnits, studentEntries }) {
  const [ratings, setRatings] = useState({})   // key: `${unitId}_${atl}` → level string
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    const unsub = subscribeToTeacherStudentUnitRatings(
      teacherUid, student.id, term,
      docs => {
        const map = {}
        docs.forEach(r => { map[`${r.unitId}_${r.atl}`] = r.level })
        setRatings(map)
      },
    )
    return unsub
  }, [teacherUid, student.id, term])

  // Build chart data — one bar group per unit, one bar per ATL skill
  const allSkills = [...new Set(termUnits.flatMap(u => u.atlSkills))]

  const chartData = termUnits.map(unit => {
    const unitEntries = studentEntries.filter(e => e.unitId === unit.id)
    const row = { unit: unit.unitName.length > 14 ? unit.unitName.slice(0, 13) + '…' : unit.unitName }
    unit.atlSkills.forEach(skill => {
      const skillEntries = unitEntries.filter(e => e.atlCategory === skill)
      row[skill] = skillEntries.length
        ? parseFloat((skillEntries.reduce((s, e) => s + (SCORE_MAP[e.selfAssessment] ?? 0), 0) / skillEntries.length).toFixed(2))
        : 0
    })
    return row
  })

  async function handleRate(unitId, atl, level) {
    const key = `${unitId}_${atl}`
    setSaving(key)
    try {
      await saveUnitRating({
        teacherUid,
        studentId: student.id,
        studentName: student.displayName,
        unitId,
        atl,
        level,
        term,
      })
      toast.success('Rating saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(null)
    }
  }

  if (termUnits.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-400">
        No units planned for {term}.{' '}
        <Link to="/units" className="text-indigo-600 hover:underline">Add units →</Link>
      </div>
    )
  }

  const hasEntries = studentEntries.length > 0

  return (
    <div className="p-5 space-y-7">

      {/* ── Chart: student self-assessment per unit ── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Student self-assessment — {term}
        </p>
        {hasEntries ? (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={chartData} barGap={3} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="unit" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                domain={[0, 4]}
                ticks={[1, 2, 3, 4]}
                tickFormatter={v => (['', 'E', 'D', 'P', 'A'][v] || '')}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                width={22}
              />
              <Tooltip
                formatter={(val, name) => [
                  ['', 'Emerging', 'Developing', 'Proficient', 'Advanced'][Math.round(val)] || '—',
                  name,
                ]}
                contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {allSkills.map(skill => (
                <Bar key={skill} dataKey={skill} fill={ATL_COLORS[skill] ?? '#94a3b8'} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-20 flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-xl">
            No approved entries for {term} yet — student hasn't submitted reflections linked to these units
          </div>
        )}
      </div>

      {/* ── Rating table per unit ── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Your final evaluation
          <span className="text-slate-400 font-normal normal-case ml-2">
            — click a level button to set. Student sees this on their Analytics page.
          </span>
        </p>

        <div className="space-y-4">
          {termUnits.map(unit => {
            const unitEntries = studentEntries.filter(e => e.unitId === unit.id)
            return (
              <div key={unit.id} className="rounded-xl border border-slate-100 overflow-hidden">
                {/* Unit header */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">{unit.unitName}</p>
                  <span className="text-[10px] text-slate-400">
                    {unitEntries.length} {unitEntries.length === 1 ? 'entry' : 'entries'} from student
                  </span>
                </div>

                {/* ATL skill rows */}
                <div className="divide-y divide-slate-50">
                  {unit.atlSkills.map(skill => {
                    const skillEntries = unitEntries.filter(e => e.atlCategory === skill)
                    const avgScore = skillEntries.length
                      ? skillEntries.reduce((s, e) => s + (SCORE_MAP[e.selfAssessment] ?? 0), 0) / skillEntries.length
                      : null
                    const avgLabel = avgScore
                      ? ['', 'Emerging', 'Developing', 'Proficient', 'Advanced'][Math.round(avgScore)]
                      : null
                    const currentRating = ratings[`${unit.id}_${skill}`]
                    const isSaving = saving === `${unit.id}_${skill}`
                    const { color, bg } = ATL_CATEGORIES[skill] ?? {}

                    return (
                      <div key={skill} className="flex items-center gap-3 px-4 py-3">
                        {/* Skill name */}
                        <span
                          className="text-xs font-semibold w-28 flex-shrink-0"
                          style={{ color }}
                        >
                          {skill}
                        </span>

                        {/* Student estimate */}
                        <div className="w-24 flex-shrink-0">
                          {avgLabel ? (
                            <span
                              className="text-[10px] px-2 py-1 rounded-lg font-medium"
                              style={{ backgroundColor: bg, color }}
                            >
                              ~{avgLabel}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">no data</span>
                          )}
                        </div>

                        {/* 4-level buttons */}
                        <div className="flex gap-1.5 flex-1">
                          {ASSESSMENT_LEVELS.map(({ value, color: lc, bg: lb }) => (
                            <button
                              key={value}
                              disabled={!!isSaving}
                              onClick={() => handleRate(unit.id, skill, value)}
                              className={`flex-1 py-2 rounded-xl text-[11px] font-bold border-2 transition-all ${
                                currentRating === value
                                  ? 'scale-105 shadow-sm'
                                  : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'
                              }`}
                              style={currentRating === value
                                ? { backgroundColor: lb, borderColor: lc, color: lc }
                                : {}
                              }
                            >
                              {value === 'Emerging' ? 'E' : value === 'Developing' ? 'D' : value === 'Proficient' ? 'P' : 'A'}
                            </button>
                          ))}
                        </div>

                        {/* Current rating label */}
                        <span className="text-xs text-slate-400 w-24 text-right flex-shrink-0">
                          {currentRating ? (
                            <span className="font-medium text-slate-600">→ {currentRating}</span>
                          ) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
