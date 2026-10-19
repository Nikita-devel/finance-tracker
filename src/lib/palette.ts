/**
 * Palette catégorielle validée (contrastes + daltonisme).
 * Ordre FIXE : on assigne les créneaux dans l'ordre, on ne les recycle jamais.
 * Au-delà de 6 séries, on replie le reste dans « Autres ».
 */
export const CATEGORICAL = [
  { name: "blue", light: "#2a78d6", dark: "#3987e5" },
  { name: "orange", light: "#eb6834", dark: "#d95926" },
  { name: "aqua", light: "#1baf7a", dark: "#199e70" },
  { name: "yellow", light: "#eda100", dark: "#c98500" },
  { name: "magenta", light: "#e87ba4", dark: "#d55181" },
  { name: "green", light: "#008300", dark: "#008300" },
  { name: "violet", light: "#4a3aa7", dark: "#9085e9" },
  { name: "red", light: "#e34948", dark: "#e66767" },
] as const;

export const NEUTRAL = { light: "#94a3b8", dark: "#7c8698" };

/** Nombre maximal de tranches colorées avant repli sur « Autres ». */
export const MAX_SLICES = 6;

export function slotColor(index: number, dark: boolean): string {
  const slot = CATEGORICAL[index % CATEGORICAL.length];
  return dark ? slot.dark : slot.light;
}

/** Couleur de secours si une catégorie porte une couleur personnalisée. */
export function pickColor(
  index: number,
  dark: boolean,
  custom?: string | null,
): string {
  if (custom && /^#[0-9a-fA-F]{6}$/.test(custom)) return custom;
  return slotColor(index, dark);
}
