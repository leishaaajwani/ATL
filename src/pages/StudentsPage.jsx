import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check, X, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getRoster, decideEnrollment } from '../api/client'
import PageLayout from '../components/layout/PageLayout'
import { PageLoader } from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function StudentsPage() {
  const { profile, refresh } = useAuth()
  const sections = profile?.sections ?? []

  const [picked_, setSectionId]   = useState('')
  const [students, setStudents]   = useState([])
  const [loading, setLoading]     = useState(false)

  // Derive rather than sync: first class is the default until one is picked.
  const sectionId = picked_ || (sections[0] ? String(sections[0].id) : '')


  async function load() {
    if (!sectionId) return
    setLoading(true)
    try { setStudents((await getRoster(sectionId)).students) }
    catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [sectionId])

  async function decide(enrollmentId, action) {
    try {
      await decideEnrollment(enrollmentId, action)
      toast.success(action === 'approve' ? 'Added to your class' : 'Removed')
      await refresh()
      await load()
    } catch (err) { toast.error(err.message) }
  }

  if (!sections.length) {
    return (
      <PageLayout>
        <div className="card p-10 text-center max-w-md mx-auto">
          <p className="text-sm font-medium text-slate-800">No classes yet</p>
          <Link to="/setup"><button className="btn-primary mt-4">Set up classes</button></Link>
        </div>
      </PageLayout>
    )
  }

  const pending = students.filter(s => s.enrollmentStatus === 'pending')
  const active  = students.filter(s => s.enrollmentStatus === 'active')

  return (
    <PageLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title">Students</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Confirm who is really in your class
            </p>
          </div>
          <select className="input-base w-auto min-w-[220px]" value={sectionId}
            onChange={e => setSectionId(e.target.value)}>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.subjectName} · {s.grade}</option>
            ))}
          </select>
        </div>

        {loading ? <PageLoader /> : (
          <>
            {pending.length > 0 && (
              <div className="card p-4 border-gold-200 bg-gold-50">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={15} className="text-gold-700" />
                  <p className="text-sm font-semibold text-navy-900">
                    {pending.length} {pending.length === 1 ? 'student says' : 'students say'} they are in this class
                  </p>
                </div>
                <div className="space-y-2">
                  {pending.map(s => (
                    <motion.div key={s.enrollmentId} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-white rounded-xl p-3 border border-gold-200/60 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{s.fullName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.email}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button className="p-2 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          title="Not in my class" onClick={() => decide(s.enrollmentId, 'drop')}>
                          <X size={15} />
                        </button>
                        <button className="p-2 rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition-colors"
                          title="Confirm" onClick={() => decide(s.enrollmentId, 'approve')}>
                          <Check size={15} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {active.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-sm font-medium text-slate-800">No confirmed students</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Students pick their own classes when they sign in, and turn up here
                  for you to wave through.
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">Student</th>
                        <th className="text-center py-2.5 px-4 text-xs font-medium text-slate-500">Approved</th>
                        <th className="text-center py-2.5 px-4 text-xs font-medium text-slate-500">Awaiting</th>
                        <th className="py-2.5 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {active.map(s => (
                        <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{s.fullName}</p>
                            <p className="text-xs text-slate-500">{s.email}</p>
                          </td>
                          <td className="py-3 px-4 text-center text-emerald-600 font-medium">{s.approvedCount}</td>
                          <td className="py-3 px-4 text-center">
                            {s.pendingCount > 0
                              ? <span className="badge bg-gold-100 text-gold-800">{s.pendingCount}</span>
                              : <span className="text-slate-300">0</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                              onClick={() => decide(s.enrollmentId, 'drop')}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  )
}
