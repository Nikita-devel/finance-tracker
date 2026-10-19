import { prisma } from "./db";
import { computeBalances, type BalanceResult } from "./balance";
import {
  computeBudgetLines,
  computeRule503020,
  monthProgress,
  savingsRate,
  totalIncome,
  type BudgetLine,
  type RuleResult,
} from "./budget";
import { monthRange } from "./utils";

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export interface ExpenseFilters {
  q?: string;
  categoryId?: string;
  paidBySlot?: string;
  splitType?: string;
}

export async function getExpenses(month?: string, filters: ExpenseFilters = {}) {
  const where: Record<string, unknown> = {};

  if (month) {
    const { start, end } = monthRange(month);
    where.date = { gte: start, lt: end };
  }
  if (filters.q) {
    // SQLite : `contains` est insensible à la casse pour l'ASCII via LIKE.
    where.OR = [
      { title: { contains: filters.q } },
      { note: { contains: filters.q } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.paidBySlot === "A" || filters.paidBySlot === "B") {
    where.paidBy = { slot: filters.paidBySlot };
  }
  if (filters.splitType) where.splitType = filters.splitType;

  return prisma.expense.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      category: true,
      paidBy: true,
      shares: { include: { user: true } },
    },
  });
}

export async function getSettlements() {
  return prisma.settlement.findMany({
    orderBy: { date: "desc" },
    include: { fromUser: true, toUser: true },
  });
}

/** Solde global, toutes périodes confondues, remboursements déduits. */
export async function getGlobalBalance(): Promise<BalanceResult> {
  const [users, expenses, settlements] = await Promise.all([
    prisma.user.findMany({ orderBy: { slot: "asc" } }),
    prisma.expense.findMany({ select: { paidById: true, amount: true, shares: { select: { userId: true, amount: true } } } }),
    prisma.settlement.findMany({ select: { fromUserId: true, toUserId: true, amount: true } }),
  ]);

  return computeBalances(
    users.map((u) => u.id),
    expenses,
    settlements,
  );
}

export interface MonthlyStats {
  total: number;
  byCategory: { id: string; name: string; color: string; total: number }[];
  byUserPaid: { userId: string; name: string; color: string; total: number }[];
  byUserOwed: { userId: string; name: string; color: string; total: number }[];
  sharedTotal: number;
  personalTotal: number;
  count: number;
}

export async function getMonthlyStats(month: string): Promise<MonthlyStats> {
  const { start, end } = monthRange(month);
  const [users, expenses] = await Promise.all([
    prisma.user.findMany({ orderBy: { slot: "asc" } }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      include: { category: true, shares: true },
    }),
  ]);

  const categoryMap = new Map<string, { id: string; name: string; color: string; total: number }>();
  const paidMap = new Map<string, number>();
  const owedMap = new Map<string, number>();
  let total = 0;
  let sharedTotal = 0;

  for (const e of expenses) {
    total += e.amount;
    if (e.splitType !== "PERSONAL_A" && e.splitType !== "PERSONAL_B") sharedTotal += e.amount;

    const c = categoryMap.get(e.categoryId) ?? {
      id: e.categoryId,
      name: e.category.name,
      color: e.category.color,
      total: 0,
    };
    c.total += e.amount;
    categoryMap.set(e.categoryId, c);

    paidMap.set(e.paidById, (paidMap.get(e.paidById) ?? 0) + e.amount);
    for (const s of e.shares) {
      owedMap.set(s.userId, (owedMap.get(s.userId) ?? 0) + s.amount);
    }
  }

  return {
    total,
    count: expenses.length,
    sharedTotal,
    personalTotal: total - sharedTotal,
    byCategory: [...categoryMap.values()].sort((a, b) => b.total - a.total),
    byUserPaid: users.map((u) => ({
      userId: u.id,
      name: u.name,
      color: u.color,
      total: paidMap.get(u.id) ?? 0,
    })),
    byUserOwed: users.map((u) => ({
      userId: u.id,
      name: u.name,
      color: u.color,
      total: owedMap.get(u.id) ?? 0,
    })),
  };
}

export interface PersonalStats {
  /** Somme des PARTS de la personne sur le mois : ce qu'elle supporte réellement. */
  owed: number;
  /** Somme des dépenses qu'elle a avancées (carte utilisée). */
  paid: number;
  /** Dépenses du mois où elle a une part non nulle. */
  count: number;
  /** Revenu du mois : base stable + revenus variables du mois. */
  income: number;
  /** Taux d'épargne sur sa part : (revenu − part) / revenu, null si revenu nul. */
  savingsRate: number | null;
  /** Part de la personne sur les dépenses partagées (hors « Personnel »). */
  sharedOwed: number;
  /** Répartition de SA part par catégorie. */
  byCategory: { id: string; name: string; color: string; total: number }[];
}

/** Vue personnelle d'UNE personne pour un mois (parts, avances, revenu). */
export async function getPersonalStats(
  month: string,
  userId: string,
): Promise<PersonalStats> {
  const { start, end } = monthRange(month);
  const [user, shares, paid, incomes] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { baseIncome: true } }),
    prisma.expenseShare.findMany({
      where: { userId, expense: { date: { gte: start, lt: end } } },
      select: {
        amount: true,
        expenseId: true,
        expense: {
          select: {
            splitType: true,
            categoryId: true,
            category: { select: { name: true, color: true } },
          },
        },
      },
    }),
    prisma.expense.aggregate({
      where: { paidById: userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.income.aggregate({
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  const owed = shares.reduce((s, x) => s + x.amount, 0);
  let sharedOwed = 0;
  const catMap = new Map<string, { id: string; name: string; color: string; total: number }>();
  for (const s of shares) {
    const ex = s.expense;
    if (ex.splitType !== "PERSONAL_A" && ex.splitType !== "PERSONAL_B") sharedOwed += s.amount;
    const c = catMap.get(ex.categoryId) ?? {
      id: ex.categoryId,
      name: ex.category.name,
      color: ex.category.color,
      total: 0,
    };
    c.total += s.amount;
    catMap.set(ex.categoryId, c);
  }
  const byCategory = [...catMap.values()].sort((a, b) => b.total - a.total);
  const income = (user?.baseIncome ?? 0) + (incomes._sum.amount ?? 0);

  return {
    owed,
    sharedOwed,
    byCategory,
    paid: paid._sum.amount ?? 0,
    count: new Set(shares.map((s) => s.expenseId)).size,
    income,
    savingsRate: income > 0 ? (income - owed) / income : null,
  };
}

// ---------------------------------------------------------------------------
// Plafonds & règle 50/30/20
// ---------------------------------------------------------------------------

export interface BudgetOverview {
  lines: BudgetLine[];
  progress: number;
  overspent: BudgetLine[];
  atRisk: BudgetLine[];
  totalBudget: number;
  totalSpent: number;
}

/**
 * Plafonds d'UNE personne pour un mois.
 * Le « dépensé » est la somme de ses PARTS (`ExpenseShare`), pas des dépenses
 * qu'elle a avancées : sinon celui qui sort la carte le plus souvent paraîtrait
 * toujours dépensier, et le plafond mesurerait la trésorerie au lieu du coût.
 */
export async function getBudgetOverview(
  month: string,
  userId: string,
  now: Date = new Date(),
): Promise<BudgetOverview> {
  const { start, end } = monthRange(month);
  const [categories, shares] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { budgets: { where: { userId }, select: { amount: true } } },
    }),
    prisma.expenseShare.findMany({
      where: { userId, expense: { date: { gte: start, lt: end } } },
      select: { amount: true, expense: { select: { categoryId: true } } },
    }),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const s of shares) {
    const key = s.expense.categoryId;
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + s.amount);
  }

  const progress = monthProgress(month, now);
  const lines = computeBudgetLines(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      budget: c.budgets[0]?.amount ?? null,
      spent: spentByCategory.get(c.id) ?? 0,
    })),
    progress,
  );

  return {
    lines,
    progress,
    overspent: lines.filter((l) => l.status === "critical"),
    atRisk: lines.filter((l) => l.status === "warning"),
    totalBudget: lines.reduce((s, l) => s + l.budget, 0),
    totalSpent: lines.reduce((s, l) => s + l.spent, 0),
  };
}

export async function getRule503020(month: string): Promise<RuleResult | null> {
  const { start, end } = monthRange(month);
  const [users, incomes, expenses] = await Promise.all([
    prisma.user.findMany({ select: { baseIncome: true } }),
    prisma.income.findMany({
      where: { date: { gte: start, lt: end } },
      select: { amount: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      select: { amount: true, category: { select: { bucket: true } } },
    }),
  ]);

  const income = totalIncome(
    users.map((u) => u.baseIncome),
    incomes,
  );

  let besoins = 0;
  let envies = 0;
  for (const e of expenses) {
    if (e.category.bucket === "ENVIES") envies += e.amount;
    else besoins += e.amount;
  }

  return computeRule503020({ income, besoins, envies });
}

// ---------------------------------------------------------------------------
// Revenus
// ---------------------------------------------------------------------------

/** Те саме, що getCashFlow, але для однієї людини: її дохід і її ЧАСТКА у витратах. */
export async function getPersonalCashFlow(
  month: string,
  userId: string,
  months = 6,
): Promise<MonthlyFlow[]> {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - months, 1);
  const end = new Date(y, m, 1);

  const [user, incomes, shares] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { baseIncome: true } }),
    prisma.income.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { date: true, amount: true },
    }),
    prisma.expenseShare.findMany({
      where: { userId, expense: { date: { gte: start, lt: end } } },
      select: { amount: true, expense: { select: { date: true } } },
    }),
  ]);

  const base = user?.baseIncome ?? 0;
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const buckets = new Map<string, { income: number; expenses: number; touched: boolean }>();
  for (let i = 0; i < months; i += 1) {
    const d = new Date(y, m - months + i, 1);
    buckets.set(key(d), { income: base, expenses: 0, touched: false });
  }
  for (const inc of incomes) {
    const b = buckets.get(key(new Date(inc.date)));
    if (b) {
      b.income += inc.amount;
      b.touched = true;
    }
  }
  for (const s of shares) {
    const b = buckets.get(key(new Date(s.expense.date)));
    if (b) {
      b.expenses += s.amount;
      b.touched = true;
    }
  }

  return [...buckets.entries()].map(([k, v]) => ({
    month: k,
    label: new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1, 1)
      .toLocaleDateString("fr-FR", { month: "short" })
      .replace(".", ""),
    income: v.touched ? v.income : null,
    expenses: v.touched ? v.expenses : null,
    rate: v.touched ? savingsRate(v.income, v.expenses) : null,
  }));
}

export async function getIncomes(month: string) {
  const { start, end } = monthRange(month);
  return prisma.income.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { user: true },
  });
}

export interface MonthlyFlow {
  month: string;
  label: string;
  /** `null` = mois sans aucune donnée (avant le début du suivi) : on ne l'invente pas. */
  income: number | null;
  expenses: number | null;
  /** Taux d'épargne, ou null si le mois n'a pas de données exploitables. */
  rate: number | null;
}

/** Revenus, dépenses et taux d'épargne sur les N derniers mois. */
export async function getCashFlow(month: string, months = 6): Promise<MonthlyFlow[]> {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - months, 1);
  const end = new Date(y, m, 1);

  const [users, incomes, expenses] = await Promise.all([
    prisma.user.findMany({ select: { baseIncome: true } }),
    prisma.income.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, amount: true },
    }),
  ]);

  const base = users.reduce((s, u) => s + u.baseIncome, 0);
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const buckets = new Map<
    string,
    { income: number; expenses: number; touched: boolean }
  >();
  for (let i = 0; i < months; i += 1) {
    const d = new Date(y, m - months + i, 1);
    buckets.set(key(d), { income: base, expenses: 0, touched: false });
  }
  for (const inc of incomes) {
    const b = buckets.get(key(new Date(inc.date)));
    if (b) {
      b.income += inc.amount;
      b.touched = true;
    }
  }
  for (const exp of expenses) {
    const b = buckets.get(key(new Date(exp.date)));
    if (b) {
      b.expenses += exp.amount;
      b.touched = true;
    }
  }

  // Un mois sans la moindre écriture est un mois AVANT le suivi, pas un mois où
  // l'on a tout épargné : on le laisse vide plutôt que d'afficher 100 %.
  return [...buckets.entries()].map(([k, v]) => ({
    month: k,
    label: new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1, 1)
      .toLocaleDateString("fr-FR", { month: "short" })
      .replace(".", ""),
    income: v.touched ? v.income : null,
    expenses: v.touched ? v.expenses : null,
    rate: v.touched ? savingsRate(v.income, v.expenses) : null,
  }));
}
