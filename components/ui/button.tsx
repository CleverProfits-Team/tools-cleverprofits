import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold select-none whitespace-nowrap',
    'ring-offset-white transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2605EF] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-[#2605EF] text-white shadow-md hover:bg-[#1E04C7] hover:-translate-y-px',
        navy:
          'bg-[#0F0038] text-white shadow-md hover:bg-[#050D61] hover:-translate-y-px',
        secondary:
          'bg-white text-[#0F0038] border border-[#E7E7E7] shadow-xs hover:border-[#D6D6D6] hover:bg-[#FAFAFA]',
        outline:
          'bg-transparent text-[#2605EF] border-[1.5px] border-[#2605EF] hover:bg-[rgba(38,5,239,0.06)]',
        ghost:
          'text-[#0F0038] hover:bg-[rgba(15,0,56,0.06)]',
        destructive:
          'bg-[#DC2626] text-white shadow-xs hover:bg-[#991B1B]',
        link:
          'text-[#2605EF] underline-offset-4 hover:underline h-auto p-0',
      },
      size: {
        sm:   'h-8  px-4   text-[11px]',
        md:   'h-10 px-6   text-sm',
        lg:   'h-12 px-8',
        xl:   'h-14 px-10  text-[18px]',
        icon: 'h-10 w-10',
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
