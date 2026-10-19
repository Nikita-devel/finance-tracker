import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  GenerateButton,
  RecurringForm,
  RecurringList,
  type RecurringRow,
} from "@/components/recurring-forms";
import { MonthPicker } from "@/components/month-picker";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/queries";
import { getActiveSlot, getUsers } from "@/lib/session";
import { currentMonth, monthLabel } from "@/lib/utils";
import { monthRange } from "@/lib/utils";
import type { SplitType } from "@/lib/split";

export const dynamic = "force-dynamic";

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();
  const { start, end } = monthRange(month);

  const [templates, generated, categories, users, activeSlot] = await Promise.all([
    prisma.recurringExpense.findMany({
      orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }],
      include: { category: true, paidBy: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end }, recurringId: { not: null } },
      select: { recurringId: true },
    }),
    getCategories(),
    getUsers(),
    getActiveSlot(),
  ]);

  const done = new Set(generated.map((g) => g.recurringId));
  const userAName = users.userA?.name ?? "Utilisateur A";
  const userBName = users.userB?.name ?? "Utilisateur B";

  const rows: RecurringRow[] = templates.map((t) => ({
    id: t.id,
    title: t.title,
    amount: t.amount,
    dayOfMonth: t.dayOfMonth,
    splitType: t.splitType as SplitType,
    categoryName: t.category.name,
    paidByName: t.paidBy.name,
    active: t.active,
    generatedThisMonth: done.has(t.id),
  }));

  const pending = rows.filter((r) => r.active && !r.generatedThisMonth).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-page">Dépenses récurrentes</h1>
        <MonthPicker month={month} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Nouveau modèle</CardTitle>
            <CardDescription>
              Un modèle ne crée rien tout seul : vous générez le mois quand vous le
              décidez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                Créez d&apos;abord une catégorie.
              </p>
            ) : (
              <RecurringForm
                categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                userAName={userAName}
                userBName={userBName}
                activeSlot={activeSlot}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Modèles — {monthLabel(month)}</CardTitle>
              <CardDescription>
                La génération est idempotente : relancer ne crée pas de doublon.
              </CardDescription>
            </div>
            <GenerateButton month={month} pending={pending} />
          </CardHeader>
          <CardContent>
            <RecurringList rows={rows} userAName={userAName} userBName={userBName} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
