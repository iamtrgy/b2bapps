import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-[0.97] touch-manipulation select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 active:shadow-sm",
        outline:
          "border-2 border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:border-ring",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/70",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80",
        primary: "bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/95 active:shadow-md font-semibold",
      },
      size: {
        "default": "h-11 px-5 py-2.5 text-base min-h-[44px]",
        "xs": "h-9 rounded px-2.5 text-sm min-h-[36px]",
        "sm": "h-10 rounded-md px-4 text-sm min-h-[40px]",
        "lg": "h-12 rounded-md px-8 text-base min-h-[48px]",
        "xl": "h-14 rounded-lg px-10 text-lg min-h-[56px]",
        "icon": "h-11 w-11 min-h-[44px] min-w-[44px]",
        "icon-sm": "size-10 min-h-[40px] min-w-[40px]",
        "icon-lg": "size-12 min-h-[48px] min-w-[48px]",
        "icon-xl": "size-14 min-h-[56px] min-w-[56px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
