import { motion } from 'framer-motion'
import { ATL_CATEGORIES, ATL_CATEGORY_KEYS } from '../../utils/atlFramework'

function CircleProgress({ value, max = 4, color, size = 80, strokeWidth = 7 }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const progress = Math.min(value / max, 1)
  const offset = circ * (1 - progress)

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
      />
    </svg>
  )
}

export default function ATLCircularProgress({ categoryAverages }) {
  const hasData = Object.values(categoryAverages ?? {}).some(v => v > 0)

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No approved entries yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 py-4">
      {ATL_CATEGORY_KEYS.map(cat => {
        const { color, bg } = ATL_CATEGORIES[cat]
        const val = categoryAverages?.[cat] ?? 0
        const pct = Math.round((val / 4) * 100)
        const levelLabel = val === 0 ? 'N/A' : val < 1.5 ? 'Emerging' : val < 2.5 ? 'Developing' : val < 3.5 ? 'Proficient' : 'Advanced'

        return (
          <div key={cat} className="flex flex-col items-center gap-2">
            <div className="relative">
              <CircleProgress value={val} color={color} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold" style={{ color }}>
                  {val > 0 ? val.toFixed(1) : '—'}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-slate-700 leading-tight">{cat}</p>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block"
                style={{ backgroundColor: bg, color }}
              >
                {levelLabel}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
