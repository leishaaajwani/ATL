import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getMyUnits, getRatings, getRoster } from '../api/client'
import PageLayout from '../components/layout/PageLayout'
import Card, { CardHeader } from '../components/ui/Card'
import { PageLoader } from '../components/ui/LoadingSpinner'
import { SCORE_MAP } from '../utils/atlFramework'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import toast from 'react-hot-toast'

const LEVEL_TICK = ['', 'E', 'D', 'P', 'A']
const LEVEL_NAME = ['', 'Emerging', 'Developing', 'Proficient', 'Advanced']

export default function Analytics() {
  const { profile, isTeacher } = useAuth()
  return isTeacher ? <TeacherAnalytics profile={profile} /> : <StudentAnalytics />
}

// ── Student: how my self-assessment compares with my teachers ───────────────

function StudentAnalytics() {
  const [units, setUnits]     = useState([])
  const [ratings, setRatings] = useState([])
  const [subject, setSubject] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMyUnits(), getRatings({}).catch(() => ({ ratings: [] }))])
      .then(([u, r]) => { setUnits(u.units); setRatings(r.ratings ?? []) })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const subjects = useMemo(
    () => [...new Set(units.map(u => u.subjectName))].sort(),
    [units],
  )

  const filteredRatings = subject === 'all'
    ? ratings : ratings.filter(r => r.subjectName === subject)

  const comparison = useMemo(() => {
    const cats = [...new Set(ratings.map(r => r.categoryName))]
    return cats.map(cat => {
      const teacher = filteredRatings.filter(r => r.categoryName === cat)
      const tAvg = teacher.length
        ? teacher.reduce((s, r) => s + (SCORE_MAP[r.level] ?? 0), 0) / teacher.length : null
      return {
        name: cat === 'Self-management' ? 'Self-mgmt' : cat,
        'Teacher': tAvg !== null ? Number(tAvg.toFixed(2)) : null,
      }
    })
  }, [filteredRatings, ratings])

  if (loading) return <PageLoader />

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Your ATL progress</h1>
          <p className="text-sm text-slate-500 mt-0.5">How your skills are developing across units</p>
        </div>

        {subjects.length > 1 && (
          <div className="card p-4">
            <select className="input-base w-auto min-w-[200px]" value={subject}
              onChange={e => setSubject(e.target.value)}>
              <option value="all">All subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {ratings.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm font-medium text-slate-800">No teacher ratings yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Your teachers publish these at the end of each term. Once they do, you will
              see how their view compares with your own.
            </p>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader title="Teacher assessment by skill"
                subtitle={`Across ${filteredRatings.length} rated sub-skills`} />
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={comparison}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <PolarRadiusAxis domain={[0, 4]} tickCount={5}
                    tickFormatter={v => LEVEL_TICK[v] ?? ''}
                    tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Radar name="Teacher" dataKey="Teacher" stroke="#123a8a"
                    fill="#123a8a" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip formatter={v => LEVEL_NAME[Math.round(v)] ?? v}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardHeader title="Every rated sub-skill" subtitle="Grouped by unit" />
              <div className="space-y-3">
                {Object.entries(
                  filteredRatings.reduce((acc, r) => {
                    (acc[`${r.subjectName} · ${r.unitName}`] ??= []).push(r)
                    return acc
                  }, {}),
                ).map(([key, list]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-slate-700 mb-1.5">{key}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map(r => (
                        <span key={r.subskillId} className="text-[11px] px-2 py-1 rounded-lg"
                          style={{ backgroundColor: r.bgColour, color: r.colour }}>
                          {r.subskillName}: {r.level}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  )
}

// ── Teacher: where the class as a whole is strong or weak ───────────────────

function TeacherAnalytics({ profile }) {
  const sections = profile?.sections ?? []
  const [picked_, setSectionId]   = useState('')
  const [term, setTerm]           = useState('Term 1')
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(false)

  // Derive rather than sync: first class is the default until one is picked.
  const sectionId = picked_ || (sections[0] ? String(sections[0].id) : '')


  useEffect(() => {
    if (!sectionId) return
    setLoading(true)
    getRoster(sectionId)
      .then(async r => {
        const active = r.students.filter(s => s.enrollmentStatus === 'active')
        const all = await Promise.all(active.map(s =>
          getRatings({ studentId: s.id, sectionId, term })
            .then(d => ({ student: s, units: d.units }))
            .catch(() => ({ student: s, units: [] })),
        ))
        setRows(all)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [sectionId, term])

  // Class average per category, from teacher ratings only
  const byCategory = useMemo(() => {
    const acc = {}
    for (const { units } of rows) {
      for (const u of units ?? []) {
        for (const ss of u.subskills) {
          if (!ss.teacherLevel) continue
          ;(acc[ss.categoryName] ??= { colour: ss.colour, bg: ss.bgColour, scores: [] })
            .scores.push(SCORE_MAP[ss.teacherLevel] ?? 0)
        }
      }
    }
    return Object.entries(acc).map(([name, { colour, bg, scores }]) => ({
      name: name === 'Self-management' ? 'Self-mgmt' : name,
      colour, bg,
      average: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
      count: scores.length,
    }))
  }, [rows])

  // Where students and teacher disagree most, which is the interesting signal
  const gaps = useMemo(() => {
    const out = []
    for (const { student, units } of rows) {
      for (const u of units ?? []) {
        for (const ss of u.subskills) {
          if (!ss.teacherLevel || !ss.selfLevel) continue
          const gap = (SCORE_MAP[ss.teacherLevel] ?? 0) - (SCORE_MAP[ss.selfLevel] ?? 0)
          if (gap !== 0) out.push({ student: student.fullName, unit: u.unitName, name: ss.name, gap })
        }
      }
    }
    return out.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 12)
  }, [rows])

  if (!sections.length) {
    return (
      <PageLayout>
        <div className="card p-10 text-center max-w-md mx-auto">
          <p className="text-sm font-medium text-slate-800">No classes yet</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Class analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Where your class is strong, and where it is not</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select className="input-base w-auto min-w-[220px]" value={sectionId}
            onChange={e => setSectionId(e.target.value)}>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.subjectName} · {s.grade}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            {['Term 1', 'Term 2', 'Term 3'].map(t => (
              <button key={t} onClick={() => setTerm(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  term === t ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? <PageLoader /> : byCategory.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm font-medium text-slate-800">Nothing rated in {term} yet</p>
            <p className="text-xs text-slate-500 mt-1">Rate students in Reports and this fills in.</p>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader title="Class average by ATL category"
                subtitle={`${rows.length} students, ${byCategory.reduce((n, c) => n + c.count, 0)} ratings`} />
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byCategory} margin={{ top: 5, right: 16, left: -12, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]}
                    tickFormatter={v => LEVEL_TICK[v] ?? ''}
                    tick={{ fontSize: 11, fill: '#94a3b8' }} width={24} />
                  <Tooltip formatter={v => LEVEL_NAME[Math.round(v)] ?? v}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="average" fill="#123a8a" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {gaps.length > 0 && (
              <Card>
                <CardHeader title="Biggest gaps between self and teacher"
                  subtitle="Where a conversation would be most useful" />
                <div className="space-y-1.5">
                  {gaps.map((g, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{g.student}</p>
                        <p className="text-[11px] text-slate-500 truncate">{g.unit} · {g.name}</p>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${
                        g.gap > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {g.gap > 0 ? `+${g.gap}` : g.gap}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                  A negative number means the student rated themselves higher than you did.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </PageLayout>
  )
}
