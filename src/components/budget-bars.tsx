import Link from "next/link";
import { AlertTriangle, CircleAlert, Check, ChevronRight } from "lucide-react";
import type { BudgetLine, BudgetStatus } from "@/lib/budget";
import { formatCents } from "@/lib/money";

/**
 * Bullet-bars : une ligne par catégorie.
 * Piste = plafond · remplissage = dépensé · repère vertical = rythme attendu à ce
 * stade du mois. Toutes les lignes partagent la même ligne de base, donc les
 * dépassements se comparent d'un coup d'œil.
 *
 * Chaque barre est un lien vers les dépenses de la catégorie : voir « dépassé de
 * 42 € » sans pouvoir ouvrir la liste ne dit pas d'où vient le dépassement.
 *
 * Le statut n'est JAMAIS porté par la couleur seule : icône + libellé chiffré
 * accompagnent systématiquement la teinte.
 */

const STATUS: Record<
  BudgetStatus,
  { fill: string; icon: typeof Check; label: (l: BudgetLine) => string }
> = {
  ok: {
    fill: "var(--color-good)",
    icon: Check,
    label: (l) => `Reste ${formatCents(l.remaining)}`,
  },
  warning: {
    fill: "var(--color-warn)",
    icon: AlertTriangle,
    label: (l) => `En avance sur le rythme · reste ${formatCents(l.remaining)}`,
  },
  critical: {
    fill: "var(--color-crit)",
    icon: CircleAlert,
    label: (l) => `Dépassé de ${formatCents(l.overBy)}`,
  },
};

function Bar({ line, month }: { line: BudgetLine; month: string }) {
  const status = STATUS[line.status];
  const Icon = status.icon;
  const fillPct = Math.min(100, line.ratio * 100);
  const overflowPct =
    line.ratio > 1 ? Math.min(100, ((line.ratio - 1) / line.ratio) * 100) : 0;
  const pacePct = Math.min(100, (line.pace / line.budget) * 100);

  return (
    <li>
      <Link
        href={`/depenses?month=${month}&categoryId=${line.id}`}
        className="group -mx-2 block space-y-1.5 rounded-[var(--radius-sm)] px-2 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-sunken)]"
      >
        <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
          <span className="font-medium text-[var(--color-fg)]">{line.name}</span>
          <span className="tnum text-[var(--color-muted)]">
            {formatCents(line.spent)} / {formatCents(line.budget)}
          </span>
          <span className="tnum ml-auto flex items-center gap-0.5 font-medium text-[var(--color-fg)]">
            {Math.round(line.ratio * 100)} %
            <ChevronRight
              className="h-3.5 w-3.5 text-[var(--color-muted)] opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100"
              aria-hidden
            />
          </span>
        </div>

        <div
          className="relative h-2.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-border)]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={line.budget}
          aria-valuenow={line.spent}
          aria-label={`${line.name} : ${formatCents(line.spent)} sur ${formatCents(line.budget)}`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-[var(--radius-pill)] transition-[width] duration-[var(--dur-slow)]"
            style={{ width: `${fillPct}%`, background: status.fill }}
          />
          {/* Zone hachurée = part au-delà du plafond */}
          {overflowPct > 0 && (
            <div
              className="absolute inset-y-0 right-0"
              style={{
                width: `${overflowPct}%`,
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgb(255 255 255 / .55) 0 2px, transparent 2px 5px)",
              }}
            />
          )}
          {/* Repère du rythme attendu */}
          {pacePct > 0 && pacePct < 100 && (
            <span
              className="absolute inset-y-0 w-0.5 bg-[var(--color-fg)]/70"
              style={{ left: `calc(${pacePct}% - 1px)` }}
              title={`Rythme attendu à ce stade du mois : ${formatCents(line.pace)}`}
            />
          )}
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
          <Icon className="h-3 w-3 shrink-0" style={{ color: status.fill }} aria-hidden />
          {status.label(line)}
        </p>
      </Link>
    </li>
  );
}

export function BudgetBars({
  lines,
  month,
}: {
  lines: BudgetLine[];
  month: string;
}) {
  if (lines.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-[var(--color-muted)]">Aucun plafond défini.</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Ajoutez-en un depuis{" "}
          <Link href="/parametres" className="text-[var(--color-accent)] hover:underline">
            Paramètres → Catégories
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-1">
        {lines.map((line) => (
          <Bar key={line.id} line={line} month={month} />
        ))}
      </ul>
      <p className="mt-4 border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-muted)]">
        Le trait vertical marque la dépense attendue à ce stade du mois, au rythme
        linéaire. Le franchir avant le plafond, c&apos;est l&apos;alerte utile.
      </p>
    </>
  );
}

export function BudgetAlert({
  overspent,
  atRisk,
  month,
}: {
  overspent: BudgetLine[];
  atRisk: BudgetLine[];
  month?: string;
}) {
  if (overspent.length === 0 && atRisk.length === 0) return null;

  const critical = overspent.length > 0;
  const color = critical ? "var(--color-crit)" : "var(--color-warn)";
  const Icon = critical ? CircleAlert : AlertTriangle;

  return (
    <div
      role="status"
      className="anim-in flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-card)] border px-4 py-3 text-sm"
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
      }}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color }} aria-hidden />
      {critical && (
        <span className="font-medium">
          {overspent.length} catégorie{overspent.length > 1 ? "s" : ""} dépassée
          {overspent.length > 1 ? "s" : ""} :{" "}
          {overspent.map((l) => `${l.name} (+${formatCents(l.overBy)})`).join(", ")}
        </span>
      )}
      {atRisk.length > 0 && (
        <span className={critical ? "text-[var(--color-muted)]" : "font-medium"}>
          {critical ? "· " : ""}
          {atRisk.length} en avance sur le rythme : {atRisk.map((l) => l.name).join(", ")}
        </span>
      )}
      {month && (
        <Link
          href={`/budgets?month=${month}`}
          className="ml-auto shrink-0 text-xs font-medium text-[var(--color-accent)] hover:underline"
        >
          Voir les plafonds →
        </Link>
      )}
    </div>
  );
}
