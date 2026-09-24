import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { ChartEmpty } from './ChartContainer'
import { LEVEL_TICK, LEVEL_NAME, AXIS, GRID, TOOLTIP, SERIES } from './chartTheme'

// Progression across terms. Each line is one ATL category.
export default function ATLLineChart({ data, height = 260 }) {
  if (!data?.length) return <ChartEmpty message="Needs more than one term of data" />

  const categories = [...new Set(data.flatMap(d => Object.keys(d)))].filter(k => k !== 'term')

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="term" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} width={26} axisLine={false} tickLine={false}
          tickFormatter={v => LEVEL_TICK[v] ?? ''} tick={AXIS} />
        <Tooltip {...TOOLTIP} formatter={v => LEVEL_NAME[Math.round(v)] ?? v} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="plainline" iconSize={12} />
        {categories.map((cat, i) => (
          <Line key={cat} type="monotone" dataKey={cat} stroke={SERIES[i % SERIES.length]}
            strokeWidth={1.5} dot={{ r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
