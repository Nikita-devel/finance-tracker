"use client";

interface Props {
  /** Montant total en euros (décimal). */
  totalEuros: number;
  /** Part de la personne A en euros (décimal). */
  valueAEuros: number;
  nameA: string;
  nameB: string;
  onChange: (valueAEuros: number) => void;
}

const toEuroText = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

/** Répartition libre au pourcentage : le curseur pilote la part de A. */
export function SplitSlider({ totalEuros, valueAEuros, nameA, nameB, onChange }: Props) {
  const enabled = totalEuros > 0;
  const pct = enabled
    ? Math.min(100, Math.max(0, Math.round((valueAEuros / totalEuros) * 100)))
    : 50;
  const remainderB = Math.round((totalEuros - valueAEuros) * 100) / 100;

  return (
    <div className="mt-3 space-y-2">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        disabled={!enabled}
        aria-label={`Part de ${nameA} en pourcentage`}
        onChange={(e) => {
          const p = Number(e.target.value);
          // Centimes arrondis : total (€) × % / 100, sans dérive flottante visible.
          onChange(Math.round(totalEuros * p) / 100);
        }}
        className="w-full accent-[var(--color-accent)]"
      />
      <div className="flex justify-between gap-2 text-xs">
        <span className="tnum font-medium text-[var(--color-fg)]">
          {nameA} · {pct} % · {toEuroText(valueAEuros)}
        </span>
        <span className="tnum font-medium text-[var(--color-fg)]">
          {nameB} · {100 - pct} % · {toEuroText(remainderB)}
        </span>
      </div>
    </div>
  );
}
