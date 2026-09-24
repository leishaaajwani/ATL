import { cn } from '../../utils/helpers'

// A card is a bounded region with a header rail and a body. The header sits on
// its own hairline rather than floating in padding, which is what stops a page
// of cards reading as a stack of loose panels.

export default function Card({ className, children, hover, onClick, flush }) {
  return (
    <div
      className={cn(hover ? 'card-hover' : 'card', flush ? 'overflow-hidden' : 'px-4 py-3.5', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className, inset }) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-3',
      inset ? 'px-4 py-3 border-b border-hairline' : 'mb-3',
      className,
    )}>
      <div className="min-w-0">
        <h3 className="text-section font-semibold text-navy-900 leading-tight">{title}</h3>
        {subtitle && <p className="text-caption text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// A quiet divider-led section, for grouping inside a card without nesting
// another bordered box.
export function CardSection({ title, children, className }) {
  return (
    <div className={cn('px-4 py-3 border-t border-hairline first:border-t-0', className)}>
      {title && <p className="eyebrow mb-2">{title}</p>}
      {children}
    </div>
  )
}
