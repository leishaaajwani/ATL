import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, RotateCcw, ChevronDown, Sparkles } from 'lucide-react'
import { getReviewQueue, reviewReflection } from '../api/client'
import PageLayout from '../components/layout/PageLayout'
import Modal from '../components/ui/Modal'
import { PageLoader } from '../components/ui/LoadingSpinner'
import { formatDateTime } from '../utils/helpers'
import toast from 'react-hot-toast'

// Every reflection now arrives with its sub-skill ticks and evidence notes, so
// the teacher can see what the student claims they did before reading the prose.

export default function ApprovalReview() {
  const [tab, setTab]       = useState('pending')
  const [items, setItems]   = useState([])
  const [loading, setLoad]  = useState(true)

  async function load() {
    setLoad(true)
    try { setItems((await getReviewQueue(tab)).reflections) }
    catch (err) { toast.error(err.message) }
    finally { setLoad(false) }
  }
  useEffect(() => { load() }, [tab])

  return (
    <PageLayout>
      <div className="space-y-5">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review what students claim they demonstrated, then approve or send it back
          </p>
        </div>

        <div className="flex gap-2">
          {[['pending', 'Awaiting review'], ['returned', 'Returned'], ['approved', 'Approved']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === k ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? <PageLoader /> : items.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-800">
              {tab === 'pending' ? 'Nothing waiting on you' : `No ${tab} reflections`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map(r => (
                <motion.div key={r.id} layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}>
                  <ReflectionCard reflection={r} onDone={load} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function ReflectionCard({ reflection: r, onDone }) {
  const [open, setOpen]     = useState(false)
  const [modal, setModal]   = useState(null)   // 'approve' | 'return'
  const [feedback, setFb]   = useState('')
  const [busy, setBusy]     = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await reviewReflection(r.id, modal, feedback)
      toast.success(modal === 'approve' ? 'Approved' : 'Sent back to the student')
      setModal(null)
      await onDone()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card overflow-hidden">
        <button onClick={() => setOpen(o => !o)} className="w-full text-left p-5 flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-navy-100 flex items-center justify-center shrink-0 text-navy-800 text-sm font-semibold">
            {r.studentName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-slate-900">{r.studentName}</span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-600">{r.subjectName}</span>
              {r.revisionCount > 0 && (
                <span className="badge bg-gold-100 text-gold-800">
                  Revision {r.revisionCount}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {r.term} · {r.name ?? r.unitName} · {formatDateTime(r.submittedAt)}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {r.ticks?.map(t => (
                <span key={t.subskillId} className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: t.bgColour, color: t.colour }}>
                  {t.subskillName} · {t.selfLevel}
                </span>
              ))}
            </div>
          </div>
          <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden">
              <div className="px-5 pb-5 pt-4 border-t border-slate-100 space-y-5">

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Claimed sub-skills and evidence
                  </p>
                  <div className="space-y-2">
                    {r.ticks?.map(t => (
                      <div key={t.subskillId} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-medium text-slate-800">
                            {t.subskillName}
                            {t.isSubjectSpecific && <Sparkles size={9} className="inline ml-1 -mt-0.5 text-gold-600" />}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: t.bgColour, color: t.colour }}>
                            {t.selfLevel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{t.evidenceNote}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {r.answers?.map(a => (
                    <div key={a.sequence}>
                      <p className="text-xs font-medium text-slate-700 mb-1">{a.question}</p>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl">
                        {a.answerText}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{a.wordCount} words</p>
                    </div>
                  ))}
                </div>

                {r.teacherFeedback && (
                  <div className="rounded-xl bg-navy-50 p-3">
                    <p className="text-xs font-semibold text-navy-800 mb-1">Your previous feedback</p>
                    <p className="text-sm text-navy-900 leading-relaxed">{r.teacherFeedback}</p>
                  </div>
                )}

                {r.status === 'pending' && (
                  <div className="flex gap-2 justify-end pt-1">
                    <button className="btn-secondary" onClick={() => { setModal('return'); setFb('') }}>
                      <RotateCcw size={13} /> Send back
                    </button>
                    <button className="btn-accent" onClick={() => { setModal('approve'); setFb('') }}>
                      <CheckCircle2 size={13} /> Approve
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)}
        title={modal === 'approve' ? 'Approve reflection' : 'Send back for revision'}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {modal === 'approve'
              ? `Approving ${r.studentName}'s reflection on ${r.unitName}.`
              : `${r.studentName} will see your comment and can revise this same reflection. It stays attached to ${r.unitName}, so a different entry will not satisfy it.`}
          </p>
          <textarea className="input-base resize-none" rows={4} value={feedback}
            onChange={e => setFb(e.target.value)}
            placeholder={modal === 'approve'
              ? 'Optional comment for the student'
              : 'What should they change? This is required.'} />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-accent" disabled={busy || (modal === 'return' && !feedback.trim())}
              onClick={submit}>
              {busy ? 'Saving' : modal === 'approve' ? 'Approve' : 'Send back'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
