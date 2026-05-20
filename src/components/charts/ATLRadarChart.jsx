import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { ATL_CATEGORIES } from '../../utils/atlFramework'

const COLORS = { student: '#1a3ef5', teacher: '#10b981' }

export default function ATLRadarChart({ data }) {
  if (!data?.length) return <EmptyState />

  const hasTeacher = data.some(d => d.teacher != null)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fontSize: 12, fill: '#64748b', fontFamily: 'Inter' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 4]}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickCount={5}
        />
        <Radar
          name="Student"
          dataKey="student"
          stroke={COLORS.student}
          fill={COLORS.student}
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ r: 3, fill: COLORS.student }}
        />
        {hasTeacher && (
          <Radar
            name="Teacher"
            dataKey="teacher"
            stroke={COLORS.teacher}
            fill={COLORS.teacher}
            fillOpacity={0.12}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.teacher }}
            strokeDasharray="4 2"
          />
        )}
        <Tooltip
          formatter={(value, name) => [value ? value.toFixed(2) : '—', name]}
          contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9' }}
        />
        {hasTeacher && <Legend />}
      </RadarChart>
    </ResponsiveContainer>
  )
}

function EmptyState() {
  return (
    <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
      No approved entries yet — submit reflections to see your chart.
    </div>
  )
}
