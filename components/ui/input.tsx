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
        'flex h-9 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-1',
        'text-sm text-[#040B4D] placeholder:text-[#94a3b8]',
        'transition-all duration-150',
        'hover:border-[#cbd5e1]',
        'focus:outline-none focus:ring-2 focus:ring-[#2605EF]/25 focus:border-[#2605EF]/60 focus:shadow-[0_0_0_3px_rgba(38,5,239,0.08)]',
        'disabled:cursor-not-allowed disabled:bg-[#f4f3f3] disabled:text-[#94a3b8]',
        error && 'border-red-400 focus:ring-red-400',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
