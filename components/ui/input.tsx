import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1',
        'text-sm text-slate-900 placeholder:text-slate-400',
        'transition-all duration-150',
        'hover:border-slate-300',
        'focus:outline-none focus:ring-2 focus:ring-[#2605EF]/25 focus:border-[#2605EF]/60 focus:shadow-[0_0_0_3px_rgba(38,5,239,0.08)]',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
        error && 'border-red-400 focus:ring-red-400',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
