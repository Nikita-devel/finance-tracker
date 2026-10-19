import { Check, CircleAlert } from "lucide-react";
import type { RuleResult } from "@/lib/budget";
import { formatCents } from "@/lib/money";

/**
 * Règle 50/30/20 : deux barres empilées horizontales — la cible, puis le réel.
 * Deux barres alignées se comparent segment par segment ; deux camemberts, non.
 *
 * L'épargne est le RESTE (revenu − dépenses), jamais une catégorie de dépense :
 * un virement vers le Livret compté comme dépense serait un double comptage.
 */

const SLOTS = {
  besoins: "#2a78d6", // catégoriel 1
  envies: "#eb6834", // catégoriel 2
  epargne: "#1baf7a", // catégoriel 3
} as const;

function StackedBar({
  segments,
  label,
}: {
  label: string;
  segments: { key: string; share: number; color: string }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-[var(--color-muted)]">{label}</p>
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md">
        {segments.map((s) => (
          <div
            key={s.key}
            className="flex items-center justify-center overflow-hidden text-[10px] font-medium text-white"
            style={{
              width: `${Math.max(0, s.share) * 100}%`,
              background: s.color,
            }}
          >
            {s.share >= 0.12 ? `${Math.round(s.share * 100)} %` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Rule503020({ rule }: { rule: RuleResult | null }) {
  if (!rule) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-muted)]">
        Renseignez vos revenus nets mensuels dans <strong>Paramètres</strong> pour
        activer la règle 50/30/20.
      </p>
    );
  }

  const by = (k: string) => rule.buckets.find((b) => b.key === k)!;
  const total = rule.buckets.reduce((s, b) => s + Math.max(0, b.amount), 0) || 1;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <StackedBar
          label="Cible"
          segments={[
            { key: "b", share: 0.5, color: SLOTS.besoins },
            { key: "e", share: 0.3, color: SLOTS.envies },
            { key: "s", share: 0.2, color: SLOTS.epargne },
          ]}
        />
        <StackedBar
          label={`Réel — revenu net ${formatCents(rule.income)}`}
          segments={rule.buckets.map((b) => ({
            key: b.key,
            share: Math.max(0, b.amount) / total,
            color: SLOTS[b.key],
          }))}
        />
      </div>

      <ul className="space-y-1.5">
        {rule.buckets.map((b) => (
          <li key={b.key} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: SLOTS[b.key] }}
              aria-hidden
            />
            <span className="text-[var(--color-fg)]">{b.label}</span>
            <span className="tabular-nums text-[var(--color-muted)]">
              {Math.round(b.share * 100)} % · cible {Math.round(b.target * 100)} %
            </span>
            <span className="ml-auto flex items-center gap-1.5 tabular-nums">
              <span className="text-[var(--color-muted)]">{formatCents(b.amount)}</span>
              {b.respected ? (
                <Check className="h-3.5 w-3.5" style={{ color: "#0ca30c" }} aria-hidden />
              ) : (
                <CircleAlert className="h-3.5 w-3.5" style={{ color: "#d03b3b" }} aria-hidden />
              )}
              <span className="sr-only">
                {b.respected ? "respecté" : "non respecté"}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-muted)]">
        {rule.respected ? (
          <>Règle respectée ce mois-ci.</>
        ) : (
          <>
            Règle non respectée :{" "}
            {rule.buckets
              .filter((b) => !b.respected)
              .map((b) =>
                b.key === "epargne"
                  ? `épargne inférieure de ${formatCents(-by("epargne").delta)} à la cible`
                  : `${b.label.toLowerCase()} dépassent de ${formatCents(b.delta)}`,
              )
              .join(" · ")}
            .
          </>
        )}{" "}
        L&apos;épargne est calculée comme le reste : revenu − dépenses.
      </p>
    </div>
  );
}
