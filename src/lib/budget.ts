/**
 * Plafonds par catégorie et règle 50/30/20.
 * Module pur : ni Prisma, ni React, ni Date « maintenant » implicite —
 * l'appelant fournit toujours la progression du mois, ce qui rend tout testable.
 */

export const BUCKETS = ["BESOINS", "ENVIES"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_LABELS: Record<Bucket, string> = {
  BESOINS: "Besoins (50 %)",
  ENVIES: "Envies (30 %)",
};

export type BudgetStatus = "ok" | "warning" | "critical";

export interface CategorySpend {
  id: string;
  name: string;
  /** Plafond mensuel en centimes, ou null si non suivi. */
  budget: number | null;
  /** Dépensé sur le mois, en centimes. */
  spent: number;
}

export interface BudgetLine {
  id: string;
  name: string;
  budget: number;
  spent: number;
  /** Part du plafond consommée (1 = pile au plafond ; peut dépasser 1). */
  ratio: number;
  /** Dépense « attendue » à ce stade du mois, au rythme linéaire. */
  pace: number;
  /** Reste disponible (0 si dépassé). */
  remaining: number;
  /** Dépassement (0 si dans les clous). */
  overBy: number;
  status: BudgetStatus;
}

/**
 * Fraction du mois écoulée, dans [0, 1].
 * Mois passé → 1 ; mois futur → 0 ; mois en cours → jour courant / nombre de jours.
 */
export function monthProgress(month: string, now: Date): number {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const nowMonth = now.getFullYear() * 12 + now.getMonth();
  const target = y * 12 + (m - 1);

  if (target < nowMonth) return 1;
  if (target > nowMonth) return 0;
  return now.getDate() / daysInMonth;
}

/**
 * Statut d'une catégorie :
 * - `critical` : le plafond est dépassé ;
 * - `warning`  : on est dans les clous mais **en avance sur le rythme** — c'est
 *   l'alerte utile, celle qui arrive avant qu'il soit trop tard ;
 * - `ok`       : au rythme ou en dessous.
 */
export function computeBudgetLines(
  categories: CategorySpend[],
  progress: number,
): BudgetLine[] {
  const p = Math.min(1, Math.max(0, progress));

  return categories
    .filter((c): c is CategorySpend & { budget: number } =>
      c.budget !== null && c.budget > 0,
    )
    .map((c) => {
      const pace = Math.round(c.budget * p);
      const status: BudgetStatus =
        c.spent > c.budget ? "critical" : c.spent > pace ? "warning" : "ok";
      return {
        id: c.id,
        name: c.name,
        budget: c.budget,
        spent: c.spent,
        ratio: c.spent / c.budget,
        pace,
        remaining: Math.max(0, c.budget - c.spent),
        overBy: Math.max(0, c.spent - c.budget),
        status,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

// ---------------------------------------------------------------------------
// Règle 50/30/20
// ---------------------------------------------------------------------------

export const RULE_TARGETS = { besoins: 0.5, envies: 0.3, epargne: 0.2 } as const;

export interface RuleInput {
  /** Revenu NET mensuel du foyer, en centimes. */
  income: number;
  /** Dépenses du mois dans les catégories BESOINS. */
  besoins: number;
  /** Dépenses du mois dans les catégories ENVIES. */
  envies: number;
}

export interface RuleBucketResult {
  key: "besoins" | "envies" | "epargne";
  label: string;
  amount: number;
  share: number; // part du revenu, 0..1 (peut dépasser 1)
  target: number; // 0.5 / 0.3 / 0.2
  targetAmount: number;
  /** Écart en centimes par rapport à la cible (négatif = mieux que la cible). */
  delta: number;
  respected: boolean;
}

export interface RuleResult {
  income: number;
  /** Épargne = revenu − dépenses. C'est un RESTE, jamais une catégorie de dépense. */
  epargne: number;
  buckets: RuleBucketResult[];
  respected: boolean;
}

export function computeRule503020(input: RuleInput): RuleResult | null {
  if (input.income <= 0) return null;

  const { income, besoins, envies } = input;
  const epargne = income - besoins - envies;

  const make = (
    key: RuleBucketResult["key"],
    label: string,
    amount: number,
    target: number,
    /** true si « moins vaut mieux » (dépenses), false si « plus vaut mieux » (épargne) */
    lowerIsBetter: boolean,
  ): RuleBucketResult => {
    const targetAmount = Math.round(income * target);
    return {
      key,
      label,
      amount,
      share: amount / income,
      target,
      targetAmount,
      delta: amount - targetAmount,
      respected: lowerIsBetter ? amount <= targetAmount : amount >= targetAmount,
    };
  };

  const buckets = [
    make("besoins", "Besoins", besoins, RULE_TARGETS.besoins, true),
    make("envies", "Envies", envies, RULE_TARGETS.envies, true),
    make("epargne", "Épargne", epargne, RULE_TARGETS.epargne, false),
  ];

  return {
    income,
    epargne,
    buckets,
    respected: buckets.every((b) => b.respected),
  };
}

// ---------------------------------------------------------------------------
// Revenu variable
// ---------------------------------------------------------------------------

export const INCOME_SOURCES = [
  "Cours particuliers",
  "Freelance",
  "Prime",
  "Remboursement",
  "Cadeau",
  "Autre",
] as const;

/**
 * Revenu réel d'un mois : part stable des deux utilisateurs + encaissements
 * variables du mois. La base n'est jamais saisie comme entrée : pas de doublon.
 */
export function totalIncome(
  baseIncomes: number[],
  entries: { amount: number }[],
): number {
  return (
    baseIncomes.reduce((s, v) => s + v, 0) +
    entries.reduce((s, e) => s + e.amount, 0)
  );
}

/**
 * Taux d'épargne = (revenu − dépenses) / revenu.
 * `null` si aucun revenu connu : afficher 0 % serait un mensonge, pas une donnée.
 */
export function savingsRate(income: number, expenses: number): number | null {
  if (income <= 0) return null;
  return (income - expenses) / income;
}
