import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Upload, CheckCircle2, Clock } from 'lucide-react'
import { adminListUsers, adminAddUser, adminImportCsv, adminUpdateUser } from '../api/client'
import PageLayout from '../components/layout/PageLayout'
import { PageLoader } from '../components/ui/LoadingSpinner'
import SegmentedControl from '../components/ui/SegmentedControl'
import toast from 'react-hot-toast'

// Adding someone here is the whole invite mechanism. Their email becomes able
// to sign in, and nothing else does. There is no token to send, expire or leak.

export default function AdminPage() {
  const [tab, setTab]       = useState('teacher')
  const [users, setUsers]   = useState([])
  const [loading, setLoad]  = useState(true)

  async function load() {
    setLoad(true)
    try { setUsers((await adminListUsers(tab)).users) }
    catch (err) { toast.error(err.message) }
    finally { setLoad(false) }
  }
  useEffect(() => { load() }, [tab])

  const awaiting = users.filter(u => u.status === 'invited').length

  return (
    <PageLayout>
      <div className="space-y-5">
        <div>
          <h1 className="page-title">Roster</h1>
          <p className="page-subtitle">
            Anyone on this list can sign in. Anyone not on it cannot.
          </p>
        </div>

        <SegmentedControl
          options={[
            { value: 'teacher', label: 'Teachers' },
            { value: 'student', label: 'Students' },
            { value: 'admin',   label: 'Admins' },
          ]}
          value={tab} onChange={setTab}
        />

        <div className="grid lg:grid-cols-2 gap-5">
          <AddOne role={tab} onDone={load} />
          <ImportCsv role={tab} onDone={load} />
        </div>

        {awaiting > 0 && (
          <div className="card border-l-2 border-l-gold-500 flex items-center gap-2.5">
            <Clock size={14} className="text-gold-700 shrink-0" />
            <p className="text-caption text-slate-700">
              {awaiting} {awaiting === 1 ? 'person has' : 'people have'} not signed in yet.
              They can at any time, there is nothing to resend.
            </p>
          </div>
        )}

        {loading ? <PageLoader /> : <RosterTable users={users} role={tab} onChange={load} />}
      </div>
    </PageLayout>
  )
}

function AddOne({ role, onDone }) {
  const [fullName, setName] = useState('')
  const [email, setEmail]   = useState('')
  const [grade, setGrade]   = useState('DP1')
  const [busy, setBusy]     = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await adminAddUser({ fullName, email, role, grade })
      toast.success(`${fullName} added`)
      setName(''); setEmail('')
      await onDone()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <h2 className="text-caption font-semibold text-slate-800 flex items-center gap-2">
        <UserPlus size={15} className="text-navy-700" /> Add one {role}
      </h2>
      <input className="input-base" placeholder="Full name" value={fullName}
        onChange={e => setName(e.target.value)} />
      <input className="input-base" type="email" placeholder="School email address"
        value={email} onChange={e => setEmail(e.target.value)} />
      {role === 'student' && (
        <select className="input-base" value={grade} onChange={e => setGrade(e.target.value)}>
          <option value="DP1">DP1</option>
          <option value="DP2">DP2</option>
        </select>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Adding' : 'Add to roster'}
      </button>
    </form>
  )
}

function ImportCsv({ role, onDone }) {
  const [csv, setCsv]   = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await adminImportCsv(csv, role)
      setResult(r)
      toast.success(`${r.added} added`)
      setCsv('')
      await onDone()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <h2 className="text-caption font-semibold text-slate-800 flex items-center gap-2">
        <Upload size={15} className="text-navy-700" /> Bulk import
      </h2>
      <p className="text-caption text-slate-500 leading-relaxed">
        One per line: name, email{role === 'student' ? ', grade' : ', staff id'}.
        A header row is fine, it gets skipped.
      </p>
      <textarea className="input-base resize-none font-mono !text-xs" rows={5}
        placeholder={role === 'student'
          ? 'Neethu Pillai, neethu@school.ae, DP1'
          : 'Sheldon Dias, sheldon@school.ae, T1043'}
        value={csv} onChange={e => setCsv(e.target.value)} />
      <button className="btn-primary w-full" disabled={busy || !csv.trim()}>
        {busy ? 'Importing' : `Import ${role}s`}
      </button>

      {result?.skipped?.length > 0 && (
        <div className="text-xs space-y-1 pt-2 border-t border-slate-100">
          <p className="font-medium text-gold-800">{result.skipped.length} skipped:</p>
          {result.skipped.slice(0, 5).map((s, i) => (
            <p key={i} className="text-slate-500 truncate">{s.line} ({s.why})</p>
          ))}
        </div>
      )}
    </form>
  )
}

function RosterTable({ users, role, onChange }) {
  if (!users.length) {
    return <div className="card px-5 py-8 text-center text-sm text-slate-500">No {role}s on the roster yet.</div>
  }

  async function setStatus(id, status) {
    try { await adminUpdateUser({ id, status }); toast.success('Updated'); await onChange() }
    catch (err) { toast.error(err.message) }
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">Name</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">Email</th>
              <th className="text-center py-2.5 px-4 text-xs font-medium text-slate-500">
                {role === 'teacher' ? 'Classes' : role === 'student' ? 'Enrolled' : ''}
              </th>
              <th className="text-center py-2.5 px-4 text-xs font-medium text-slate-500">Status</th>
              <th className="py-2.5 px-4" />
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 font-medium text-slate-900">
                  {u.fullName}
                  {u.grade && <span className="ml-2 badge-neutral">{u.grade}</span>}
                </td>
                <td className="py-3 px-4 text-slate-500 text-xs">{u.email}</td>
                <td className="py-3 px-4 text-center text-slate-600">
                  {role === 'teacher' ? u.sectionCount : role === 'student' ? u.enrolledCount : ''}
                </td>
                <td className="py-3 px-4 text-center">
                  {u.status === 'active'
                    ? <span className="badge bg-emerald-50 text-emerald-700"><CheckCircle2 size={11} /> Active</span>
                    : u.status === 'invited'
                    ? <span className="badge-waiting"><Clock size={11} /> Not signed in</span>
                    : <span className="badge bg-slate-100 text-slate-500">Disabled</span>}
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
                    onClick={() => setStatus(u.id, u.status === 'disabled' ? 'active' : 'disabled')}>
                    {u.status === 'disabled' ? 'Re-enable' : 'Disable'}
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
