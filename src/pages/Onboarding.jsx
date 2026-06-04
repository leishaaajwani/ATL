import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { saveStudentProfile, saveTeacherProfile } from '../firebase/auth'
import { SUBJECTS, SUBJECT_TEACHERS, GRADES } from '../utils/atlFramework'
import { GraduationCap, BookOpen, Plus, Trash2, ChevronRight } from 'lucide-react'

export default function Onboarding() {
  const { user, refreshUserDoc } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)   // 1: role, 2: profile, 3: subjects (student only)
  const [role, setRole] = useState(null)
  const [saving, setSaving] = useState(false)

  // Student fields
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [grade, setGrade] = useState('')
  const [subjects, setSubjects] = useState([{ name: '', teacher: '' }])

  // Teacher fields
  const [teacherName, setTeacherName] = useState(user?.displayName ?? '')
  const [teachingGroups, setTeachingGroups] = useState([{ subject: '', grade: '' }])

  // ── Subject row helpers ────────────────────────────────────────────────────

  function updateSubject(index, field, value) {
    setSubjects(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'name') next[index].teacher = '' // reset teacher when subject changes
      return next
    })
  }

  function addSubjectRow() {
    setSubjects(prev => [...prev, { name: '', teacher: '' }])
  }

  function removeSubjectRow(index) {
    setSubjects(prev => prev.filter((_, i) => i !== index))
  }

  // ── Teaching group helpers ─────────────────────────────────────────────────

  function updateGroup(index, field, value) {
    setTeachingGroups(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addGroupRow() {
    setTeachingGroups(prev => [...prev, { subject: '', grade: '' }])
  }

  function removeGroupRow(index) {
    setTeachingGroups(prev => prev.filter((_, i) => i !== index))
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    try {
      if (role === 'student') {
        const validSubjects = subjects.filter(s => s.name && s.teacher)
        if (!displayName.trim()) { toast.error('Please enter your name'); setSaving(false); return }
        if (!grade) { toast.error('Please select your grade'); setSaving(false); return }
        if (validSubjects.length === 0) { toast.error('Add at least one subject'); setSaving(false); return }
        await saveStudentProfile(user.uid, { displayName: displayName.trim(), grade, subjects: validSubjects })
      } else {
        const validGroups = teachingGroups.filter(g => g.subject && g.grade)
        if (!teacherName.trim()) { toast.error('Please enter your name'); setSaving(false); return }
        if (validGroups.length === 0) { toast.error('Add at least one teaching group'); setSaving(false); return }
        await saveTeacherProfile(user.uid, { displayName: teacherName.trim(), teachingGroups: validGroups })
      }
      await refreshUserDoc()
      navigate(role === 'teacher' ? '/teacher' : '/dashboard')
    } catch (err) {
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-navy-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to ATL Nexus</h1>
          <p className="text-slate-500 mt-1">Let's set up your account in a few steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, ...(role === 'student' ? [3] : [])].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s ? 'bg-navy-700 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{s}</div>
              {s < (role === 'student' ? 3 : 2) && (
                <div className={`w-8 h-0.5 ${step > s ? 'bg-navy-700' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Role selection ───────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="step1"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="card p-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">How will you use ATL Nexus?</h2>
                <p className="text-sm text-slate-500 mb-6">Choose your role to get the right experience.</p>

                <div className="grid grid-cols-2 gap-4">
                  <RoleCard
                    icon={<BookOpen size={28} />}
                    title="I'm a Student"
                    desc="Track and reflect on your ATL skills across subjects"
                    selected={role === 'student'}
                    onClick={() => setRole('student')}
                    color="indigo"
                  />
                  <RoleCard
                    icon={<GraduationCap size={28} />}
                    title="I'm a Teacher"
                    desc="Review student reflections and provide feedback"
                    selected={role === 'teacher'}
                    onClick={() => setRole('teacher')}
                    color="emerald"
                  />
                </div>

                <button
                  disabled={!role}
                  onClick={() => setStep(2)}
                  className="mt-6 w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Profile ──────────────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="card p-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  {role === 'student' ? 'Your Profile' : 'Teacher Profile'}
                </h2>
                <p className="text-sm text-slate-500 mb-6">Tell us a bit about yourself.</p>

                <div className="space-y-4">
                  {role === 'student' ? (
                    <>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1.5">Full Name</label>
                        <input
                          className="input-base w-full"
                          placeholder="e.g. Leishaa Ajwani"
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1.5">Grade</label>
                        <select
                          className="input-base w-full"
                          value={grade}
                          onChange={e => setGrade(e.target.value)}
                        >
                          <option value="">Select your grade</option>
                          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1.5">Full Name</label>
                      <input
                        className="input-base w-full"
                        placeholder="e.g. Ms. Robertson"
                        value={teacherName}
                        onChange={e => setTeacherName(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Teacher teaching groups */}
                {role === 'teacher' && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-slate-600">Teaching Groups</label>
                      <button type="button" onClick={addGroupRow}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                        <Plus size={13} /> Add Group
                      </button>
                    </div>
                    <div className="space-y-2">
                      {teachingGroups.map((group, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <select className="input-base flex-1 text-sm py-2"
                            value={group.subject}
                            onChange={e => updateGroup(i, 'subject', e.target.value)}>
                            <option value="">Select Subject</option>
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select className="input-base w-24 text-sm py-2"
                            value={group.grade}
                            onChange={e => updateGroup(i, 'grade', e.target.value)}>
                            <option value="">Grade</option>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                          {teachingGroups.length > 1 && (
                            <button type="button" onClick={() => removeGroupRow(i)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="btn-ghost px-4">Back</button>
                  {role === 'student' ? (
                    <button
                      onClick={() => {
                        if (!displayName.trim()) { toast.error('Enter your name'); return }
                        if (!grade) { toast.error('Select your grade'); return }
                        setStep(3)
                      }}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      Next: Select Subjects <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary flex-1"
                    >
                      {saving ? 'Saving…' : 'Complete Setup'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Subjects (student only) ─────────────────────────── */}
          {step === 3 && (
            <motion.div key="step3"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="card p-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Your Subjects</h2>
                <p className="text-sm text-slate-500 mb-6">Add each subject you take and select your teacher.</p>

                <div className="space-y-3">
                  {subjects.map((sub, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        className="input-base flex-1 text-sm py-2"
                        value={sub.name}
                        onChange={e => updateSubject(i, 'name', e.target.value)}
                      >
                        <option value="">Select Subject</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select
                        className="input-base flex-1 text-sm py-2"
                        value={sub.teacher}
                        onChange={e => updateSubject(i, 'teacher', e.target.value)}
                        disabled={!sub.name}
                      >
                        <option value="">Select Teacher</option>
                        {(SUBJECT_TEACHERS[sub.name] || []).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {subjects.length > 1 && (
                        <button type="button" onClick={() => removeSubjectRow(i)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addSubjectRow}
                  className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  <Plus size={13} /> Add another subject
                </button>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(2)} className="btn-ghost px-4">Back</button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex-1"
                  >
                    {saving ? 'Saving…' : '🎉 Complete Setup'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

function RoleCard({ icon, title, desc, selected, onClick, color }) {
  const colors = {
    indigo: { border: 'border-indigo-500 bg-indigo-50', icon: 'text-indigo-600' },
    emerald: { border: 'border-emerald-500 bg-emerald-50', icon: 'text-emerald-600' },
  }
  const { border, icon: iconColor } = colors[color]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
        selected ? border : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <div className={`mb-3 ${selected ? iconColor : 'text-slate-400'}`}>{icon}</div>
      <p className="font-semibold text-slate-900 text-sm">{title}</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
    </button>
  )
}
