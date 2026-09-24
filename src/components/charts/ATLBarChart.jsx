import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { ChartEmpty } from './ChartContainer'
import { LEVEL_TICK, LEVEL_NAME, AXIS, GRID, TOOLTIP } from './chartTheme'

export default function ATLBarChart({ data, height = 260 }) {
  if (!data?.length) return <ChartEmpty />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} width={26} axisLine={false} tickLine={false}
          tickFormatter={v => LEVEL_TICK[v] ?? ''} tick={AXIS} />
        <Tooltip {...TOOLTIP} cursor={{ fill: '#f1f5f9' }}
          formatter={v => [LEVEL_NAME[Math.round(v)] ?? v, 'Level']} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((d, i) => <Cell key={i} fill={d.colour ?? '#123a8a'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
