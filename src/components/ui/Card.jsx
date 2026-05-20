import { cn } from '../../utils/helpers'

export default function Card({ className, children, hover, onClick }) {
  return (
    <div
      className={cn(hover ? 'card-hover' : 'card', 'p-5', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div>
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
