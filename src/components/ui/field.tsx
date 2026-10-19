import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Les champs sont « creusés » (surface sunken) : ils se lisent comme des zones
 * où l'on écrit, pas comme des blocs posés sur la page.
 */
const base = [
  "h-9 w-full rounded-[var(--radius-sm)]",
  "border border-[var(--color-border)] bg-[var(--color-sunken)]",
  "px-3 text-sm text-[var(--color-fg)]",
  "outline-none transition-[border-color,box-shadow,background-color] duration-[var(--dur-fast)]",
  "placeholder:text-[var(--color-muted)]",
  "hover:border-[var(--color-border-strong)]",
  "focus:border-[var(--color-accent)] focus:bg-[var(--color-surface)]",
  "focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-accent)_16%,transparent)]",
  "disabled:opacity-50",
].join(" ");

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, className)} {...props} />
));
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(base, "cursor-pointer pr-8", className)} {...props} />
));
Select.displayName = "Select";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  color,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2 py-0.5 text-[11px] font-medium",
        color ? "" : "border-[var(--color-border)] text-[var(--color-muted)]",
        className,
      )}
      style={
        color
          ? {
              borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
              background: `color-mix(in srgb, ${color} 10%, transparent)`,
              color,
            }
          : undefined
      }
      {...props}
    />
  );
}

/** Champ couleur — même hauteur et même rayon que les autres contrôles. */
export function ColorInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="color"
      className={cn(
        "h-9 w-14 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-sunken)] p-1",
        className,
      )}
      {...props}
    />
  );
}
