import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BudgetAlert, BudgetBars } from "@/components/budget-bars";
import { Rule503020 } from "@/components/rule-503020";
import { MonthPicker } from "@/components/month-picker";
import { getBudgetOverview, getRule503020 } from "@/lib/queries";
import { getActiveSlot, getUsers } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { currentMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();

  const [users, slot] = await Promise.all([getUsers(), getActiveSlot()]);
  const active = slot === "B" ? users.userB : users.userA;

  if (!active) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Base non initialisée</CardTitle>
          <CardDescription>
            Les plafonds sont personnels : il faut d&apos;abord deux profils.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [overview, rule] = await Promise.all([
    getBudgetOverview(month, active.id),
    getRule503020(month),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="t-page">Plafonds</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Profil{" "}
            <span
              className="font-medium"
              style={{ color: active.color }}
            >
              {active.name}
            </span>{" "}
            — changez de profil dans l&apos;en-tête.
          </p>
        </div>
        <MonthPicker month={month} />
      </div>

      <BudgetAlert overspent={overview.overspent} atRisk={overview.atRisk} />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Plafonds de {active.name}</CardTitle>
            <CardDescription>
              {overview.lines.length > 0 ? (
                <>
                  {formatCents(overview.totalSpent)} à sa charge sur{" "}
                  {formatCents(overview.totalBudget)} plafonnés ·{" "}
                  {Math.round(overview.progress * 100)} % du mois écoulé
                </>
              ) : (
                <>Aucun plafond défini pour ce profil</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetBars lines={overview.lines} month={month} />
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              Le montant compté est la <strong>part</strong> de {active.name}, pas ce
              qu&apos;il ou elle a avancé : une dépense partagée à 50/50 pèse pour
              moitié sur chacun, quelle que soit la carte utilisée.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Règle 50/30/20</CardTitle>
            <CardDescription>
              50 % besoins · 30 % envies · 20 % épargne, sur le revenu net du foyer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Rule503020 rule={rule} />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Les plafonds de chacun, la catégorie de règle (besoins / envies) et les
        revenus se modifient dans{" "}
        <Link href="/parametres" className="text-[var(--color-accent)] hover:underline">
          Paramètres
        </Link>
        .
      </p>
    </div>
  );
}
