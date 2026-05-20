import { forwardRef } from 'react'
import { cn } from '../../utils/helpers'

const Input = forwardRef(({ label, error, hint, className, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="label">{label}</label>}
    <input ref={ref} className={cn('input-base', error && 'border-red-400 focus:ring-red-200', className)} {...props} />
    {error  && <p className="text-xs text-red-500">{error}</p>}
    {hint   && !error && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
))
Input.displayName = 'Input'
export default Input

export const Textarea = forwardRef(({ label, error, hint, className, maxLength, value, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <div className="flex items-center justify-between">
        <label className="label mb-0">{label}</label>
        {maxLength && (
          <span className={cn('text-xs', (value?.length ?? 0) > maxLength * 0.9 ? 'text-amber-500' : 'text-slate-400')}>
            {value?.length ?? 0}/{maxLength}
          </span>
        )}
      </div>
    )}
    <textarea
      ref={ref}
      value={value}
      maxLength={maxLength}
      className={cn('input-base resize-none', error && 'border-red-400 focus:ring-red-200', className)}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
    {hint  && !error && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef(({ label, error, children, className, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="label">{label}</label>}
    <select ref={ref} className={cn('input-base', error && 'border-red-400', className)} {...props}>
      {children}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
))
Select.displayName = 'Select'
