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
          'flex h-9 w-full appearance-none rounded-lg border border-[#e2e8f0] bg-white',
          'pl-3 pr-8 text-sm text-[#040B4D] font-sans',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[#2605EF]/25 focus:border-[#2605EF]/60',
          'focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:bg-[#f4f3f3] disabled:text-[#94a3b8]',
          error && 'border-red-400 focus:ring-red-400/25',
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
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]"
        aria-hidden
      />
    </div>
  ),
)
Select.displayName = 'Select'

export { Select }
