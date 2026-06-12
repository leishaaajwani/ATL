import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createATLEntry, getUnitsForSubjectAndTeacher } from '../firebase/firestore'
import PageLayout from '../components/layout/PageLayout'
import Button from '../components/ui/Button'
import { Textarea } from '../components/ui/Input'
import { CategoryBadge, LevelBadge } from '../components/ui/Badge'
import { ATL_CATEGORIES, ASSESSMENT_LEVELS } from '../utils/atlFramework'
import toast from 'react-hot-toast'

const MIN_WORDS = 100

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function ReflectionEntry() {
  const { user, userDoc } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [subject, setSubject]       = useState(searchParams.get('subject') ?? '')
  const [unitId, setUnitId]         = useState(searchParams.get('unitId') ?? '')
  const [atlRatings, setAtlRatings] = useState({})   // { Thinking: 'Proficient', ... }
  const [reflection, setReflection] = useState('')
  const [errors, setErrors]         = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [availableUnits, setAvailableUnits] = useState([])
  const [loadingUnits, setLoadingUnits]     = useState(false)

  const selectedUnit = availableUnits.find(u => u.id === unitId)

  // Fetch units when subject changes
  useEffect(() => {
    if (!subject) { setAvailableUnits([]); setUnitId(''); return }
    const enrolled = (userDoc?.subjects ?? []).find(s => s.name === subject)
    if (!enrolled?.teacher) { setAvailableUnits([]); return }
    setLoadingUnits(true)
    getUnitsForSubjectAndTeacher(subject, enrolled.teacher)
      .then(units => {
        const order = { 'Term 1': 0, 'Term 2': 1, 'Term 3': 2 }
        setAvailableUnits(units.sort((a, b) =>
          (order[a.term] ?? 9) - (order[b.term] ?? 9) || a.unitName.localeCompare(b.unitName),
        ))
      })
      .catch(() => setAvailableUnits([]))
      .finally(() => setLoadingUnits(false))
  }, [subject, userDoc])

  // Reset ATL ratings when unit changes
  useEffect(() => {
    if (selectedUnit) {
      setAtlRatings(Object.fromEntries(selectedUnit.atlSkills.map(s => [s, null])))
    } else {
      setAtlRatings({})
    }
    setErrors({})
  }, [unitId])

  function handleUnitChange(e) {
    setUnitId(e.target.value)
  }

  function rateSkill(skill, level) {
    setAtlRatings(prev => ({ ...prev, [skill]: level }))
    setErrors(prev => ({ ...prev, atlRatings: '' }))
  }

  function validate() {
    const e = {}
    if (!subject)  e.subject = 'Select a subject'
    if (!unitId)   e.unitId  = 'Select a unit'
    if (selectedUnit) {
      const unrated = selectedUnit.atlSkills.filter(s => !atlRatings[s])
      if (unrated.length) e.atlRatings = `Please rate: ${unrated.join(', ')}`
    }
    const wc = countWords(reflection)
    if (wc < MIN_WORDS) e.reflection = `Reflection needs at least ${MIN_WORDS} words (${wc}/${MIN_WORDS})`
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    // One entry per ATL skill — same reflection, same unit, grouped by submissionId
    const submissionId = `${user.uid}_${Date.now()}`
    try {
      const skills = selectedUnit.atlSkills.filter(s => atlRatings[s])
      await Promise.all(skills.map(atlCategory =>
        createATLEntry({
          studentId:        user.uid,
          studentName:      userDoc?.displayName ?? '',
          subject,
          unitId,
          unitName:         selectedUnit.unitName,
          term:             selectedUnit.term,
          atlCategory,
          selfAssessment:   atlRatings[atlCategory],
          substrand:        '',
          reflection:       reflection.trim(),
          unitSubmissionId: submissionId,
        }),
      ))
      toast.success('Reflection submitted for teacher review!')
      navigate('/dashboard')
    } catch (err) {
      toast.error('Failed to submit. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const wordCount  = countWords(reflection)
  const wordsDone  = wordCount >= MIN_WORDS
  const wordsOver  = wordCount > MIN_WORDS * 3   // soft upper limit feel
  const allRated   = selectedUnit?.atlSkills.every(s => atlRatings[s]) ?? false

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">New ATL Reflection</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rate your ATL skills and reflect on the unit</p>
          </div>
        </div>

        <motion.form onSubmit={handleSubmit} className="space-y-5"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* Subject + Unit */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Entry Details</h3>
            <div className="grid sm:grid-cols-2 gap-4">

              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Subject</label>
                <select
                  className={`input-base w-full ${errors.subject ? 'border-red-300' : ''}`}
                  value={subject}
                  onChange={e => { setSubject(e.target.value); setUnitId('') }}
                >
                  <option value="">Select subject…</option>
                  {(userDoc?.subjects ?? []).map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
                {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
              </div>

              {/* Unit */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Unit</label>
                <select
                  className={`input-base w-full ${errors.unitId ? 'border-red-300' : ''}`}
                  value={unitId}
                  onChange={handleUnitChange}
                  disabled={!subject || loadingUnits}
                >
                  <option value="">
                    {!subject ? 'Select subject first' : loadingUnits ? 'Loading…'
                      : availableUnits.length === 0 ? 'No units yet' : 'Select unit…'}
                  </option>
                  {availableUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.term} — {u.unitName}</option>
                  ))}
                </select>
                {errors.unitId && <p className="text-xs text-red-500 mt-1">{errors.unitId}</p>}
              </div>
            </div>
          </div>

          {/* ATL Skill Ratings — one row per skill */}
          <AnimatePresence>
            {selectedUnit && (
              <motion.div className="card p-5 space-y-4"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Rate Your ATL Skills</h3>
                  <span className="text-[10px] text-slate-400">for {selectedUnit.unitName}</span>
                </div>

                <div className="space-y-3">
                  {selectedUnit.atlSkills.map(skill => {
                    const { color, bg } = ATL_CATEGORIES[skill]
                    const current = atlRatings[skill]
                    return (
                      <div key={skill} className="flex items-center gap-3">
                        {/* Skill label */}
                        <span className="text-xs font-semibold w-28 flex-shrink-0" style={{ color }}>
                          {skill}
                        </span>
                        {/* Level buttons */}
                        <div className="flex gap-1.5 flex-1">
                          {ASSESSMENT_LEVELS.map(({ value, color: lc, bg: lb, label }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => rateSkill(skill, value)}
                              className={`flex-1 py-2 rounded-xl text-[11px] font-bold border-2 transition-all ${
                                current === value
                                  ? 'scale-105 shadow-sm'
                                  : 'border-slate-100 text-slate-400 hover:border-slate-200'
                              }`}
                              style={current === value ? { backgroundColor: lb, borderColor: lc, color: lc } : {}}
                            >
                              {value[0]}
                            </button>
                          ))}
                        </div>
                        {/* Current label */}
                        <span className="text-xs w-20 text-right flex-shrink-0">
                          {current
                            ? <span className="font-semibold" style={{ color }}>{current}</span>
                            : <span className="text-slate-300 italic">not rated</span>
                          }
                        </span>
                      </div>
                    )
                  })}
                </div>

                {errors.atlRatings && (
                  <p className="text-xs text-red-500">{errors.atlRatings}</p>
                )}

                {/* Legend */}
                <div className="flex gap-3 pt-1 border-t border-slate-50">
                  {ASSESSMENT_LEVELS.map(({ value, color, label }) => (
                    <span key={value} className="text-[10px] text-slate-400">
                      <span className="font-bold" style={{ color }}>{value[0]}</span> = {value}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reflection */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Unit Reflection</h3>
              <span className={`text-xs font-medium transition-colors ${
                wordsDone ? 'text-green-500' : 'text-slate-400'
              }`}>
                {wordCount} / {MIN_WORDS} words
              </span>
            </div>
            <textarea
              className={`input-base w-full resize-none ${errors.reflection ? 'border-red-300' : ''}`}
              rows={7}
              value={reflection}
              onChange={e => { setReflection(e.target.value); setErrors(p => ({ ...p, reflection: '' })) }}
              placeholder="Reflect on how you demonstrated the ATL skills above during this unit. Be specific — describe a situation, what you did, and what you learned. (minimum 100 words)"
            />
            {/* Word count bar */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    wordsDone ? 'bg-green-400' : 'bg-slate-300'
                  }`}
                  style={{ width: `${Math.min((wordCount / MIN_WORDS) * 100, 100)}%` }}
                />
              </div>
              {wordsDone && <CheckCircle size={12} className="text-green-500 flex-shrink-0" />}
            </div>
            {errors.reflection && <p className="text-xs text-red-500 mt-1">{errors.reflection}</p>}
          </div>

          {/* Preview */}
          {subject && unitId && allRated && wordsDone && (
            <motion.div className="card p-4 border-navy-100 bg-navy-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-xs text-navy-600 font-medium mb-2">Ready to submit</p>
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-white text-slate-700 border border-slate-200">{subject}</span>
                <span className="badge bg-white text-slate-700 border border-slate-200">{selectedUnit?.unitName}</span>
                {selectedUnit?.atlSkills.map(s => (
                  <span key={s} className="badge bg-white text-slate-700 border border-slate-200">
                    {s}: {atlRatings[s]?.[0]}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-ghost">Cancel</button>
            <Button type="submit" loading={submitting} icon={<CheckCircle size={15} />}>
              Submit for Review
            </Button>
          </div>
        </motion.form>
      </div>
    </PageLayout>
  )
}
