"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents, formatCentsShort } from "@/lib/money";
import { slotColor } from "@/lib/palette";
import { useChartEnv } from "@/lib/use-motion";
import { cn } from "@/lib/utils";

export interface FlowPoint {
  month: string;
  label: string;
  income: number | null;
  expenses: number | null;
  rate: number | null;
}

const RANGES = [6, 12] as const;

/**
 * Revenus et dépenses : deux séries, même unité, **un seul axe**.
 * Le taux d'épargne est un pourcentage : il ne partage pas cet axe (jamais de
 * double échelle) — il est rendu en dessous, avec sa propre lecture.
 *
 * Cliquer un mois recharge le tableau de bord sur ce mois : la courbe sert
 * alors de navigation, pas seulement d'illustration.
 */
export function CashFlowChart({
  data,
  month,
  range,
}: {
  data: FlowPoint[];
  month: string;
  range: number;
}) {
  const { dark, animate } = useChartEnv();
  const router = useRouter();
  const pathname = usePathname();

  const incomeColor = slotColor(0, dark);
  const expenseColor = slotColor(1, dark);
  const last = [...data].reverse().find((p) => p.income !== null) ?? null;

  const goToMonth = (m: string) =>
    router.push(`${pathname}?month=${m}&range=${range}`);
  const setRange = (r: number) =>
    router.push(`${pathname}?month=${month}&range=${r}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: incomeColor }}
            aria-hidden
          />
          Revenus
          {last?.income != null && (
            <span className="tnum text-[var(--color-muted)]">
              {formatCents(last.income)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: expenseColor }}
            aria-hidden
          />
          Dépenses
          {last?.expenses != null && (
            <span className="tnum text-[var(--color-muted)]">
              {formatCents(last.expenses)}
            </span>
          )}
        </span>

        <div className="ml-auto flex items-center gap-0.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-sunken)] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={r === range}
              className={cn(
                "rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] transition-colors duration-[var(--dur-fast)]",
                r === range
                  ? "bg-[var(--color-raised)] font-medium text-[var(--color-fg)] shadow-[var(--shadow-1)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-fg)]",
              )}
            >
              {r} mois
            </button>
          ))}
        </div>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
            style={{ cursor: "pointer" }}
            onClick={(state) => {
              const index = state?.activeTooltipIndex;
              const point = typeof index === "number" ? data[index] : undefined;
              if (point) goToMonth(point.month);
            }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 11, fill: "var(--color-muted)" }}
              tickFormatter={(v: number) => formatCentsShort(v)}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-muted)", strokeDasharray: "3 3" }}
              contentStyle={{
                background: "var(--color-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                fontSize: 12,
                color: "var(--color-fg)",
                boxShadow: "var(--shadow-2)",
              }}
              formatter={(value, name) => [
                formatCents(Number(value)),
                name === "income" ? "Revenus" : "Dépenses",
              ]}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke={incomeColor}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: incomeColor }}
              activeDot={{ r: 5, stroke: "var(--color-raised)", strokeWidth: 2 }}
              isAnimationActive={animate}
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke={expenseColor}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: expenseColor }}
              activeDot={{ r: 5, stroke: "var(--color-raised)", strokeWidth: 2 }}
              isAnimationActive={animate}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Taux d'épargne : échelle propre, jamais superposée à l'axe en euros. */}
      <div>
        <p className="mb-2 text-[11px] text-[var(--color-muted)]">
          Taux d&apos;épargne par mois
        </p>
        <ul
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
        >
          {data.map((p) => {
            const value = p.rate;
            const height = value === null ? 0 : Math.min(100, Math.max(0, value * 100));
            const negative = value !== null && value < 0;
            const current = p.month === month;
            return (
              <li key={p.month}>
                <button
                  type="button"
                  onClick={() => goToMonth(p.month)}
                  title={
                    value === null
                      ? "Aucune donnée ce mois-là"
                      : `${p.label} : ${Math.round(value * 100)} % — ouvrir ce mois`
                  }
                  className={cn(
                    "flex w-full flex-col items-center gap-1 rounded-[var(--radius-sm)] px-0.5 py-1",
                    "transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-sunken)]",
                    current && "bg-[var(--color-sunken)]",
                  )}
                >
                  <div className="flex h-12 w-full items-end justify-center">
                    <div
                      className="w-full max-w-8 rounded-t-sm transition-[height] duration-[var(--dur-slow)]"
                      style={{
                        height: `${negative ? 100 : height}%`,
                        background: negative
                          ? "var(--color-crit)"
                          : "var(--color-good)",
                        opacity: value === null ? 0.15 : 1,
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "tnum text-[10px]",
                      current
                        ? "font-medium text-[var(--color-fg)]"
                        : "text-[var(--color-muted)]",
                    )}
                  >
                    {value === null ? "—" : `${Math.round(value * 100)} %`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
