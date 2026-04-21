import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border-[1.5px] border-[#E7E7E7] bg-[#F4F4F4] px-4 py-2',
        'text-sm text-[#040B4D] font-sans placeholder:text-[rgba(4,11,77,0.40)]',
        'resize-y transition-all duration-150',
        'hover:border-[#D6D6D6]',
        'focus:outline-none focus:border-[#2605EF] focus:shadow-[0_0_0_3px_rgba(38,5,239,0.10)]',
        'disabled:cursor-not-allowed disabled:bg-[#E7E7E7] disabled:text-[#D6D6D6]',
        error && 'border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.08)]',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
