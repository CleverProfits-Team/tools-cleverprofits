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
        'flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2',
        'text-sm text-slate-900 placeholder:text-slate-400',
        'resize-y transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-[#2605EF] focus:border-transparent',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
        error && 'border-red-400 focus:ring-red-400',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
