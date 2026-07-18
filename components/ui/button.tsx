import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-normal whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-white text-[#0a0a0a] border-white hover:opacity-90',
        outline:
          'border-[rgba(255,255,255,0.25)] bg-transparent text-white hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)]',
        secondary:
          'bg-[#1a1c20] text-white border-[#212327] hover:bg-[#212327]',
        ghost:
          'text-[#7d8187] hover:text-white hover:bg-[rgba(255,255,255,0.05)]',
        destructive:
          'border-[rgba(255,68,68,0.3)] bg-transparent text-[#ff4444] hover:bg-[rgba(255,68,68,0.1)] hover:border-[rgba(255,68,68,0.5)]',
        link: 'text-white underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-8 gap-1.5 px-4',
        xs: "h-6 gap-1 px-3 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-5',
        icon: 'size-8',
        'icon-xs':
          "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
