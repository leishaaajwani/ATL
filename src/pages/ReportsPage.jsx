import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getRoster, getRatings, saveRating } from '../api/client'
import PageLayout from '../components/layout/PageLayout'
import { PageLoader } from '../components/ui/LoadingSpinner'
import SegmentedControl from '../components/ui/SegmentedControl'
import { ASSESSMENT_LEVELS, SCORE_MAP, SCORE_LABEL } from '../utils/atlFramework'
import toast from 'react-hot-toast'


// Rating is now per sub-skill. A student can be Proficient at one Thinking
// sub-skill and Developing at another in the same unit, which is the whole
// reason the sub-skill layer exists.

export default function ReportsPage() {
  const { profile } = useAuth()
  const sections = profile?.sections ?? []

  const [picked_, setSectionId]   = useState('')
  const [term, setTerm]           = useState('Term 1')
  const [students, setStudents]   = useState([])
  const [openId, setOpenId]       = useState(null)
  const [loading, setLoading]     = useState(false)

  // Derive rather than sync: first class is the default until one is picked.
  const sectionId = picked_ || (sections[0] ? String(sections[0].id) : '')


  useEffect(() => {
    if (!sectionId) return
    setLoading(true)
    setOpenId(null)
    getRoster(sectionId)
      .then(r => setStudents(r.students.filter(s => s.enrollmentStatus === 'active')))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [sectionId])

  if (!sections.length) {
    return (
      <PageLayout>
        <div className="card px-5 py-8 text-center max-w-md mx-auto">
          <p className="text-caption font-medium text-slate-800">No classes yet</p>
          <p className="text-caption text-slate-500 mt-1">Set up your classes before writing reports.</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="space-y-5">
        <div>
          <h1 className="page-title">Term Reports</h1>
          <p className="page-subtitle">
            Rate each sub-skill against what the student claimed
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select className="input-base w-auto min-w-[220px]" value={sectionId}
            onChange={e => setSectionId(e.target.value)}>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.subjectName} · {s.grade}</option>
            ))}
          </select>
          <SegmentedControl options={['Term 1', 'Term 2', 'Term 3']} value={term} onChange={setTerm} />
        </div>

        {loading ? <PageLoader /> : students.length === 0 ? (
          <div className="card px-5 py-8 text-center">
            <p className="text-caption font-medium text-slate-800">No confirmed students in this class</p>
            <p className="text-caption text-slate-500 mt-1">
              Students appear here once you confirm their enrolment request.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map(s => (
              <StudentReport
                key={s.id}
                student={s}
                sectionId={Number(sectionId)}
                term={term}
                open={openId === s.id}
                onToggle={() => setOpenId(openId === s.id ? null : s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function StudentReport({ student, sectionId, term, open, onToggle }) {
  const [units, setUnits]     = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || units) return
    setLoading(true)
    getRatings({ studentId: student.id, sectionId, term })
      .then(r => setUnits(r.units))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [open])

  // Re-fetch when the term changes while open
  useEffect(() => { setUnits(null) }, [term])

  async function rate(unitId, subskillId, level) {
    try {
      await saveRating({ unitId, studentId: student.id, subskillId, level })
      setUnits(prev => prev.map(u => u.unitId !== unitId ? u : {
        ...u,
        subskills: u.subskills.map(ss =>
          ss.subskillId === subskillId ? { ...ss, teacherLevel: level } : ss),
      }))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const summary = units?.flatMap(u => u.subskills).filter(ss => ss.teacherLevel) ?? []

  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-9 h-9 rounded-control bg-navy-100 flex items-center justify-center shrink-0 text-navy-800 text-sm font-semibold">
          {student.fullName?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-caption font-medium text-slate-900 truncate">{student.fullName}</p>
          <p className="text-caption text-slate-500 mt-0.5">
            {student.approvedCount} approved · {student.pendingCount} awaiting review
          </p>
        </div>
        <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-5">
              {loading ? (
                <div className="py-6 text-center text-sm text-slate-400">Loading</div>
              ) : !units?.length ? (
                <p className="py-4 text-sm text-slate-500 text-center">
                  No units in {term} for this class yet.
                </p>
              ) : (
                <>
                  {units.map(u => (
                    <div key={u.unitId}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="text-caption font-semibold text-slate-800">{u.unitName}</p>
                        {u.reflectionStatus
                          ? <span className={
                              u.reflectionStatus === 'approved' ? 'badge-positive'
                              : u.reflectionStatus === 'pending' ? 'badge-waiting'
                              : 'badge-alert'}>
                              {u.reflectionStatus}
                            </span>
                          : <span className="badge bg-slate-100 text-slate-500">no reflection</span>}
                      </div>

                      <div className="space-y-1.5">
                        {u.subskills.map(ss => (
                          <SubskillRating key={ss.subskillId} subskill={ss}
                            onRate={level => rate(u.unitId, ss.subskillId, level)} />
                        ))}
                      </div>
                    </div>
                  ))}

                  {summary.length > 0 && <TermSummary rated={summary} term={term} />}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SubskillRating({ subskill: ss, onRate }) {
  const agree = ss.selfLevel && ss.teacherLevel && ss.selfLevel === ss.teacherLevel
  const gap   = ss.selfLevel && ss.teacherLevel
    ? (SCORE_MAP[ss.teacherLevel] ?? 0) - (SCORE_MAP[ss.selfLevel] ?? 0) : null

  return (
    <div className="rounded-control border border-slate-100 p-3">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-800 leading-snug">
            {ss.name}
            {ss.isSubjectSpecific && <Sparkles size={9} className="inline ml-1 -mt-0.5 text-gold-600" />}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: ss.bgColour, color: ss.colour }}>
              {ss.categoryName}
            </span>
            {ss.selfLevel
              ? <span className="text-[10px] text-slate-500">Student said {ss.selfLevel}</span>
              : <span className="text-[10px] text-slate-400 italic">not claimed</span>}
            {gap !== null && gap !== 0 && (
              <span className={`text-[10px] font-medium ${gap > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {gap > 0 ? `+${gap}` : gap}
              </span>
            )}
            {agree && <span className="text-[10px] text-emerald-600 font-medium">agrees</span>}
          </div>
        </div>
      </div>

      {ss.evidenceNote && (
        <p className="text-[11px] text-slate-500 mb-2 leading-relaxed italic">"{ss.evidenceNote}"</p>
      )}

      <div className="flex gap-1">
        {ASSESSMENT_LEVELS.map(l => (
          <button key={l.value} onClick={() => onRate(l.value)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all
              ${ss.teacherLevel === l.value ? '' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
            style={ss.teacherLevel === l.value
              ? { backgroundColor: l.bg, borderColor: l.color, color: l.color } : {}}>
            {l.value[0]}
          </button>
        ))}
      </div>
    </div>
  )
}

function TermSummary({ rated, term }) {
  const byCategory = rated.reduce((acc, ss) => {
    (acc[ss.categoryName] ??= { colour: ss.colour, bg: ss.bgColour, scores: [] })
      .scores.push(SCORE_MAP[ss.teacherLevel] ?? 0)
    return acc
  }, {})

  return (
    <div className="rounded-control bg-navy-50 p-4">
      <p className="text-xs font-semibold text-navy-900 uppercase tracking-wide mb-2">
        {term} summary
      </p>
      <p className="text-[11px] text-navy-700 mb-3">
        Averaged across {rated.length} rated sub-skills in this term.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(byCategory).map(([cat, { colour, bg, scores }]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length
          return (
            <span key={cat} className="text-[11px] font-medium px-2 py-1 rounded-lg"
              style={{ backgroundColor: bg, color: colour }}>
              {cat}: {SCORE_LABEL[Math.round(avg)]}
            </span>
          )
        })}
      </div>
    </div>
  )
}
