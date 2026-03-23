import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium',
    'ring-offset-white transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-[#2605EF] text-white hover:bg-[#1e04cc] active:bg-[#1803b3]',
        secondary:
          'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        link:
          'text-[#2605EF] underline-offset-4 hover:underline h-auto p-0',
      },
      size: {
        sm:   'h-8  px-3   text-xs',
        md:   'h-9  px-4',
        lg:   'h-10 px-5',
        icon: 'h-9  w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child element (e.g. <Link>) via Radix Slot */
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
