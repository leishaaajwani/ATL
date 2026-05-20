import { useMemo } from 'react'
import { ATL_CATEGORY_KEYS, SCORE_MAP, TERMS } from '../utils/atlFramework'
import { average, groupBy } from '../utils/helpers'

/**
 * Derives analytics from a flat list of ATL entries.
 * Only approved entries contribute to charts/scores.
 */
export function useAnalytics(entries) {
  return useMemo(() => {
    const approved = entries.filter(e => e.approvalStatus === 'approved')

    // ── Per-category averages (use teacher score when available) ──────────────
    const categoryAverages = ATL_CATEGORY_KEYS.reduce((acc, cat) => {
      const catEntries = approved.filter(e => e.atlCategory === cat)
      const scores = catEntries.map(e => e.teacherScore ?? e.score)
      acc[cat] = scores.length ? average(scores) : 0
      return acc
    }, {})

    // ── Radar chart data ──────────────────────────────────────────────────────
    const radarData = ATL_CATEGORY_KEYS.map(cat => ({
      category: cat.length > 7 ? cat.split('-')[0].trim() : cat,
      fullName: cat,
      student:  parseFloat(categoryAverages[cat].toFixed(2)),
      max:      4,
    }))

    // ── Term progression (line/bar) ───────────────────────────────────────────
    const termData = TERMS.map(term => {
      const termEntries = approved.filter(e => e.term === term)
      const row = { term }
      ATL_CATEGORY_KEYS.forEach(cat => {
        const catEntries = termEntries.filter(e => e.atlCategory === cat)
        const scores = catEntries.map(e => e.teacherScore ?? e.score)
        row[cat] = scores.length ? parseFloat(average(scores).toFixed(2)) : null
      })
      return row
    })

    // ── Subject breakdown ─────────────────────────────────────────────────────
    const bySubject = groupBy(approved, 'subject')
    const subjectData = Object.entries(bySubject).map(([subject, items]) => {
      const scores = items.map(e => e.teacherScore ?? e.score)
      return { subject, average: parseFloat(average(scores).toFixed(2)), count: items.length }
    })

    // ── Counts ────────────────────────────────────────────────────────────────
    const totalApproved = approved.length
    const totalPending  = entries.filter(e => e.approvalStatus === 'pending').length
    const totalRejected = entries.filter(e => e.approvalStatus === 'rejected').length

    // ── Overall score ─────────────────────────────────────────────────────────
    const allScores = approved.map(e => e.teacherScore ?? e.score)
    const overallAverage = allScores.length ? parseFloat(average(allScores).toFixed(2)) : 0

    return {
      categoryAverages,
      radarData,
      termData,
      subjectData,
      totalApproved,
      totalPending,
      totalRejected,
      overallAverage,
      approvedEntries: approved,
    }
  }, [entries])
}
