import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createATLEntry, getUnitsForSubjectAndTeacher } from '../firebase/firestore'
import PageLayout from '../components/layout/PageLayout'
import Button from '../components/ui/Button'
import { Select, Textarea } from '../components/ui/Input'
import { LevelBadge, CategoryBadge } from '../components/ui/Badge'
import {
  ATL_CATEGORIES, ATL_CATEGORY_KEYS, ASSESSMENT_LEVELS,
} from '../utils/atlFramework'
import toast from 'react-hot-toast'

const MIN_LEN = 80
const MAX_LEN = 500

export default function ReflectionEntry() {
  const { user, userDoc } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    subject: '',
    unitId: '',
    unitName: '',
    unitTerm: '',
    atlCategory: '',
    substrand: '',
    reflection: '',
    selfAssessment: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [availableUnits, setAvailableUnits] = useState([])
  const [loadingUnits, setLoadingUnits] = useState(false)

  const selectedUnit = availableUnits.find(u => u.id === form.unitId)
  const allowedAtlSkills = selectedUnit?.atlSkills ?? []
  const substrands = form.atlCategory ? ATL_CATEGORIES[form.atlCategory]?.substrands ?? [] : []

  // Fetch teacher's units when subject changes
  useEffect(() => {
    if (!form.subject) { setAvailableUnits([]); return }
    const enrolled = (userDoc?.subjects ?? []).find(s => s.name === form.subject)
    if (!enrolled?.teacher) { setAvailableUnits([]); return }

    setLoadingUnits(true)
    getUnitsForSubjectAndTeacher(form.subject, enrolled.teacher)
      .then(units => {
        const termOrder = { 'Term 1': 0, 'Term 2': 1, 'Term 3': 2 }
        setAvailableUnits(
          units.sort((a, b) =>
            (termOrder[a.term] ?? 9) - (termOrder[b.term] ?? 9) ||
            a.unitName.localeCompare(b.unitName),
          ),
        )
      })
      .catch(() => setAvailableUnits([]))
      .finally(() => setLoadingUnits(false))
  }, [form.subject, userDoc])

  function set(field) {
    return e => {
      const val = typeof e === 'string' ? e : e.target.value
      setForm(prev => {
        const next = { ...prev, [field]: val }
        if (field === 'subject') {
          next.unitId = ''; next.unitName = ''; next.unitTerm = ''
          next.atlCategory = ''; next.substrand = ''
        }
        if (field === 'unitId') {
          const unit = availableUnits.find(u => u.id === val)
          next.unitName = unit?.unitName ?? ''
          next.unitTerm = unit?.term ?? ''
          next.atlCategory = ''
          next.substrand = ''
        }
        if (field === 'atlCategory') next.substrand = ''
        return next
      })
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  function validate() {
    const e = {}
    if (!form.subject)        e.subject        = 'Select a subject'
    if (!form.unitId)         e.unitId         = 'Select a unit'
    if (!form.atlCategory)    e.atlCategory    = 'Select an ATL category'
    if (!form.substrand)      e.substrand      = 'Select a substrand'
    if (!form.selfAssessment) e.selfAssessment = 'Select your self-assessment level'
    if (form.reflection.length < MIN_LEN)
      e.reflection = `Reflection must be at least ${MIN_LEN} characters (${form.reflection.length}/${MIN_LEN})`
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      await createATLEntry({
        studentId:      user.uid,
        studentName:    userDoc?.displayName ?? '',
        subject:        form.subject,
        unitId:         form.unitId,
        unitName:       form.unitName,
        term:           form.unitTerm,
        atlCategory:    form.atlCategory,
        substrand:      form.substrand,
        reflection:     form.reflection.trim(),
        selfAssessment: form.selfAssessment,
      })
      toast.success('Reflection submitted for teacher review')
      navigate('/dashboard')
    } catch (err) {
      toast.error('Failed to submit. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const reflLen = form.reflection.length
  const reflValid = reflLen >= MIN_LEN && reflLen <= MAX_LEN

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">New ATL Reflection</h1>
            <p className="text-sm text-slate-500 mt-0.5">Document your ATL skill development</p>
          </div>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Subject + Unit */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Entry Details</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Subject */}
              <Select label="Subject" value={form.subject} onChange={set('subject')} error={errors.subject}>
                <option value="">Select subject…</option>
                {(userDoc?.subjects ?? []).map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </Select>

              {/* Unit — loaded from teacher's unit planning */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Unit</label>
                <select
                  className={`input-base w-full ${errors.unitId ? 'border-red-300' : ''}`}
                  value={form.unitId}
                  onChange={set('unitId')}
                  disabled={!form.subject || loadingUnits}
                >
                  <option value="">
                    {!form.subject
                      ? 'Select subject first'
                      : loadingUnits
                        ? 'Loading units…'
                        : availableUnits.length === 0
                          ? 'No units added yet'
                          : 'Select unit…'
                    }
                  </option>
                  {availableUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.term} — {u.unitName}
                    </option>
                  ))}
                </select>
                {errors.unitId && <p className="text-xs text-red-500 mt-1">{errors.unitId}</p>}
                {selectedUnit && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    ATL skills for this unit: {selectedUnit.atlSkills.join(' · ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ATL Category — filtered to what's tagged for the selected unit */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">ATL Framework</h3>

            {!form.unitId ? (
              <p className="text-xs text-slate-400 italic">Select a unit to see the relevant ATL skills</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {allowedAtlSkills.map(cat => {
                    const { color, bg } = ATL_CATEGORIES[cat]
                    const active = form.atlCategory === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => set('atlCategory')(cat)}
                        className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 ${
                          active ? 'shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                        style={active ? { backgroundColor: bg, borderColor: color, color } : {}}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
                {errors.atlCategory && <p className="text-xs text-red-500">{errors.atlCategory}</p>}

                {form.atlCategory && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <Select label="Substrand" value={form.substrand} onChange={set('substrand')} error={errors.substrand}>
                      <option value="">Select substrand…</option>
                      {substrands.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Reflection text */}
          <div className="card p-5">
            <Textarea
              label="Reflection"
              value={form.reflection}
              onChange={set('reflection')}
              error={errors.reflection}
              maxLength={MAX_LEN}
              rows={6}
              placeholder={`Describe a specific situation where you demonstrated this ATL skill, what you did, and what you learned. (${MIN_LEN}–${MAX_LEN} characters)`}
              hint={`Minimum ${MIN_LEN} characters. Be specific about the context, your actions, and the outcome.`}
            />
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    reflLen < MIN_LEN ? 'bg-red-400' : reflLen > MAX_LEN * 0.9 ? 'bg-amber-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${Math.min((reflLen / MAX_LEN) * 100, 100)}%` }}
                />
              </div>
              {reflLen >= MIN_LEN && <CheckCircle size={12} className="text-green-500" />}
            </div>
          </div>

          {/* Self-assessment */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Self-Assessment Level</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ASSESSMENT_LEVELS.map(({ value, color, bg, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('selfAssessment')(value)}
                  className={`p-3 rounded-xl border text-xs font-medium transition-all duration-150 ${
                    form.selfAssessment === value ? 'shadow-sm' : 'border-slate-100 hover:border-slate-200'
                  }`}
                  style={form.selfAssessment === value ? { backgroundColor: bg, borderColor: color, color } : {}}
                >
                  <div className="text-base mb-1">
                    {value === 'Emerging' ? '🌱' : value === 'Developing' ? '📈' : value === 'Proficient' ? '✅' : '⭐'}
                  </div>
                  {label}
                </button>
              ))}
            </div>
            {errors.selfAssessment && <p className="text-xs text-red-500 mt-2">{errors.selfAssessment}</p>}
          </div>

          {/* Preview */}
          {form.subject && form.unitId && form.atlCategory && form.selfAssessment && (
            <motion.div
              className="card p-4 border-navy-100 bg-navy-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <p className="text-xs text-navy-600 font-medium mb-2">Entry Preview</p>
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-white text-slate-700 border border-slate-200">{form.subject}</span>
                <span className="badge bg-white text-slate-700 border border-slate-200">{form.unitName}</span>
                {form.atlCategory && <CategoryBadge category={form.atlCategory} />}
                {form.selfAssessment && <LevelBadge level={form.selfAssessment} />}
                {form.unitTerm && <span className="badge bg-white text-slate-700 border border-slate-200">{form.unitTerm}</span>}
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
              Cancel
            </button>
            <Button type="submit" loading={submitting} icon={<CheckCircle size={15} />}>
              Submit for Review
            </Button>
          </div>
        </motion.form>
      </div>
    </PageLayout>
  )
}
