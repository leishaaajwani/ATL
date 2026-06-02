import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Modal from './Modal'
import Button from './Button'
import { ATL_CATEGORIES, ATL_CATEGORY_KEYS, ASSESSMENT_LEVELS } from '../../utils/atlFramework'
import { saveTeacherRating } from '../../firebase/firestore'
import { useAuth } from '../../contexts/AuthContext'

const RATING_TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4']

export default function TeacherRatingModal({ open, onClose, student }) {
  const { userDoc } = useAuth()
  const [term, setTerm] = useState('Term 1')
  const [ratings, setRatings] = useState({
    Communication: null,
    Social: null,
    'Self-management': null,
    Research: null,
    Thinking: null,
  })
  const [saving, setSaving] = useState(false)

  const allRated = ATL_CATEGORY_KEYS.every(cat => ratings[cat] !== null)

  async function handleSave() {
    if (!allRated) { toast.error('Please rate all 5 ATL categories'); return }
    setSaving(true)
    try {
      await saveTeacherRating({
        teacherId: userDoc.uid,
        teacherName: userDoc.displayName,
        studentId: student.id,
        studentName: student.displayName,
        term,
        ratings,
      })
      toast.success(`Rating saved for ${student.displayName} — ${term}`)
      onClose()
      setRatings({ Communication: null, Social: null, 'Self-management': null, Research: null, Thinking: null })
    } catch (err) {
      toast.error('Failed to save rating')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Rate ${student?.displayName ?? 'Student'}`} size="lg">
      <div className="space-y-5">
        {/* Term selector */}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-2">Rating Period</label>
          <div className="flex gap-2 flex-wrap">
            {RATING_TERMS.map(t => (
              <button
                key={t}
                onClick={() => setTerm(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  term === t
                    ? 'bg-navy-700 text-white border-navy-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Category ratings */}
        <div className="space-y-4">
          {ATL_CATEGORY_KEYS.map((cat, i) => {
            const { color, bg } = ATL_CATEGORIES[cat]
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: bg, color }}>
                    {cat[0]}
                  </div>
                  <span className="text-sm font-medium text-slate-800">{cat}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {ASSESSMENT_LEVELS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => setRatings(r => ({ ...r, [cat]: level.score }))}
                      className={`py-2 px-1 rounded-xl text-xs font-medium border-2 transition-all text-center ${
                        ratings[cat] === level.score
                          ? 'border-current text-white'
                          : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                      style={ratings[cat] === level.score
                        ? { backgroundColor: level.color, borderColor: level.color }
                        : {}
                      }
                    >
                      <div className="font-bold text-sm">{level.score}</div>
                      <div className="text-[10px] leading-tight">{level.label}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!allRated}>
            Save Rating
          </Button>
        </div>
      </div>
    </Modal>
  )
}
