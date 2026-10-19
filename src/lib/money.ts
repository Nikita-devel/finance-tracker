/**
 * Tous les montants circulent en CENTIMES (entiers) dans l'application.
 * La conversion vers/depuis l'euro décimal n'a lieu qu'aux frontières (UI, saisie).
 */

export function toCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return Number.NaN;
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

const formatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** Format compact sans symbole, pour les axes de graphiques. */
export function formatCentsShort(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

/**
 * Répartit un montant en centimes selon des poids entiers, sans perte.
 * Méthode du plus grand reste : la somme des parts est exactement `total`.
 */
export function allocate(total: number, weights: number[]): number[] {
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights <= 0) throw new Error("La somme des poids doit être > 0");

  const raw = weights.map((w) => (total * w) / sumWeights);
  const floors = raw.map((v) => Math.floor(v));
  let remainder = total - floors.reduce((a, b) => a + b, 0);

  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  let k = 0;
  while (remainder > 0) {
    result[order[k % order.length].i] += 1;
    remainder -= 1;
    k += 1;
  }
  return result;
}
