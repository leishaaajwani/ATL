import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getUnits, createUnit, getSubskills } from '../api/client'
import PageLayout from '../components/layout/PageLayout'
import { PageLoader } from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const TERMS = ['Term 1', 'Term 2', 'Term 3']

// Planning a unit is where the subject-specific sub-skills earn their keep.
// A Chemistry unit offers "evaluating sources of error", a Literature unit
// offers "evaluating competing critical readings". Whatever the teacher ticks
// here is exactly what their students will see, and nothing else.

export default function UnitPlanning() {
  const { profile } = useAuth()
  const sections = profile?.sections ?? []

  const [picked_, setSectionId]   = useState('')
  const [units, setUnits]         = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [loading, setLoading]     = useState(false)
  const [creating, setCreating]   = useState(false)

  // Derive rather than sync: the first class is the default until one is picked.
  const sectionId = picked_ || (sections[0] ? String(sections[0].id) : '')
  const section = sections.find(s => String(s.id) === String(sectionId))

  useEffect(() => {
    if (!sectionId || !section) return
    setLoading(true)
    Promise.all([getUnits(sectionId), getSubskills(section.subjectId, section.grade)])
      .then(([u, s]) => { setUnits(u.units); setCatalogue(s.categories) })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [sectionId])

  async function reload() {
    const u = await getUnits(sectionId)
    setUnits(u.units)
  }

  if (!sections.length) {
    return (
      <PageLayout>
        <div className="card p-10 text-center max-w-md mx-auto">
          <p className="text-sm font-medium text-slate-800">No classes yet</p>
          <p className="text-xs text-slate-500 mt-1">Add the classes you teach before planning units.</p>
          <a href="/setup" className="btn-primary mt-4 inline-flex">Set up classes</a>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">Unit Planning</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Tag the ATL sub-skills each unit actually develops
            </p>
          </div>
          <select className="input-base w-auto min-w-[220px]" value={sectionId}
            onChange={e => setSectionId(e.target.value)}>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.subjectName} · {s.grade}</option>
            ))}
          </select>
        </div>

        <button className="btn-accent" onClick={() => setCreating(c => !c)}>
          <Plus size={15} /> New unit
        </button>

        <AnimatePresence>
          {creating && section && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <NewUnitForm
                sectionId={Number(sectionId)}
                subjectName={section.subjectName}
                grade={section.grade}
                catalogue={catalogue}
                onDone={async () => { setCreating(false); await reload() }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? <PageLoader /> : <UnitList units={units} />}
      </div>
    </PageLayout>
  )
}

function NewUnitForm({ sectionId, subjectName, grade, catalogue, onDone }) {
  const [name, setName]         = useState('')
  const [term, setTerm]         = useState('Term 1')
  const [picked, setPicked]     = useState(new Set())
  const [minRequired, setMin]   = useState(3)
  const [saving, setSaving]     = useState(false)

  function toggle(id) {
    setPicked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function save(e) {
    e.preventDefault()
    if (!name.trim())   return toast.error('Give the unit a name')
    if (!picked.size)   return toast.error('Tag at least one sub-skill')
    if (minRequired > picked.size) {
      return toast.error(`You cannot require ${minRequired} when only ${picked.size} are tagged`)
    }
    setSaving(true)
    try {
      await createUnit({
        sectionId, term, name: name.trim(),
        subskillIds: [...picked],
        minSubskills: minRequired,
      })
      toast.success('Unit created')
      setName(''); setPicked(new Set())
      await onDone()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-5">
      <div className="grid sm:grid-cols-[1fr_auto] gap-3">
        <input className="input-base" placeholder="Unit name, e.g. Linear Programming"
          value={name} onChange={e => setName(e.target.value)} />
        <select className="input-base sm:w-32" value={term} onChange={e => setTerm(e.target.value)}>
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-800">ATL sub-skills for this unit</h3>
          <span className="text-xs text-slate-400">{picked.size} tagged</span>
        </div>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Showing {grade?.startsWith('MYP') ? 'MYP' : 'DP'} sub-skills for {subjectName}.
          The marked ones are written for this subject specifically. Students see
          only what you tick, so leave out anything this unit does not genuinely develop.
        </p>

        <div className="space-y-4">
          {catalogue.map(cat => (
            <div key={cat.categoryId}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                style={{ color: cat.colour }}>
                {cat.categoryName}
              </p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {cat.subskills.map(ss => {
                  const on = picked.has(ss.id)
                  return (
                    <button key={ss.id} type="button" onClick={() => toggle(ss.id)}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-colors
                        ${on ? 'border-navy-300 bg-navy-50' : 'border-slate-100 hover:border-slate-200'}`}>
                      <span className={`mt-0.5 w-4 h-4 rounded shrink-0 border flex items-center justify-center
                        ${on ? 'bg-navy-700 border-navy-700' : 'border-slate-300 bg-white'}`}>
                        {on && <Check size={11} className="text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-xs text-slate-700 leading-snug">
                        {ss.name}
                        {ss.isSubjectSpecific && (
                          <Sparkles size={10} className="inline ml-1 -mt-0.5 text-gold-600" />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <label className="text-xs text-slate-600 flex items-center gap-2">
          Students must tick at least
          <select className="input-base !w-16 !py-1.5 !px-2 text-xs" value={minRequired}
            onChange={e => setMin(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          before reflecting
        </label>
        <button className="btn-accent" disabled={saving}>
          {saving ? 'Creating' : 'Create unit'}
        </button>
      </div>
    </form>
  )
}

function UnitList({ units }) {
  if (!units.length) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm font-medium text-slate-800">No units in this class yet</p>
        <p className="text-xs text-slate-500 mt-1">Create one so students have something to reflect on.</p>
      </div>
    )
  }

  const byTerm = TERMS.map(t => [t, units.filter(u => u.term === t)]).filter(([, l]) => l.length)

  return (
    <div className="space-y-6">
      {byTerm.map(([term, list]) => (
        <div key={term}>
          <h2 className="section-title mb-3">{term}</h2>
          <div className="space-y-2">
            {list.map(u => (
              <div key={u.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {u.subskills?.length ?? 0} sub-skills · needs {u.minSubskills} ticked
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {u.pendingCount > 0 && (
                      <span className="badge bg-gold-100 text-gold-800">{u.pendingCount} to review</span>
                    )}
                    {u.approvedCount > 0 && (
                      <span className="badge bg-emerald-50 text-emerald-700">{u.approvedCount} approved</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {u.subskills?.map(ss => (
                    <span key={ss.id} className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: ss.bgColour, color: ss.colour }}>
                      {ss.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
