import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Plus, Clock, GraduationCap, BookOpen } from 'lucide-react'
import { useAuth, homeFor } from '../contexts/AuthContext'
import { getSections, createSection, requestEnrollment, getSubjects } from '../api/client'
import { PageLoader } from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

// One page, two jobs. A teacher declares the classes they teach. A student picks
// the classes they are in and waits for the teacher to confirm, which is the
// check that stops a wrong pick becoming real data.

export default function Setup() {
  const { profile, isTeacher, refresh } = useAuth()
  const navigate = useNavigate()
  const [sections, setSections] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getSections()
      .then(r => setSections(r.sections))
      .catch(() => toast.error('Could not load classes'))
      .finally(() => setLoading(false))
  }, [])

  async function reload() {
    const r = await getSections()
    setSections(r.sections)
    await refresh()
  }

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-navy-900 text-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <p className="text-gold-400 text-xs font-semibold tracking-widest uppercase mb-2">
            GEMS Modern Academy
          </p>
          <h1 className="text-2xl font-semibold">
            {isTeacher ? 'Set up your classes' : 'Choose your subjects'}
          </h1>
          <p className="text-navy-200 text-sm mt-1.5 leading-relaxed">
            {isTeacher
              ? 'Add each class you teach this year. Students will join these, and you confirm them.'
              : 'Pick the classes you are in. Your teacher confirms each one before it becomes active.'}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {isTeacher
          ? <TeacherSetup sections={sections} onChange={reload} />
          : <StudentSetup sections={sections} onChange={reload} />}

        {((isTeacher && sections.length > 0) ||
          (!isTeacher && sections.some(s => s.myStatus))) && (
          <div className="mt-8 flex justify-end">
            <button className="btn-accent" onClick={() => navigate(homeFor(profile?.role))}>
              Continue to dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// ── Teacher ──────────────────────────────────────────────────────────────────

function TeacherSetup({ sections, onChange }) {
  const [subject, setSubject]   = useState('')
  const [grade, setGrade]       = useState('DP1')
  const [saving, setSaving]     = useState(false)
  const [subjects, setSubjects] = useState([])

  useEffect(() => { getSubjects().then(setSubjects).catch(() => {}) }, [])

  async function add(e) {
    e.preventDefault()
    if (!subject) return toast.error('Pick a subject')
    setSaving(true)
    try {
      await createSection({ subjectId: Number(subject), grade })
      toast.success('Class added')
      setSubject('')
      await onChange()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Add a class</h2>
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
          <select className="input-base" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">Select subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input-base sm:w-28" value={grade} onChange={e => setGrade(e.target.value)}>
            <option value="DP1">DP1</option>
            <option value="DP2">DP2</option>
          </select>
          <button className="btn-primary" disabled={saving}>
            <Plus size={15} /> Add
          </button>
        </div>
      </form>

      {sections.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No classes yet"
          body="Add the first class you teach. You can add more at any time."
        />
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-800 px-1">
            Your classes ({sections.length})
          </h2>
          {sections.map(s => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{s.subjectName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {s.grade}
                  {s.activeStudents > 0 && ` · ${s.activeStudents} student${s.activeStudents === 1 ? '' : 's'}`}
                  {s.pendingStudents > 0 && ` · ${s.pendingStudents} awaiting confirmation`}
                </p>
              </div>
              {s.pendingStudents > 0
                ? <span className="badge bg-gold-100 text-gold-800">
                    <Clock size={11} /> {s.pendingStudents} to confirm
                  </span>
                : <Check size={16} className="text-emerald-500" />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Student ──────────────────────────────────────────────────────────────────

function StudentSetup({ sections, onChange }) {
  const [busy, setBusy] = useState(null)

  async function join(sectionId, label) {
    setBusy(sectionId)
    try {
      await requestEnrollment(sectionId)
      toast.success(`Requested ${label}. Your teacher will confirm it.`)
      await onChange()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No classes are available yet"
        body="Your teachers have not set up their classes. Check back once they have."
      />
    )
  }

  // Group by subject so a student choosing between two teachers sees them together
  const bySubject = sections.reduce((acc, s) => {
    (acc[s.subjectName] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {Object.entries(bySubject).map(([subjectName, list]) => (
        <div key={subjectName}>
          <h2 className="text-sm font-semibold text-slate-800 mb-2 px-1">{subjectName}</h2>
          <div className="space-y-2">
            {list.map(s => (
              <div key={s.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{s.teacherName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.grade}</p>
                </div>
                {s.myStatus === 'active'  ? <span className="badge bg-emerald-50 text-emerald-700"><Check size={11} /> Confirmed</span>
                : s.myStatus === 'pending' ? <span className="badge bg-gold-100 text-gold-800"><Clock size={11} /> Awaiting teacher</span>
                : s.myStatus === 'dropped' ? <span className="badge bg-slate-100 text-slate-500">Not in this class</span>
                : <button className="btn-secondary !py-2 !px-4" disabled={busy === s.id}
                    onClick={() => join(s.id, `${subjectName} with ${s.teacherName}`)}>
                    {busy === s.id ? 'Requesting' : 'This is my class'}
                  </button>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-navy-50 flex items-center justify-center mx-auto mb-3">
        <Icon size={20} className="text-navy-700" />
      </div>
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">{body}</p>
    </div>
  )
}

