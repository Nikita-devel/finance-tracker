import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatTile,
} from "@/components/ui/card";
import { BalanceCard } from "@/components/balance-card";
import { CategoryDonut } from "@/components/category-donut";
import { CashFlowChart } from "@/components/cashflow-chart";
import { MonthPicker } from "@/components/month-picker";
import { BudgetAlert } from "@/components/budget-bars";
import { CountUp } from "@/components/animated-number";
import { formatCents } from "@/lib/money";
import {
  getGlobalBalance,
  getMonthlyStats,
  getCashFlow,
  getExpenses,
  getBudgetOverview,
  getPersonalStats,
  getPersonalCashFlow,
} from "@/lib/queries";
import { getUsers } from "@/lib/session";
import { currentMonth, formatDate } from "@/lib/utils";
import { splitLabel } from "@/lib/split";
import type { SplitType } from "@/lib/split";

export const dynamic = "force-dynamic";

type View = "all" | "A" | "B";

function ViewTabs({
  month,
  view,
  names,
}: {
  month: string;
  view: View;
  names: { A: string; B: string };
}) {
  const items: { key: View; label: string }[] = [
    { key: "A", label: names.A },
    { key: "B", label: names.B },
    { key: "all", label: "Commun" },
  ];
  return (
    <nav
      aria-label="Vue du tableau de bord"
      className="inline-flex flex-wrap gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-1"
    >
      {items.map((it) => {
        const active = view === it.key;
        return (
          <Link
            key={it.key}
            href={`/?month=${month}&vue=${it.key}`}
            aria-current={active ? "page" : undefined}
            className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-[var(--color-sunken)] font-medium text-[var(--color-fg)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

type BalanceData = Awaited<ReturnType<typeof getGlobalBalance>>;

/**
 * Tableau de bord personnel : même mise en page que « Commun »,
 * mais toutes les données sont filtrées sur UNE personne (sa part, son revenu).
 */
async function PersonalView({
  month,
  range,
  userId,
  name,
  balance,
  users,
}: {
  month: string;
  range: number;
  userId: string;
  name: string;
  balance: BalanceData;
  users: { id: string; name: string; color: string }[];
}) {
  const [stats, budgets, flow, expenses] = await Promise.all([
    getPersonalStats(month, userId),
    getBudgetOverview(month, userId),
    getPersonalCashFlow(month, userId, range),
    getExpenses(month),
  ]);

  // Seules les dépenses où cette personne porte une part, avec SA part affichée.
  const mine = expenses
    .map((e) => ({ e, share: e.shares.find((s) => s.userId === userId)?.amount ?? 0 }))
    .filter((x) => x.share > 0);

  return (
    <div className="space-y-5">
      <BudgetAlert
        overspent={budgets.overspent}
        atRisk={budgets.atRisk}
        month={month}
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          accent
          label={`Ma part · ${name}`}
          value={<CountUp value={stats.owed} />}
          hint={`${stats.count} dépense${stats.count > 1 ? "s" : ""}`}
        />
        <StatTile
          label="Dépenses partagées (ma part)"
          value={<CountUp value={stats.sharedOwed} />}
          hint={
            stats.owed > 0
              ? `${Math.round((stats.sharedOwed / stats.owed) * 100)} % de ma part`
              : "—"
          }
        />
        <StatTile
          label="Avancé par moi"
          value={<CountUp value={stats.paid} />}
          hint="Dépenses payées avec ma carte"
        />
        <StatTile
          label="Taux d'épargne"
          value={
            stats.savingsRate === null
              ? "—"
              : `${Math.round(stats.savingsRate * 100)} %`
          }
          hint="(Revenu − ma part) / revenu"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="raised" className="anim-rise lg:col-span-2">
          <CardHeader>
            <CardTitle>Répartition par catégorie · {name}</CardTitle>
            <CardDescription>Ma part des dépenses du mois</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonut
              month={month}
              data={stats.byCategory.map((c) => ({
                id: c.id,
                name: c.name,
                total: c.total,
              }))}
            />
          </CardContent>
        </Card>

        <BalanceCard balance={balance} users={users} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="raised" className="anim-rise lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenus, dépenses et épargne · {name}</CardTitle>
            <CardDescription>Mon revenu et ma part, six derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={flow} month={month} range={range} />
          </CardContent>
        </Card>

        <Card className="anim-rise">
          <CardHeader>
            <CardTitle>Mes dernières dépenses</CardTitle>
            <CardDescription>Avec ma part affichée</CardDescription>
          </CardHeader>
          <CardContent>
            {mine.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-muted)]">
                Aucune dépense avec une part ce mois-ci.
              </p>
            ) : (
              <ul className="-mx-2">
                {mine.slice(0, 6).map(({ e, share }) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-sm transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-sunken)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="truncate text-xs text-[var(--color-muted)]">
                        {formatDate(e.date)} · {e.category.name} ·{" "}
                        {splitLabel(e.splitType as SplitType, undefined, undefined)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum font-medium">{formatCents(share)}</p>
                      <p className="tnum text-xs text-[var(--color-muted)]">
                        sur {formatCents(e.amount)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; range?: string; vue?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();
  const range = params.range === "12" ? 12 : 6;
  const view: View =
    params.vue === "A" || params.vue === "B" ? params.vue : "all";

  const users = await getUsers();
  const userA = users.userA;
  const userB = users.userB;
  const names = { A: userA?.name ?? "A", B: userB?.name ?? "B" };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="t-page">
        Tableau de bord{view === "all" ? "" : ` · ${names[view]}`}
      </h1>
      <div className="flex flex-wrap items-center gap-3">
        <ViewTabs month={month} view={view} names={names} />
        <MonthPicker month={month} />
      </div>
    </div>
  );

  const balanceUsers = users.all.map((u) => ({
    id: u.id,
    name: u.name,
    color: u.color,
  }));

  if (view === "A" || view === "B") {
    const id = view === "A" ? userA?.id : userB?.id;
    const balance = await getGlobalBalance();
    return (
      <div className="space-y-5">
        {header}
        {id ? (
          <PersonalView
            month={month}
            range={range}
            userId={id}
            name={names[view]}
            balance={balance}
            users={balanceUsers}
          />
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Profil introuvable.</p>
        )}
      </div>
    );
  }

  const [stats, balance, flow, expenses] = await Promise.all([
    getMonthlyStats(month),
    getGlobalBalance(),
    getCashFlow(month, range),
    getExpenses(month),
  ]);

  return (
    <div className="space-y-5">
      {header}

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          accent
          label="Total du mois"
          value={<CountUp value={stats.total} />}
          hint={`${stats.count} dépense${stats.count > 1 ? "s" : ""}`}
        />
        <StatTile
          label="Dépenses partagées"
          value={<CountUp value={stats.sharedTotal} />}
          hint={
            stats.total > 0
              ? `${Math.round((stats.sharedTotal / stats.total) * 100)} % du total`
              : "—"
          }
        />
        {stats.byUserOwed.map((u) => (
          <StatTile
            key={u.userId}
            label={`À la charge de ${u.name}`}
            value={<CountUp value={u.total} />}
            hint={`Avancé : ${formatCents(
              stats.byUserPaid.find((p) => p.userId === u.userId)?.total ?? 0,
            )}`}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="raised" className="anim-rise lg:col-span-2">
          <CardHeader>
            <CardTitle>Répartition par catégorie</CardTitle>
            <CardDescription>Dépenses du mois sélectionné</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonut
              month={month}
              data={stats.byCategory.map((c) => ({
                id: c.id,
                name: c.name,
                total: c.total,
              }))}
            />
          </CardContent>
        </Card>

        <BalanceCard
          balance={balance}
          users={balanceUsers}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="raised" className="anim-rise lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenus, dépenses et épargne</CardTitle>
            <CardDescription>Six derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={flow} month={month} range={range} />
          </CardContent>
        </Card>

        <Card className="anim-rise">
          <CardHeader>
            <CardTitle>Dernières dépenses</CardTitle>
            <CardDescription>
              <Link
                href="/depenses"
                className="text-[var(--color-accent)] hover:underline"
              >
                Tout voir →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-muted)]">
                Aucune dépense ce mois-ci.
              </p>
            ) : (
              <ul className="-mx-2">
                {expenses.slice(0, 6).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-sm transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-sunken)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="truncate text-xs text-[var(--color-muted)]">
                        {formatDate(e.date)} · {e.category.name} ·{" "}
                        {splitLabel(e.splitType as SplitType, userA?.name, userB?.name)}
                      </p>
                    </div>
                    <span className="tnum shrink-0 font-medium">
                      {formatCents(e.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
