import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium select-none',
    'ring-offset-white transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-[#2605EF] text-white shadow-xs hover:bg-[#1e04cc] active:bg-[#1803b3]',
        secondary:
          'bg-white text-[#040B4D] border border-[#e2e8f0] shadow-xs hover:bg-[#f4f3f3] hover:border-[#cbd5e1] active:bg-[#e7e7e7]',
        ghost:
          'text-[#64748b] hover:bg-[#f4f3f3] hover:text-[#040B4D] active:bg-[#e2e8f0]',
        destructive:
          'bg-red-600 text-white shadow-xs hover:bg-red-700 active:bg-red-800',
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
