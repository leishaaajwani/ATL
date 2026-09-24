import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hexagon, BarChart3, TrendingUp, CircleDashed } from 'lucide-react'
import SegmentedControl from '../ui/SegmentedControl'
import ATLRadarChart from './ATLRadarChart'
import ATLBarChart from './ATLBarChart'
import ATLLineChart from './ATLLineChart'
import ATLCircularProgress from './ATLCircularProgress'

// Four views of the same numbers. Only the chart body animates on switch: the
// header and the control stay put, so the eye is not asked to re-find them.
//
// data  [{ name, value, colour }]                 radar, bar, circular
// trend [{ term, <category>: value, ... }]        line

const MODES = [
  { value: 'radar',    label: 'Radar',    icon: Hexagon },
  { value: 'bar',      label: 'Bar',      icon: BarChart3 },
  { value: 'line',     label: 'Line',     icon: TrendingUp },
  { value: 'circular', label: 'Progress', icon: CircleDashed },
]

export default function ChartContainer({ data = [], trend = [], title, subtitle, height = 260 }) {
  const [mode, setMode] = useState('radar')
  const available = trend.length ? MODES : MODES.filter(m => m.value !== 'line')

  return (
    <section className="card">
      <header className="flex items-start justify-between gap-4 px-4 py-3 border-b border-hairline flex-wrap">
        <div className="min-w-0">
          <h2 className="text-section font-semibold text-navy-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-caption text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <SegmentedControl options={available} value={mode} onChange={setMode} size="sm" />
      </header>

      <div className="px-4 py-4" style={{ minHeight: height + 16 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            {mode === 'radar'    && <ATLRadarChart data={data} height={height} />}
            {mode === 'bar'      && <ATLBarChart data={data} height={height} />}
            {mode === 'line'     && <ATLLineChart data={trend} height={height} />}
            {mode === 'circular' && <ATLCircularProgress data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

export function ChartEmpty({ message = 'Nothing to chart yet' }) {
  return (
    <div className="flex items-center justify-center text-caption text-slate-400" style={{ height: 200 }}>
      {message}
    </div>
  )
}
