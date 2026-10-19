"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCents } from "@/lib/money";
import { MAX_SLICES, NEUTRAL, slotColor } from "@/lib/palette";
import { useChartEnv } from "@/lib/use-motion";
import { cn } from "@/lib/utils";

export interface CategorySlice {
  id: string;
  name: string;
  total: number;
}

/**
 * Donut cliquable : une part mène à la liste des dépenses de cette catégorie,
 * pour le mois affiché. Un graphique qui montre « Courses : 70 % » sans permettre
 * d'aller voir CE QUI compose ces 70 % s'arrête au milieu du gué.
 *
 * La part « Autres » n'est pas cliquable : elle agrège plusieurs catégories, il
 * n'y a pas de destination unique.
 */
export function CategoryDonut({
  data,
  month,
}: {
  data: CategorySlice[];
  month: string;
}) {
  const { dark, animate } = useChartEnv();
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const slices = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.total - a.total);
    const head = sorted.slice(0, MAX_SLICES);
    const tail = sorted.slice(MAX_SLICES);
    const result = head.map((s, i) => ({ ...s, color: slotColor(i, dark) }));
    if (tail.length > 0) {
      result.push({
        id: "__other__",
        name: `Autres (${tail.length})`,
        total: tail.reduce((sum, s) => sum + s.total, 0),
        color: dark ? NEUTRAL.dark : NEUTRAL.light,
      });
    }
    return result;
  }, [data, dark]);

  const total = slices.reduce((sum, s) => sum + s.total, 0);

  const open = (id: string) => {
    if (id === "__other__") return;
    router.push(`/depenses?month=${month}&categoryId=${id}`);
  };

  if (total === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-muted)]">
        Aucune dépense sur cette période.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-52 w-full sm:w-52 sm:shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="total"
              nameKey="name"
              innerRadius="62%"
              outerRadius="94%"
              paddingAngle={2}
              stroke="var(--color-raised)"
              strokeWidth={2}
              isAnimationActive={animate}
              animationDuration={650}
              onClick={(_, index) => open(slices[index].id)}
              onMouseEnter={(_, index) => setHovered(slices[index].id)}
              onMouseLeave={() => setHovered(null)}
            >
              {slices.map((s) => (
                <Cell
                  key={s.id}
                  fill={s.color}
                  cursor={s.id === "__other__" ? "default" : "pointer"}
                  opacity={hovered && hovered !== s.id ? 0.45 : 1}
                />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              contentStyle={{
                background: "var(--color-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                fontSize: 12,
                color: "var(--color-fg)",
                boxShadow: "var(--shadow-2)",
              }}
              formatter={(value, name) => {
                const v = Number(value);
                return [
                  `${formatCents(v)} · ${Math.round((v / total) * 100)} %`,
                  String(name),
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-[var(--color-muted)]">Total</span>
          <span className="text-base font-semibold">{formatCents(total)}</span>
        </div>
      </div>

      {/* Légende chiffrée et cliquable : l'identité ne repose jamais sur la couleur seule. */}
      <ul className="min-w-0 flex-1 space-y-0.5">
        {slices.map((s) => {
          const clickable = s.id !== "__other__";
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => open(s.id)}
                onMouseEnter={() => setHovered(s.id)}
                onMouseLeave={() => setHovered(null)}
                title={clickable ? `Voir les dépenses « ${s.name} »` : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-left text-xs",
                  "transition-colors duration-[var(--dur-fast)]",
                  clickable
                    ? "cursor-pointer hover:bg-[var(--color-sunken)]"
                    : "cursor-default",
                  hovered === s.id && clickable && "bg-[var(--color-sunken)]",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: s.color }}
                  aria-hidden
                />
                <span className="truncate text-[var(--color-fg)]">{s.name}</span>
                <span className="tnum ml-auto shrink-0 text-[var(--color-muted)]">
                  {formatCents(s.total)}
                </span>
                <span className="tnum w-10 shrink-0 text-right text-[var(--color-muted)]">
                  {Math.round((s.total / total) * 100)} %
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
