import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2',
        'text-sm text-[#040B4D] font-sans placeholder:text-[#94a3b8]',
        'resize-y transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-[#2605EF]/25 focus:border-[#2605EF]/60',
        'focus-visible:ring-2 focus-visible:ring-[#2605EF]/30 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:bg-[#f4f3f3] disabled:text-[#94a3b8]',
        error && 'border-red-400 focus:ring-red-400/25',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
