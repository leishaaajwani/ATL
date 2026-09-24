import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChartEmpty } from './ChartContainer'
import { LEVEL_TICK, LEVEL_NAME, AXIS, GRID, TOOLTIP } from './chartTheme'

export default function ATLRadarChart({ data, height = 260 }) {
  if (!data?.length) return <ChartEmpty />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="name" tick={AXIS} />
        <PolarRadiusAxis domain={[0, 4]} tickCount={5} axisLine={false}
          tickFormatter={v => LEVEL_TICK[v] ?? ''} tick={{ ...AXIS, fontSize: 10 }} />
        <Radar dataKey="value" stroke="#123a8a" fill="#123a8a" fillOpacity={0.12} strokeWidth={1.5} />
        <Tooltip {...TOOLTIP} formatter={v => [LEVEL_NAME[Math.round(v)] ?? v, 'Level']} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
