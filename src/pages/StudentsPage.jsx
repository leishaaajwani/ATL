import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { subscribeToStudents } from '../firebase/firestore'
import { useAllEntries } from '../hooks/useATLEntries'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import { ATL_CATEGORIES, ATL_CATEGORY_KEYS } from '../utils/atlFramework'
import { average } from '../utils/helpers'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const { entries } = useAllEntries()

  useEffect(() => {
    const unsub = subscribeToStudents(setStudents)
    return unsub
  }, [])

  return (
    <PageLayout>
      <div className="space-y-5">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-sm text-slate-500 mt-0.5">{students.length} enrolled students</p>
        </div>

        <div className="grid gap-4">
          {students.map((student, i) => {
            const sEntries   = entries.filter(e => e.studentId === student.id)
            const approved   = sEntries.filter(e => e.approvalStatus === 'approved')
            const pending    = sEntries.filter(e => e.approvalStatus === 'pending')

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
                transition={{ delay: i * 0.05 }}
              >
                {/* Student header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {student.photoURL
                      ? <img src={student.photoURL} alt="" className="w-10 h-10 rounded-full" />
                      : <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-semibold">
                          {(student.displayName ?? '?').charAt(0)}
                        </div>
                    }
                    <div>
                      <p className="font-semibold text-slate-900">{student.displayName}</p>
                      <p className="text-xs text-slate-400">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs text-slate-500">
                    <span className="badge bg-green-50 text-green-700">{approved.length} approved</span>
                    {pending.length > 0 && (
                      <span className="badge bg-amber-50 text-amber-700">{pending.length} pending</span>
                    )}
                  </div>
                </div>

                {/* ATL category mini-bars */}
                <div className="grid grid-cols-5 gap-2">
                  {ATL_CATEGORY_KEYS.map(cat => {
                    const { color, bg } = ATL_CATEGORIES[cat]
                    const val = catAverages[cat]
                    return (
                      <div key={cat} className="text-center">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                          <div
                            className="h-1.5 rounded-full transition-all"
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
          {students.length === 0 && (
            <div className="card p-10 text-center text-sm text-slate-400">No students enrolled yet.</div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
