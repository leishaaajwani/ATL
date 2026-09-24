import { motion } from 'framer-motion'
import { ChartEmpty } from './ChartContainer'
import { LEVEL_NAME } from './chartTheme'

function Ring({ value, colour, size = 66, stroke = 5 }) {
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(value / 4, 1))

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f5" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={colour} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  )
}

export default function ATLCircularProgress({ data }) {
  if (!data?.length) return <ChartEmpty />
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {data.map(d => (
        <div key={d.name} className="flex flex-col items-center text-center">
          <div className="relative">
            <Ring value={d.value} colour={d.colour ?? '#123a8a'} />
            <span className="absolute inset-0 flex items-center justify-center text-caption
                             font-semibold text-navy-900">
              {d.value?.toFixed(1)}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5 leading-tight">{d.name}</p>
          <p className="text-[11px] text-slate-400 leading-tight">
            {LEVEL_NAME[Math.round(d.value)] ?? ''}
          </p>
        </div>
      ))}
    </div>
  )
}
