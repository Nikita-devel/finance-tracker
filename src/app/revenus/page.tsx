import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IncomeEntryForm, IncomeList, type IncomeRow } from "@/components/income-forms";
import { MonthPicker } from "@/components/month-picker";
import { getIncomes, getMonthlyStats } from "@/lib/queries";
import { getActiveSlot, getUsers } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { savingsRate, totalIncome } from "@/lib/budget";
import { currentMonth, toDateInputValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();

  const [incomes, users, stats, activeSlot] = await Promise.all([
    getIncomes(month),
    getUsers(),
    getMonthlyStats(month),
    getActiveSlot(),
  ]);

  const active = activeSlot === "B" ? users.userB : users.userA;
  const base = users.all.reduce((s, u) => s + u.baseIncome, 0);
  const variable = incomes.reduce((s, i) => s + i.amount, 0);
  // Part du profil actif : le foyer reste la référence, mais « combien j'ai
  // rapporté ce mois-ci » est la question qu'on se pose en ouvrant la page.
  const myBase = active?.baseIncome ?? 0;
  const myVariable = incomes
    .filter((i) => i.userId === active?.id)
    .reduce((s, i) => s + i.amount, 0);
  const total = totalIncome(users.all.map((u) => u.baseIncome), incomes);
  const rate = savingsRate(total, stats.total);

  const rows: IncomeRow[] = incomes.map((i) => ({
    id: i.id,
    amount: i.amount,
    date: toDateInputValue(i.date),
    source: i.source,
    note: i.note,
    userName: i.user.name,
    userColor: i.user.color,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-page">Revenus</h1>
        <MonthPicker month={month} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--color-muted)]">Base récurrente</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCents(base)}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {active ? `Dont ${formatCents(myBase)} pour ${active.name}` : "Bourse, APL, aide"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--color-muted)]">Revenus variables</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCents(variable)}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {incomes.length} encaissement{incomes.length > 1 ? "s" : ""}
              {active ? ` · ${formatCents(myVariable)} pour ${active.name}` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--color-muted)]">Revenu du mois</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCents(total)}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Dépenses : {formatCents(stats.total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--color-muted)]">Taux d&apos;épargne</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {rate === null ? "—" : `${Math.round(rate * 100)} %`}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {rate === null
                ? "Renseignez un revenu"
                : `Reste ${formatCents(total - stats.total)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Nouveau revenu variable</CardTitle>
            <CardDescription>
              Cours, freelance, prime… La base récurrente ne se saisit pas ici : elle
              est déjà comptée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeEntryForm
              userAName={users.userA?.name ?? "Utilisateur A"}
              userBName={users.userB?.name ?? "Utilisateur B"}
              activeSlot={activeSlot}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Encaissements du mois</CardTitle>
            <CardDescription>
              La base récurrente se règle dans{" "}
              <Link href="/parametres" className="text-[var(--color-accent)] hover:underline">
                Paramètres
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeList rows={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
