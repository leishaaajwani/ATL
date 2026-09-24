import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Image as ImageIcon, X, Paperclip } from 'lucide-react'
import {
  uploadEvidence, deleteEvidence, evidenceUrl,
  ACCEPTED_EVIDENCE, MAX_EVIDENCE_BYTES,
} from '../api/client'
import toast from 'react-hot-toast'

// Drop files here to back up a claim. The written note says what you did; the
// file shows it. Attached per sub-skill, so a teacher reviewing "designing an
// investigation" sees the method photo next to that specific claim rather than
// a pile of files at the bottom of the page.

const prettySize = b =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`

export default function EvidenceDropbox({ unitId, subskillId = null, files, onChange, disabled }) {
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const mine = files.filter(f =>
    subskillId ? f.subskillId === subskillId : f.subskillId === null)

  async function accept(fileList) {
    const chosen = [...fileList]
    if (!chosen.length) return
    setBusy(true)
    for (const file of chosen) {
      if (file.size > MAX_EVIDENCE_BYTES) {
        toast.error(`${file.name} is over 8 MB`)
        continue
      }
      try {
        await uploadEvidence({ file, unitId, subskillId })
      } catch (err) {
        toast.error(err.message)
      }
    }
    setBusy(false)
    await onChange()
  }

  async function drop(id, name) {
    try {
      await deleteEvidence(id)
      toast.success(`Removed ${name}`)
      await onChange()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files) }}
        className={`w-full rounded-xl border border-dashed px-3 py-3 transition-colors text-left
          ${dragging ? 'border-gold-500 bg-gold-50'
                     : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2">
          <Upload size={14} className={dragging ? 'text-gold-700' : 'text-slate-400'} />
          <span className="text-[11px] text-slate-600">
            {busy ? 'Uploading…'
              : dragging ? 'Drop to attach'
              : 'Drop a photo or file here, or click to browse'}
          </span>
        </span>
      </button>

      <input
        ref={inputRef} type="file" multiple hidden
        accept={ACCEPTED_EVIDENCE.join(',')}
        onChange={e => { accept(e.target.files); e.target.value = '' }}
      />

      <AnimatePresence initial={false}>
        {mine.map(f => (
          <motion.div key={f.id} layout
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-2.5 py-2">
            {f.contentType?.startsWith('image/')
              ? <ImageIcon size={13} className="text-navy-700 shrink-0" />
              : <FileText size={13} className="text-navy-700 shrink-0" />}
            <a href={evidenceUrl(f.id)} target="_blank" rel="noreferrer"
              className="text-[11px] text-slate-700 hover:text-navy-700 hover:underline truncate flex-1">
              {f.fileName}
            </a>
            <span className="text-[10px] text-slate-400 shrink-0">{prettySize(f.sizeBytes)}</span>
            {!disabled && (
              <button type="button" onClick={() => drop(f.id, f.fileName)}
                className="p-0.5 rounded text-slate-300 hover:text-rose-600 transition-colors shrink-0"
                title="Remove">
                <X size={12} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Read-only list, for the teacher reviewing a submission.
export function EvidenceList({ files, label = 'Evidence' }) {
  if (!files?.length) return null
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-500 mb-1.5 flex items-center gap-1">
        <Paperclip size={10} /> {label} ({files.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {files.map(f => (
          <a key={f.id} href={evidenceUrl(f.id)} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white
                       px-2 py-1 text-[11px] text-slate-700 hover:border-navy-300 hover:text-navy-800 transition-colors">
            {f.contentType?.startsWith('image/')
              ? <ImageIcon size={11} /> : <FileText size={11} />}
            <span className="truncate max-w-[180px]">{f.fileName}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
