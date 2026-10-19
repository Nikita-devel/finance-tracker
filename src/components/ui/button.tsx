import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)]",
    "text-sm font-medium",
    "transition-[background-color,box-shadow,transform,opacity] duration-[var(--dur-fast)]",
    "active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-[var(--shadow-1)] hover:brightness-110 hover:shadow-[var(--shadow-2)]",
        outline:
          "border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-fg)] shadow-[var(--shadow-1)] hover:bg-[var(--color-sunken)]",
        ghost:
          "text-[var(--color-fg-soft)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-fg)]",
        danger: "bg-[var(--color-crit)] text-white shadow-[var(--shadow-1)] hover:brightness-110",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
