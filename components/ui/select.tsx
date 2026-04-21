import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  options?: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, options, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full appearance-none rounded-lg border-[1.5px] border-[#D6D6D6] bg-white',
          'pl-4 pr-10 text-sm text-[#040B4D] font-sans',
          'transition-all duration-150',
          'hover:border-[#D6D6D6]',
          'focus:outline-none focus:border-[#2605EF] focus:shadow-[0_0_0_3px_rgba(38,5,239,0.10)]',
          'disabled:cursor-not-allowed disabled:bg-[#E7E7E7] disabled:text-[#D6D6D6]',
          error && 'border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.08)]',
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
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(4,11,77,0.40)]"
        aria-hidden
      />
    </div>
  ),
)
Select.displayName = 'Select'

export { Select }
