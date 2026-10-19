import { Card, CardContent } from "@/components/ui/card";
import { ExpensesPanel } from "@/components/expenses-panel";
import type { ExpenseRow } from "@/components/expense-list";
import { MonthPicker } from "@/components/month-picker";
import { ExpenseFilters } from "@/components/expense-filters";
import { getCategories, getExpenses } from "@/lib/queries";
import { getActiveSlot, getUsers } from "@/lib/session";
import { currentMonth, toDateInputValue } from "@/lib/utils";
import type { SplitType } from "@/lib/split";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    q?: string;
    categoryId?: string;
    paidBySlot?: string;
    splitType?: string;
  }>;
}) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();
  const filters = {
    q: params.q,
    categoryId: params.categoryId,
    paidBySlot: params.paidBySlot,
    splitType: params.splitType,
  };

  const [expenses, categories, users, activeSlot] = await Promise.all([
    getExpenses(month, filters),
    getCategories(),
    getUsers(),
    getActiveSlot(),
  ]);

  const userAName = users.userA?.name ?? "Utilisateur A";
  const userBName = users.userB?.name ?? "Utilisateur B";
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const rows: ExpenseRow[] = expenses.map((e) => {
    const shareA = e.shares.find((s) => s.user.slot === "A");
    return {
      id: e.id,
      title: e.title,
      amount: e.amount,
      date: toDateInputValue(e.date),
      categoryId: e.categoryId,
      categoryName: e.category.name,
      categoryColor: e.category.color,
      paidBySlot: e.paidBy.slot === "B" ? "B" : "A",
      paidByName: e.paidBy.name,
      splitType: e.splitType as SplitType,
      customAmountA: e.splitType === "CUSTOM" ? (shareA?.amount ?? 0) : undefined,
      note: e.note,
      shares: e.shares.map((s) => ({ userName: s.user.name, amount: s.amount })),
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-page">Dépenses</h1>
        <MonthPicker month={month} />
      </div>

      <Card variant="sunken">
        <CardContent className="pt-5">
          <ExpenseFilters
            month={month}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            userAName={userAName}
            userBName={userBName}
            values={filters}
          />
        </CardContent>
      </Card>

      <ExpensesPanel
        rows={rows}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        userAName={userAName}
        userBName={userBName}
        activeSlot={activeSlot}
        total={total}
      />
    </div>
  );
}
