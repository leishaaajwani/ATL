import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, BookOpen, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createUnit, deleteUnit, subscribeToTeacherUnits } from '../firebase/firestore'
import PageLayout from '../components/layout/PageLayout'
import { ATL_CATEGORIES, ATL_CATEGORY_KEYS, SUBJECTS } from '../utils/atlFramework'
import toast from 'react-hot-toast'

const REPORT_TERMS = ['Term 1', 'Term 2', 'Term 3']

export default function UnitPlanning() {
  const { user, userDoc } = useAuth()
  const [units, setUnits] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ subject: '', term: '', unitName: '', atlSkills: [] })

  // Teacher's own subjects from their teaching groups
  const teacherSubjects = [...new Set((userDoc?.teachingGroups ?? []).map(g => g.subject).filter(Boolean))]

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToTeacherUnits(user.uid, setUnits)
    return unsub
  }, [user])

  function toggleAtl(skill) {
    setForm(prev => ({
      ...prev,
      atlSkills: prev.atlSkills.includes(skill)
        ? prev.atlSkills.filter(s => s !== skill)
        : [...prev.atlSkills, skill],
    }))
  }

  async function handleCreate() {
    if (!form.subject) { toast.error('Select a subject'); return }
    if (!form.term) { toast.error('Select a term'); return }
    if (!form.unitName.trim()) { toast.error('Enter a unit name'); return }
    if (form.atlSkills.length === 0) { toast.error('Tag at least one ATL skill'); return }

    setSaving(true)
    try {
      await createUnit({
        teacherUid: user.uid,
        teacherName: userDoc?.displayName ?? '',
        subject: form.subject,
        term: form.term,
        unitName: form.unitName.trim(),
        atlSkills: form.atlSkills,
      })
      toast.success('Unit created!')
      setForm({ subject: '', term: '', unitName: '', atlSkills: [] })
      setShowForm(false)
    } catch (err) {
      toast.error('Failed to create unit')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteUnit(id)
      toast.success('Unit deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  // Group units by subject → term
  const grouped = {}
  units.forEach(u => {
    if (!grouped[u.subject]) grouped[u.subject] = {}
    if (!grouped[u.subject][u.term]) grouped[u.subject][u.term] = []
    grouped[u.subject][u.term].push(u)
  })
  // Sort units within each group by unitName
  Object.values(grouped).forEach(terms =>
    Object.values(terms).forEach(arr => arr.sort((a, b) => a.unitName.localeCompare(b.unitName)))
  )

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Unit Planning</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Define units and the ATL skills students reflect on for each
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={15} />
            New Unit
          </button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card p-6 border-indigo-100 bg-indigo-50/30"
            >
              <h3 className="text-sm font-semibold text-slate-800 mb-4">New Unit</h3>

              <div className="grid sm:grid-cols-3 gap-3 mb-5">
                {/* Subject */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Subject</label>
                  <select
                    className="input-base w-full text-sm"
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  >
                    <option value="">Select subject</option>
                    {(teacherSubjects.length ? teacherSubjects : SUBJECTS).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Term */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Term</label>
                  <select
                    className="input-base w-full text-sm"
                    value={form.term}
                    onChange={e => setForm(p => ({ ...p, term: e.target.value }))}
                  >
                    <option value="">Select term</option>
                    {REPORT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Unit name */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Unit Name</label>
                  <input
                    className="input-base w-full text-sm"
                    placeholder="e.g. Linear Programming"
                    value={form.unitName}
                    onChange={e => setForm(p => ({ ...p, unitName: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  />
                </div>
              </div>

              {/* ATL skill checkboxes */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  ATL Skills for this unit <span className="text-slate-400">(students will only see these)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ATL_CATEGORY_KEYS.map(skill => {
                    const { color, bg } = ATL_CATEGORIES[skill]
                    const active = form.atlSkills.includes(skill)
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleAtl(skill)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all ${
                          active ? '' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                        style={active ? { backgroundColor: bg, borderColor: color, color } : {}}
                      >
                        {active ? '✓ ' : ''}{skill}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowForm(false)} className="btn-ghost px-4">Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Creating…' : 'Create Unit'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Units grouped by subject → term */}
        {Object.keys(grouped).length === 0 ? (
          <div className="card p-14 text-center">
            <BookOpen size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No units yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Create your first unit — students will see only the ATL skills you tag here
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([subject, termMap]) => (
            <div key={subject} className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-800">{subject}</h3>
              </div>
              {REPORT_TERMS.filter(t => termMap[t]).map(term => (
                <div key={term}>
                  <div className="px-5 py-2 bg-slate-50/40 border-b border-slate-50">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{term}</span>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {termMap[term].map(unit => (
                      <div
                        key={unit.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 group transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{unit.unitName}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {unit.atlSkills.map(skill => {
                              const { color, bg } = ATL_CATEGORIES[skill] ?? {}
                              return (
                                <span
                                  key={skill}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: bg, color }}
                                >
                                  {skill}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(unit.id)}
                          className="p-1.5 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </PageLayout>
  )
}
