import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  options?: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, options, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-11 w-full appearance-none rounded-lg border-[1.5px] border-[#E7E7E7] bg-white',
          'pl-4 pr-10 py-3 text-sm text-[#0F0038]',
          'transition-all duration-150',
          'hover:border-[#D6D6D6]',
          'focus:outline-none focus:border-[#2605EF] focus:shadow-[0_0_0_3px_rgba(38,5,239,0.10)]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          error && 'border-[#DC2626] focus:border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.08)]',
          className,
        )}
        {...props}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,0,56,0.40)]"
        aria-hidden
      />
    </div>
  ),
)
Select.displayName = 'Select'

export { Select }
