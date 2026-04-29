import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Label = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'block text-sm font-semibold text-[#0F0038] mb-1.5',
      className,
    )}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
