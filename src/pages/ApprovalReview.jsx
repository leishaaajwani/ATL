import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, MessageSquare, ChevronDown, Filter } from 'lucide-react'
import { usePendingEntries, useAllEntries } from '../hooks/useATLEntries'
import { approveEntry, rejectEntry } from '../firebase/firestore'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Textarea, Select } from '../components/ui/Input'
import { LevelBadge, CategoryBadge, StatusBadge } from '../components/ui/Badge'
import { ASSESSMENT_LEVELS, ATL_CATEGORIES } from '../utils/atlFramework'
import { formatDateTime, truncate } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function ApprovalReview() {
  const { entries: pending, loading } = usePendingEntries()
  const { entries: allEntries } = useAllEntries()
  const [filter, setFilter] = useState('pending')

  const reviewed = allEntries.filter(e => e.approvalStatus !== 'pending')
  const displayed = filter === 'pending' ? pending : reviewed

  return (
    <PageLayout>
      <div className="space-y-5">
        <div>
          <h1 className="page-title">Approval Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review, approve, and provide feedback on student reflections</p>
        </div>

        {/* Toggle */}
        <div className="flex gap-2">
          {['pending', 'reviewed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f ? 'bg-navy-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {f === 'pending' ? `Pending (${pending.length})` : `Reviewed (${reviewed.length})`}
            </button>
          ))}
        </div>

        {/* Entries */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">
              {filter === 'pending' ? 'No pending entries — all caught up!' : 'No reviewed entries yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {displayed.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <EntryCard entry={entry} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function EntryCard({ entry }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [action, setAction] = useState(null) // 'approve' | 'reject'
  const [feedback, setFeedback] = useState('')
  const [overrideLevel, setOverrideLevel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const isPending = entry.approvalStatus === 'pending'
  const catStyle = ATL_CATEGORIES[entry.atlCategory] ?? { color: '#64748b', bg: '#f8fafc' }

  function openModal(type) {
    setAction(type)
    setFeedback('')
    setOverrideLevel('')
    setModalOpen(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const scoreOverride = overrideLevel ? ASSESSMENT_LEVELS.find(l => l.value === overrideLevel)?.score : null
      if (action === 'approve') {
        await approveEntry(entry.id, feedback, scoreOverride)
        toast.success('Entry approved')
      } else {
        await rejectEntry(entry.id, feedback)
        toast.success('Entry returned to student')
      }
      setModalOpen(false)
    } catch (err) {
      toast.error('Action failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="card overflow-hidden">
        {/* Card header */}
        <div
          className="flex items-start gap-4 p-5 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: catStyle.bg }}
          >
            <span className="text-base font-semibold" style={{ color: catStyle.color }}>
              {entry.atlCategory?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-slate-900">{entry.studentName}</span>
              <span className="text-slate-400 text-sm">·</span>
              <span className="text-sm text-slate-600">{entry.subject}</span>
              <CategoryBadge category={entry.atlCategory} />
              <StatusBadge status={entry.approvalStatus} />
            </div>
            <p className="text-xs text-slate-400">{entry.substrand} · {entry.term} of Term · {formatDateTime(entry.createdAt)}</p>
            <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
              {expanded ? entry.reflection : truncate(entry.reflection, 120)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LevelBadge level={entry.selfAssessment} />
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Expanded section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                {/* Full reflection */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Full Reflection</p>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl">{entry.reflection}</p>
                </div>

                {/* Existing feedback */}
                {entry.teacherFeedback && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Teacher Feedback</p>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{entry.teacherFeedback}</p>
                    {entry.teacherScore && (
                      <p className="text-xs text-slate-400 mt-1">
                        Score: <span className="font-medium text-slate-700">{entry.teacherScore}/4</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {isPending && (
                  <div className="flex gap-2 justify-end">
                    <Button variant="danger" size="sm" icon={<XCircle size={13} />} onClick={() => openModal('reject')}>
                      Return to Student
                    </Button>
                    <Button variant="primary" size="sm" icon={<CheckCircle size={13} />} onClick={() => openModal('approve')}>
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Review modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={action === 'approve' ? 'Approve Entry' : 'Return to Student'}
      >
        <div className="space-y-4">
          {/* Entry summary */}
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-medium">{entry.studentName}</span>
              <CategoryBadge category={entry.atlCategory} />
              <LevelBadge level={entry.selfAssessment} />
            </div>
            <p className="text-xs text-slate-500">{truncate(entry.reflection, 100)}</p>
          </div>

          <Textarea
            label={action === 'approve' ? 'Feedback (optional)' : 'Feedback for student (required)'}
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={4}
            placeholder={
              action === 'approve'
                ? 'Add encouraging feedback or notes for the student…'
                : 'Explain what the student should improve or clarify before resubmitting…'
            }
          />

          {action === 'approve' && (
            <Select
              label="Override assessment level (optional)"
              value={overrideLevel}
              onChange={e => setOverrideLevel(e.target.value)}
            >
              <option value="">Keep student self-assessment ({entry.selfAssessment})</option>
              {ASSESSMENT_LEVELS.map(l => (
                <option key={l.value} value={l.value}>{l.value} ({l.score}/4)</option>
              ))}
            </Select>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant={action === 'approve' ? 'primary' : 'danger'}
              loading={submitting}
              onClick={handleSubmit}
              disabled={action === 'reject' && !feedback.trim()}
            >
              {action === 'approve' ? 'Approve Entry' : 'Return to Student'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
