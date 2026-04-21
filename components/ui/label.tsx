import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block text-xs font-medium uppercase tracking-wide text-[rgba(4,11,77,0.55)] font-display mb-1.5',
        className,
      )}
      {...props}
    />
  ),
)
Label.displayName = 'Label'

export { Label }
