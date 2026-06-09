import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { subscribeToStudents } from '../firebase/firestore'
import { useAllEntries } from '../hooks/useATLEntries'
import { useAuth } from '../contexts/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import { ATL_CATEGORIES, ATL_CATEGORY_KEYS } from '../utils/atlFramework'
import { average, getMyStudents } from '../utils/helpers'
import { FileText } from 'lucide-react'

const GRADE_TABS = ['All', 'DP1', 'DP2']

export default function StudentsPage() {
  const { userDoc } = useAuth()
  const [allStudents, setAllStudents] = useState([])
  const { entries } = useAllEntries()
  const [gradeFilter, setGradeFilter] = useState('All')

  useEffect(() => {
    const unsub = subscribeToStudents(setAllStudents)
    return unsub
  }, [])

  // Only show students who selected this teacher for one of their subjects
  const myStudents = getMyStudents(userDoc?.displayName, userDoc?.teachingGroups, allStudents)

  // Grade filter
  const displayed = gradeFilter === 'All'
    ? myStudents
    : myStudents.filter(s => s.grade === gradeFilter)

  // Sort alphabetically
  const sorted = [...displayed].sort((a, b) =>
    (a.displayName ?? '').localeCompare(b.displayName ?? ''),
  )

  return (
    <PageLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">My Students</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {myStudents.length} student{myStudents.length !== 1 ? 's' : ''} in your classes
            </p>
          </div>
          <Link to="/reports" className="btn-ghost text-sm flex items-center gap-1.5 border border-slate-200 px-3 py-2 rounded-xl">
            <FileText size={14} />
            Term Reports
          </Link>
        </div>

        {/* Grade filter tabs */}
        <div className="flex gap-2">
          {GRADE_TABS.map(g => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                gradeFilter === g
                  ? 'bg-navy-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {sorted.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm font-medium text-slate-600">No students yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Students will appear here once they sign up and select you as their teacher.
              </p>
            </div>
          ) : sorted.map((student, i) => {
            const sEntries = entries.filter(e => e.studentId === student.id)
            const approved = sEntries.filter(e => e.approvalStatus === 'approved')
            const pending  = sEntries.filter(e => e.approvalStatus === 'pending')

            const catAverages = ATL_CATEGORY_KEYS.reduce((acc, cat) => {
              const catE = approved.filter(e => e.atlCategory === cat)
              const scores = catE.map(e => e.teacherScore ?? e.score)
              acc[cat] = scores.length ? average(scores) : null
              return acc
            }, {})

            return (
              <motion.div
                key={student.id}
                className="card p-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* Student header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {student.photoURL
                      ? <img src={student.photoURL} alt="" className="w-10 h-10 rounded-full" />
                      : <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-semibold">
                          {(student.displayName ?? '?')[0]}
                        </div>
                    }
                    <div>
                      <p className="font-semibold text-slate-900">{student.displayName}</p>
                      <p className="text-xs text-slate-400">{student.grade} · {student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-green-50 text-green-700">{approved.length} approved</span>
                    {pending.length > 0 && (
                      <span className="badge bg-amber-50 text-amber-700">{pending.length} pending</span>
                    )}
                  </div>
                </div>

                {/* ATL category mini-bars */}
                <div className="grid grid-cols-5 gap-2">
                  {ATL_CATEGORY_KEYS.map(cat => {
                    const { color } = ATL_CATEGORIES[cat]
                    const val = catAverages[cat]
                    return (
                      <div key={cat} className="text-center">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: val ? `${(val / 4) * 100}%` : '0%', backgroundColor: color }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{cat.split('-')[0]}</p>
                        <p className="text-[11px] font-medium" style={{ color }}>
                          {val ? val.toFixed(1) : '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </PageLayout>
  )
}
