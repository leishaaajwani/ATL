import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { ATL_CATEGORIES, ATL_CATEGORY_KEYS } from '../../utils/atlFramework'

const COLORS = ATL_CATEGORY_KEYS.map(k => ATL_CATEGORIES[k].color)

export default function ATLBarChart({ data }) {
  if (!data?.length) return <EmptyState />

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="term" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis domain={[0, 4]} tickCount={5} tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <Tooltip
          formatter={(value, name) => [value ? value.toFixed(2) : '—', name]}
          contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {ATL_CATEGORY_KEYS.map((cat, i) => (
          <Bar key={cat} dataKey={cat} fill={COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={18} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function EmptyState() {
  return (
    <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
      No data to display yet.
    </div>
  )
}
