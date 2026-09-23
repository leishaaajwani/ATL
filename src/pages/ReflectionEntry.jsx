import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, Lock, CheckCircle2 } from 'lucide-react'
import { getMyUnits, getMyReflection, submitReflection } from '../api/client'
import { PageLoader } from '../components/ui/LoadingSpinner'
import PageLayout from '../components/layout/PageLayout'
import { ASSESSMENT_LEVELS } from '../utils/atlFramework'
import toast from 'react-hot-toast'

// Two stages, in this order, because that is the rule the teachers set:
//   1. Tick the sub-skills you actually demonstrated, each with evidence
//   2. Only once you are at the threshold do the reflection prompts unlock
// The server enforces the same rule, so the lock is real rather than cosmetic.

const countWords = t => String(t ?? '').trim().split(/\s+/).filter(Boolean).length

export default function ReflectionEntry() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [units, setUnits]     = useState([])
  const [unitId, setUnitId]   = useState(params.get('unitId') ?? '')
  const [ticks, setTicks]     = useState({})   // subskillId -> {selfLevel, evidenceNote}
  const [answers, setAnswers] = useState({})   // promptId -> text
  const [prompts, setPrompts] = useState([])
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const unit = units.find(u => String(u.id) === String(unitId))

  useEffect(() => {
    getMyUnits()
      .then(r => {
        setUnits(r.units)
        if (!unitId && r.units.length === 1) setUnitId(String(r.units[0].id))
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Prompts come back with the existing reflection; fetch them per unit.
  useEffect(() => {
    if (!unitId) { setTicks({}); setAnswers({}); setExisting(null); return }
    getMyReflection(unitId)
      .then(r => {
        setExisting(r.reflection)
        if (r.reflection) {
          setTicks(Object.fromEntries(r.reflection.ticks.map(t =>
            [t.subskillId, { selfLevel: t.selfLevel, evidenceNote: t.evidenceNote }])))
          setAnswers(Object.fromEntries(r.reflection.answers.map(a => [a.promptId, a.answerText])))
        } else {
          setTicks({}); setAnswers({})
        }
      })
      .catch(() => {})
  }, [unitId])

  // The prompt list is fixed school-wide, so read it off any loaded reflection,
  // and fall back to the canonical three when there is no reflection yet.
  useEffect(() => {
    setPrompts(DEFAULT_PROMPTS)
  }, [])

  const tickedIds = useMemo(
    () => Object.keys(ticks).filter(id => ticks[id]?.selfLevel && ticks[id]?.evidenceNote?.trim().length >= 10),
    [ticks],
  )
  const threshold  = unit?.minSubskills ?? 3
  const unlocked   = tickedIds.length >= threshold
  const locked     = existing?.status === 'approved' || existing?.status === 'pending'

  function setTick(id, patch) {
    setTicks(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }))
  }
  function clearTick(id) {
    setTicks(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  async function submit(e) {
    e.preventDefault()
    if (!unlocked) return toast.error(`Tick at least ${threshold} sub-skills first`)

    for (const p of prompts) {
      const w = countWords(answers[p.id])
      if (w < p.minWords) return toast.error(`"${p.question}" needs ${p.minWords} words, you have ${w}`)
    }

    setSaving(true)
    try {
      await submitReflection({
        unitId: Number(unitId),
        ticks: tickedIds.map(id => ({
          subskillId: Number(id),
          selfLevel: ticks[id].selfLevel,
          evidenceNote: ticks[id].evidenceNote,
        })),
        answers: prompts.map(p => ({ promptId: p.id, answerText: answers[p.id] ?? '' })),
      })
      toast.success(existing?.status === 'returned' ? 'Revision sent for review' : 'Sent for review')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">ATL Reflection</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Tick what you demonstrated, then reflect on it
            </p>
          </div>
        </div>

        {/* Returned feedback sits above everything, because it is the reason
            the student is back on this page. */}
        {existing?.status === 'returned' && existing.teacherFeedback && (
          <div className="card p-4 mb-5 border-gold-200 bg-gold-50">
            <p className="text-xs font-semibold text-gold-800 uppercase tracking-wide mb-1">
              Returned for revision
            </p>
            <p className="text-sm text-navy-900 leading-relaxed">{existing.teacherFeedback}</p>
          </div>
        )}

        {locked && (
          <div className="card p-4 mb-5 border-emerald-100 bg-emerald-50">
            <p className="text-sm text-emerald-800">
              This reflection is {existing.status}. You cannot change it now.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="card p-5">
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Unit</label>
            <select className="input-base" value={unitId} disabled={locked}
              onChange={e => setUnitId(e.target.value)}>
              <option value="">Select a unit</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.subjectName} · {u.term} · {u.name}
                  {u.reflectionStatus ? ` (${u.reflectionStatus})` : ''}
                </option>
              ))}
            </select>
            {units.length === 0 && (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                No units yet. Your teachers create these, and they appear here once
                your class enrolment is confirmed.
              </p>
            )}
          </div>

          <AnimatePresence>
            {unit && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="card p-5">
                <div className="flex items-baseline justify-between mb-1">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Which of these did you actually do?
                  </h2>
                  <span className={`text-xs font-semibold ${unlocked ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {tickedIds.length} / {threshold}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Tick only the ones you can point to real evidence for. You need
                  at least {threshold} before the reflection unlocks.
                </p>

                <div className="space-y-2.5">
                  {unit.subskills?.map(ss => (
                    <SubskillRow
                      key={ss.id}
                      subskill={ss}
                      value={ticks[ss.id]}
                      disabled={locked}
                      onToggle={() => ticks[ss.id] ? clearTick(ss.id) : setTick(ss.id, { selfLevel: 'Developing', evidenceNote: '' })}
                      onChange={patch => setTick(ss.id, patch)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompts, gated */}
          {unit && (
            <div className={`card p-5 transition-opacity ${unlocked ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-2 mb-4">
                {unlocked
                  ? <CheckCircle2 size={15} className="text-emerald-500" />
                  : <Lock size={15} className="text-slate-400" />}
                <h2 className="text-sm font-semibold text-slate-800">Your reflection</h2>
              </div>

              {!unlocked ? (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tick {threshold - tickedIds.length} more sub-skill
                  {threshold - tickedIds.length === 1 ? '' : 's'} to unlock these questions.
                </p>
              ) : (
                <div className="space-y-5">
                  {prompts.map(p => {
                    const words = countWords(answers[p.id])
                    const done  = words >= p.minWords
                    return (
                      <div key={p.id}>
                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                          <label className="text-sm font-medium text-slate-800 leading-snug">
                            {p.question}
                          </label>
                          <span className={`text-xs shrink-0 font-medium ${done ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {words}/{p.minWords}
                          </span>
                        </div>
                        {p.helper && <p className="text-xs text-slate-500 mb-2">{p.helper}</p>}
                        <textarea
                          className="input-base resize-none" rows={4} disabled={locked}
                          value={answers[p.id] ?? ''}
                          onChange={e => setAnswers(a => ({ ...a, [p.id]: e.target.value }))}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {unit && !locked && (
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
              <button className="btn-accent" disabled={saving || !unlocked}>
                {saving ? 'Sending' : existing?.status === 'returned' ? 'Resubmit' : 'Send for review'}
              </button>
            </div>
          )}
        </form>
      </div>
    </PageLayout>
  )
}

function SubskillRow({ subskill, value, disabled, onToggle, onChange }) {
  const on = Boolean(value)
  return (
    <div className={`rounded-xl border transition-colors ${on ? 'border-navy-200 bg-navy-50/40' : 'border-slate-100'}`}>
      <button type="button" onClick={onToggle} disabled={disabled}
        className="w-full flex items-start gap-3 p-3 text-left">
        <span className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors
          ${on ? 'bg-navy-700 border-navy-700' : 'border-slate-300 bg-white'}`}>
          {on && <Check size={11} className="text-white" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-sm text-slate-800 leading-snug block">{subskill.name}</span>
          <span className="text-[11px] mt-0.5 inline-block px-1.5 py-0.5 rounded"
            style={{ backgroundColor: subskill.bgColour, color: subskill.colour }}>
            {subskill.categoryName}
          </span>
        </span>
      </button>

      {on && (
        <div className="px-3 pb-3 pl-10 space-y-2">
          <div className="flex gap-1.5">
            {ASSESSMENT_LEVELS.map(l => (
              <button key={l.value} type="button" disabled={disabled}
                onClick={() => onChange({ selfLevel: l.value })}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all
                  ${value.selfLevel === l.value ? '' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                style={value.selfLevel === l.value
                  ? { backgroundColor: l.bg, borderColor: l.color, color: l.color } : {}}>
                {l.value}
              </button>
            ))}
          </div>
          <input
            className="input-base !py-2 !text-xs" disabled={disabled}
            placeholder="Where did you do this? Name the task or lesson."
            value={value.evidenceNote ?? ''}
            onChange={e => onChange({ evidenceNote: e.target.value })}
          />
          {value.evidenceNote && value.evidenceNote.trim().length < 10 && (
            <p className="text-[11px] text-gold-700">A bit more detail, at least a few words.</p>
          )}
        </div>
      )}
    </div>
  )
}

// Mirrors db/seeds/001_reference.sql. The server validates against its own copy,
// so a mismatch here fails loudly rather than silently accepting a short answer.
const DEFAULT_PROMPTS = [
  { id: 1, minWords: 40, question: 'Which sub-skill did you rely on most in this unit, and where specifically did you use it?',
    helper: 'Name the task, lesson or assessment. Be concrete rather than general.' },
  { id: 2, minWords: 50, question: 'Describe one moment in this unit where this skill was difficult. What did you actually do about it?',
    helper: 'Describe the difficulty and your response, not just the outcome.' },
  { id: 3, minWords: 30, question: 'What will you do differently in the next unit?',
    helper: 'One specific change you intend to make, not a general aspiration.' },
]
