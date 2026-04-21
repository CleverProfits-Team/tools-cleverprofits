import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-[20px] text-sm font-medium select-none',
    'ring-offset-white transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-[#2605EF] text-white shadow-[0_4px_16px_rgba(38,5,239,0.30)] hover:bg-[#1e04cc] hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(38,5,239,0.40)] active:bg-[#1803b3]',
        navy: 'bg-[#040B4D] text-white shadow-[0_4px_12px_rgba(4,11,77,0.12),0_2px_6px_rgba(4,11,77,0.06)] hover:bg-[#050D61] hover:-translate-y-px active:bg-[#030828]',
        secondary:
          'bg-white text-[#040B4D] border border-[#E7E7E7] shadow-card hover:bg-[#FAFAFA] hover:border-[#D6D6D6] active:bg-[#E7E7E7]',
        ghost:
          'text-[rgba(4,11,77,0.55)] hover:bg-[rgba(4,11,77,0.06)] hover:text-[#040B4D] active:bg-[#E7E7E7]',
        destructive: 'bg-[#DC2626] text-white shadow-card hover:bg-[#991B1B] active:bg-[#7F1D1D]',
        link: 'text-[#2605EF] underline-offset-4 hover:underline h-auto p-0',
      },
      size: {
        sm: 'h-8  px-4   text-xs',
        md: 'h-9  px-5',
        lg: 'h-10 px-6',
        icon: 'h-9  w-9 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render as a child element (e.g. <Link>) via Radix Slot */
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
