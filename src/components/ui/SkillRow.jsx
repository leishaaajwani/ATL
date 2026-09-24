import { Check } from 'lucide-react'
import { categoryTint } from '../../utils/categoryTint'

// One ATL sub-skill as a dense list row: checkbox, title, category badge right.
//
// This replaces the large bordered selection boxes. A Chemistry unit offers
// around fifteen sub-skills, and fifteen cards is a scroll; fifteen rows is a
// list you can read in one pass. The separator is a hairline, so the set reads
// as a single table rather than as competing objects.

export default function SkillRow({
  name, categoryName, descriptor, subjectSpecific,
  checked, onToggle, disabled, children, trailing,
}) {
  const tint = categoryTint(categoryName)

  return (
    <div className={`border-b border-hairline last:border-0 ${checked ? 'bg-navy-50/40' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left
                    transition-colors duration-200
                    ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50'}`}
      >
        <span
          className={`w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center
                      shrink-0 transition-colors duration-200
                      ${checked ? 'bg-navy-900 border-navy-900' : 'border-slate-300 bg-white'}`}
        >
          {checked && <Check size={10} className="text-white" strokeWidth={3} />}
        </span>

        <span className="flex-1 min-w-0">
          <span className="block text-caption text-slate-800 leading-snug truncate">
            {name}
          </span>
          {descriptor && (
            <span className="block text-[11px] text-slate-400 leading-snug truncate mt-0.5">
              {descriptor}
            </span>
          )}
        </span>

        {trailing}

        <span
          className="shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded"
          style={{ backgroundColor: tint.bg, color: tint.fg }}
        >
          {categoryName}
          {subjectSpecific && <span className="ml-1 opacity-60">·</span>}
        </span>
      </button>

      {children}
    </div>
  )
}
