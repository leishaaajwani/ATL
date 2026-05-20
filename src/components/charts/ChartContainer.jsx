import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radar, BarChart2, TrendingUp, Circle } from 'lucide-react'
import { cn } from '../../utils/helpers'
import ATLRadarChart from './ATLRadarChart'
import ATLBarChart from './ATLBarChart'
import ATLLineChart from './ATLLineChart'
import ATLCircularProgress from './ATLCircularProgress'

const CHART_TYPES = [
  { id: 'radar',    label: 'Radar',    icon: Radar },
  { id: 'bar',      label: 'Bar',      icon: BarChart2 },
  { id: 'line',     label: 'Line',     icon: TrendingUp },
  { id: 'circular', label: 'Progress', icon: Circle },
]

export default function ChartContainer({ radarData, termData, categoryAverages, title }) {
  const [activeChart, setActiveChart] = useState('radar')

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h3 className="section-title">{title ?? 'ATL Performance'}</h3>
        <div className="flex gap-1 bg-slate-50 border border-slate-100 p-1 rounded-xl">
          {CHART_TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveChart(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                activeChart === id
                  ? 'bg-white text-navy-700 shadow-card'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeChart}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {activeChart === 'radar'    && <ATLRadarChart data={radarData} />}
          {activeChart === 'bar'      && <ATLBarChart data={termData} />}
          {activeChart === 'line'     && <ATLLineChart data={termData} />}
          {activeChart === 'circular' && <ATLCircularProgress categoryAverages={categoryAverages} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
