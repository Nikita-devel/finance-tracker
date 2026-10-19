import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Trois niveaux, pas un seul.
 * `flat` porte le contenu secondaire, `raised` le contenu principal, `sunken`
 * les zones de saisie. Poser la même ombre partout aplatit la hiérarchie —
 * autant n'en mettre aucune.
 */
const cardVariants = cva(
  "rounded-[var(--radius-card)] border transition-shadow duration-[var(--dur-mid)]",
  {
    variants: {
      variant: {
        flat: "border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-1)]",
        raised:
          "border-[var(--color-border)] bg-[var(--color-raised)] shadow-[var(--shadow-2),var(--ring-inset)]",
        sunken: "border-[var(--color-border)] bg-[var(--color-sunken)] shadow-none",
        accent:
          "border-[color-mix(in_srgb,var(--color-accent)_28%,transparent)] bg-[var(--color-raised)] shadow-[var(--shadow-2),var(--ring-inset)]",
      },
      hover: {
        none: "",
        lift: "hover:shadow-[var(--shadow-3)] hover:-translate-y-px transition-[box-shadow,transform]",
      },
    },
    defaultVariants: { variant: "flat", hover: "none" },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, hover, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, hover }), className)} {...props} />;
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-5 pb-3", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[0.9375rem] font-semibold tracking-[-0.011em] text-[var(--color-fg)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-0.5 text-xs leading-relaxed text-[var(--color-muted)]", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

/**
 * Tuile de chiffre : le libellé au-dessus, la valeur en grand, le contexte en
 * dessous. Toujours dans cet ordre — l'œil descend, il ne cherche pas.
 */
export function StatTile({
  label,
  value,
  hint,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card
      variant={accent ? "accent" : "flat"}
      hover="lift"
      className={cn("px-5 py-4", className)}
    >
      <p className="t-label">{label}</p>
      <p
        className={cn(
          "t-figure tnum mt-1.5",
          accent ? "text-[var(--color-accent)]" : "text-[var(--color-fg)]",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs leading-snug text-[var(--color-muted)]">{hint}</p>
      )}
    </Card>
  );
}
