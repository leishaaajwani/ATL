import { cn } from '../../utils/helpers'

const variants = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
  outline:   'border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: '',
  lg: 'px-6 py-3 text-base rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  loading,
  icon,
  ...props
}) {
  return (
    <button
      className={cn(variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading
        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon}
      {children}
    </button>
  )
}
