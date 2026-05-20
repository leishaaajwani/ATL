import { cn } from '../../utils/helpers'

export default function LoadingSpinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-2', lg: 'w-10 h-10 border-3' }
  return (
    <div className={cn(
      'rounded-full border-slate-200 border-t-navy-600 animate-spin',
      sizes[size], className
    )} />
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  )
}
