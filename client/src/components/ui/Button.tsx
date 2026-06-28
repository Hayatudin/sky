import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-7 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-5 gap-1 rounded-sm px-2 text-[0.625rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "h-6 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-8 gap-1 px-2.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs": "size-5 rounded-sm [&_svg:not([class*='size-'])]:size-2.5",
        "icon-sm": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-8 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "default" | "destructive" | "link"
  size?: "sm" | "md" | "lg" | "default" | "xs" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  loading?: boolean
  icon?: React.ReactNode
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      const Comp = Slot.Root

      // Map legacy props to Radix UI equivalents
      let mappedVariant: any = variant
      if (variant === "primary") mappedVariant = "default"
      if (variant === "danger") mappedVariant = "destructive"

      let mappedSize: any = size
      if (size === "md") mappedSize = "default"

      return (
        <Comp
          data-slot="button"
          data-variant={mappedVariant}
          data-size={mappedSize}
          className={cn(buttonVariants({ variant: mappedVariant, size: mappedSize, className }))}
          ref={ref}
          {...(props as any)}
        >
          {children}
        </Comp>
      )
    }

    // Original component styles and structure
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

    const originalVariants = {
      primary: "bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-sm hover:shadow-md",
      secondary: "bg-primary-50 text-primary hover:bg-primary-100 focus:ring-primary",
      outline:
        "border-2 border-border text-text-primary hover:border-primary hover:text-primary focus:ring-primary bg-transparent",
      ghost:
        "text-text-secondary hover:text-text-primary hover:bg-surface-hover focus:ring-primary bg-transparent",
      danger: "bg-danger text-white hover:bg-red-600 focus:ring-danger shadow-sm",
      // Shadcn Fallbacks
      default: "bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-sm hover:shadow-md",
      destructive: "bg-danger text-white hover:bg-red-600 focus:ring-danger shadow-sm",
      link: "text-primary underline-offset-4 hover:underline bg-transparent",
    }

    const originalSizes = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-5 py-2.5 text-sm gap-2",
      lg: "px-7 py-3 text-base gap-2.5",
      // Shadcn Fallbacks
      default: "px-5 py-2.5 text-sm gap-2",
      xs: "px-2 py-1 text-xs gap-1",
      icon: "p-2.5",
      "icon-xs": "p-1",
      "icon-sm": "p-2",
      "icon-lg": "p-3",
    }

    const activeVariant = originalVariants[variant as keyof typeof originalVariants] || originalVariants.primary
    const activeSize = originalSizes[size as keyof typeof originalSizes] || originalSizes.md

    return (
      <button
        ref={ref}
        className={cn(baseStyles, activeVariant, activeSize, className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin-slow h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon ? (
          <span className="flex-shrink-0 mr-1.5">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export default Button
export { Button, buttonVariants }
