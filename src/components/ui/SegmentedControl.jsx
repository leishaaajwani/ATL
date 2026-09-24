import { motion } from 'framer-motion'

// An Apple-style segmented control: one recessed track, a single white pill
// that slides between options. Replaces rows of individually styled buttons,
// which read as several controls rather than one choice.
//
// The pill is a shared layoutId, so Framer animates the move rather than
// cross-fading two boxes. 200ms, no spring: this is a filter, not a toy.

export default function SegmentedControl({ options, value, onChange, size = 'md', className = '' }) {
  const pad = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'
  const id  = useTrackId(options)

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-control bg-slate-100 p-0.5 ${className}`}>
      {options.map(opt => {
        const key = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        const Icon = typeof opt === 'string' ? null : opt.icon
        const active = key === value

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`relative ${pad} rounded-[7px] text-caption font-medium
                        transition-colors duration-200 whitespace-nowrap
                        ${active ? 'text-navy-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {active && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-[7px] bg-white shadow-card"
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon size={13} />}
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Two controls on one page must not share a layoutId, or the pill flies
// between them. Derive a stable id from the option set.
function useTrackId(options) {
  const key = options.map(o => (typeof o === 'string' ? o : o.value)).join('|')
  return `segmented-${hash(key)}`
}

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}
