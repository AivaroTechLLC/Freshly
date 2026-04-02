import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-green-600 text-white",
        secondary: "border-transparent bg-gray-100 text-gray-800",
        destructive: "border-transparent bg-red-100 text-red-700",
        outline: "border-gray-300 text-gray-700",
        warning: "border-transparent bg-amber-100 text-amber-700",
        sale: "border-transparent bg-red-500 text-white",
        bulk: "border-transparent bg-blue-100 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
