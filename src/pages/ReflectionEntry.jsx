import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Lock, CheckCircle2 } from 'lucide-react'
import { getMyUnits, getMyReflection, submitReflection, listEvidence } from '../api/client'
import EvidenceDropbox from '../components/EvidenceDropbox'
import { PageLoader } from '../components/ui/LoadingSpinner'
import PageLayout from '../components/layout/PageLayout'
import { ASSESSMENT_LEVELS } from '../utils/atlFramework'
import SkillRow from '../components/ui/SkillRow'
import SegmentedControl from '../components/ui/SegmentedControl'
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
  const [evidence, setEvidence] = useState([])
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
      .then(async r => {
        setExisting(r.reflection)
        setEvidence(r.reflection ? (await listEvidence(r.reflection.id)).files : [])
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

  // The dropbox opens a draft reflection on first upload, so re-read both.
  async function refreshEvidence() {
    const r = await getMyReflection(unitId)
    setExisting(r.reflection)
    setEvidence(r.reflection ? (await listEvidence(r.reflection.id)).files : [])
  }

  // The prompt list is fixed school-wide, so read it off any loaded reflection,
  // and fall back to the canonical three when there is no reflection yet.
  useEffect(() => {
    setPrompts(DEFAULT_PROMPTS)
  }, [])

  // A tick only counts once it carries evidence, but the counter has to show
  // what the student can see themselves, or three ticked boxes reading "0 / 3"
  // looks broken. Count the boxes, and say separately what is still missing.
  const checkedIds = useMemo(() => Object.keys(ticks), [ticks])
  const tickedIds  = useMemo(
    () => checkedIds.filter(id => ticks[id]?.selfLevel && ticks[id]?.evidenceNote?.trim().length >= 10),
    [ticks, checkedIds],
  )
  const needEvidence = checkedIds.length - tickedIds.length
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
    if (!unlocked) {
      return toast.error(needEvidence > 0
        ? `${needEvidence} of your ticked sub-skills still needs an evidence note`
        : `Tick at least ${threshold} sub-skills first`)
    }

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
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-md text-slate-400 hover:text-slate-700
                       hover:bg-slate-100 transition-colors duration-200">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">ATL Reflection</h1>
            <p className="page-subtitle">Tick what you demonstrated, then reflect on it</p>
          </div>
        </div>

        {/* Returned feedback sits above everything, because it is the reason
            the student is back on this page. */}
        {existing?.status === 'returned' && existing.teacherFeedback && (
          <div className="card mb-4 border-l-2 border-l-gold-500 px-4 py-3">
            <p className="eyebrow mb-1">Returned for revision</p>
            <p className="text-caption text-navy-900 leading-relaxed">{existing.teacherFeedback}</p>
          </div>
        )}

        {locked && (
          <div className="card mb-4 border-l-2 border-l-emerald-500 px-4 py-3">
            <p className="text-caption text-slate-700">
              This reflection is {existing.status}. You cannot change it now.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="card px-4 py-3.5">
            <label className="label">Unit</label>
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
              <p className="text-caption text-slate-500 mt-2 leading-relaxed">
                No units yet. Your teachers create these, and they appear here once
                your class enrolment is confirmed.
              </p>
            )}
          </div>

          <AnimatePresence>
            {unit && (
              <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="card overflow-hidden">
                <header className="px-4 py-3 border-b border-hairline">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-section font-semibold text-navy-900 leading-tight">
                      Which of these did you actually do?
                    </h2>
                    <span className={`text-caption font-medium tabular-nums
                      ${unlocked ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {checkedIds.length} / {threshold}
                    </span>
                  </div>
                  <p className="text-caption text-slate-500 mt-1 leading-relaxed">
                    Tick only the ones you can point to real evidence for.
                  </p>
                </header>

                <div>
                  {unit.subskills?.map(ss => (
                    <SubskillRow
                      key={ss.id}
                      subskill={ss}
                      value={ticks[ss.id]}
                      disabled={locked}
                      onToggle={() => ticks[ss.id] ? clearTick(ss.id) : setTick(ss.id, { selfLevel: 'Developing', evidenceNote: '' })}
                      onChange={patch => setTick(ss.id, patch)}
                      unitId={Number(unitId)}
                      evidence={evidence}
                      onEvidenceChange={refreshEvidence}
                    />
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Prompts, gated */}
          {unit && (
            <section className={`card overflow-hidden transition-opacity duration-200
                                 ${unlocked ? '' : 'opacity-70'}`}>
              <header className="flex items-center gap-2 px-4 py-3 border-b border-hairline">
                {unlocked
                  ? <CheckCircle2 size={14} className="text-emerald-600" />
                  : <Lock size={14} className="text-slate-400" />}
                <h2 className="text-section font-semibold text-navy-900 leading-tight">
                  Your reflection
                </h2>
              </header>

              <div className="px-4 py-3.5">
              {!unlocked ? (
                <p className="text-caption text-slate-500 leading-relaxed">
                  {checkedIds.length < threshold
                    ? `Tick ${threshold - checkedIds.length} more sub-skill${threshold - checkedIds.length === 1 ? '' : 's'} to unlock these questions.`
                    : `Add an evidence note to ${needEvidence} of the sub-skills you ticked. A tick without evidence does not count.`}
                </p>
              ) : (
                <div className="space-y-4">
                  {prompts.map(p => {
                    const words = countWords(answers[p.id])
                    const done  = words >= p.minWords
                    return (
                      <div key={p.id}>
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <label className="text-caption font-medium text-slate-800 leading-snug">
                            {p.question}
                          </label>
                          <span className={`text-[11px] shrink-0 tabular-nums
                            ${done ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {words}/{p.minWords}
                          </span>
                        </div>
                        {p.helper && <p className="text-[11px] text-slate-500 mb-1.5">{p.helper}</p>}
                        <textarea
                          className="input-base resize-none leading-relaxed" rows={3} disabled={locked}
                          value={answers[p.id] ?? ''}
                          onChange={e => setAnswers(a => ({ ...a, [p.id]: e.target.value }))}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
              </div>
            </section>
          )}

          {unit && !locked && (
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
              <button className="btn-primary" disabled={saving || !unlocked}>
                {saving ? 'Sending' : existing?.status === 'returned' ? 'Resubmit' : 'Send for review'}
              </button>
            </div>
          )}
        </form>
      </div>
    </PageLayout>
  )
}

function SubskillRow({ subskill, value, disabled, onToggle, onChange,
                      unitId, evidence, onEvidenceChange }) {
  const on = Boolean(value)

  return (
    <SkillRow
      name={subskill.name}
      descriptor={on ? null : subskill.descriptor}
      categoryName={subskill.categoryName}
      subjectSpecific={subskill.isSubjectSpecific}
      checked={on}
      onToggle={onToggle}
      disabled={disabled}
    >
      {on && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="pl-[30px] pr-3 pb-3 space-y-2">
            <SegmentedControl
              options={ASSESSMENT_LEVELS.map(l => ({ value: l.value, label: l.value }))}
              value={value.selfLevel}
              onChange={level => onChange({ selfLevel: level })}
              size="sm"
              className="w-full [&>button]:flex-1"
            />
            <input
              className="input-base" disabled={disabled}
              placeholder="Where did you do this? Name the task or lesson."
              value={value.evidenceNote ?? ''}
              onChange={e => onChange({ evidenceNote: e.target.value })}
            />
            {value.evidenceNote && value.evidenceNote.trim().length < 10 && (
              <p className="text-[11px] text-gold-700">A bit more detail, at least a few words.</p>
            )}
            <EvidenceDropbox
              unitId={unitId}
              subskillId={subskill.id}
              files={evidence}
              onChange={onEvidenceChange}
              disabled={disabled}
            />
          </div>
        </motion.div>
      )}
    </SkillRow>
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
