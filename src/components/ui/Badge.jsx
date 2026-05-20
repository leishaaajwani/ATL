import { cn } from '../../utils/helpers'
import { getLevelStyle, getCategoryStyle } from '../../utils/atlFramework'

export function LevelBadge({ level, className }) {
  const style = getLevelStyle(level)
  return (
    <span
      className={cn('badge', className)}
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {level}
    </span>
  )
}

export function CategoryBadge({ category, className }) {
  const style = getCategoryStyle(category)
  return (
    <span
      className={cn('badge', className)}
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {category}
    </span>
  )
}

export function StatusBadge({ status, className }) {
  const styles = {
    pending:  { bg: '#fef9c3', color: '#854d0e' },
    approved: { bg: '#dcfce7', color: '#166534' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
  }
  const s = styles[status] ?? styles.pending
  return (
    <span
      className={cn('badge capitalize', className)}
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  )
}

export default function Badge({ children, color = 'slate', className }) {
  const palette = {
    slate:  'bg-slate-100 text-slate-600',
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    amber:  'bg-amber-50 text-amber-700',
    red:    'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
    navy:   'bg-navy-50 text-navy-700',
  }
  return (
    <span className={cn('badge', palette[color] ?? palette.slate, className)}>
      {children}
    </span>
  )
}
