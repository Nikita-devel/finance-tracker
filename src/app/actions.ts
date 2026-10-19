"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeShares, SPLIT_TYPES } from "@/lib/split";
import { toCents } from "@/lib/money";
import { ACTIVE_USER_COOKIE, getUsers } from "@/lib/session";

export interface ActionState {
  ok: boolean;
  error?: string;
}

const amountField = z
  .string()
  .trim()
  .min(1, "Montant requis")
  .transform((v) => toCents(v))
  .refine((v) => Number.isFinite(v) && v > 0, "Montant invalide (doit être > 0)");

const expenseSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(120),
  amount: amountField,
  date: z.string().min(1, "Date requise"),
  categoryId: z.string().min(1, "Catégorie requise"),
  paidBySlot: z.enum(["A", "B"]),
  splitType: z.enum(SPLIT_TYPES),
  customAmountA: z.string().optional(),
  note: z.string().trim().max(500).optional(),
});

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/depenses");
  revalidatePath("/reglements");
  revalidatePath("/parametres");
  revalidatePath("/budgets");
  revalidatePath("/recurrentes");
  revalidatePath("/revenus");
}

function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Données invalides";
}

async function buildExpenseData(formData: FormData) {
  const parsed = expenseSchema.safeParse({
    title: formData.get("title"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    categoryId: formData.get("categoryId"),
    paidBySlot: formData.get("paidBySlot"),
    splitType: formData.get("splitType"),
    customAmountA: formData.get("customAmountA") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) } as const;

  const { userA, userB } = await getUsers();
  if (!userA || !userB) {
    return { error: "Les deux utilisateurs doivent exister (lancez le seed)." } as const;
  }

  const data = parsed.data;
  let customAmountA: number | undefined;
  if (data.splitType === "CUSTOM") {
    customAmountA = toCents(data.customAmountA ?? "");
    if (!Number.isFinite(customAmountA)) {
      return { error: "Part personnalisée invalide." } as const;
    }
    if (customAmountA < 0 || customAmountA > data.amount) {
      return { error: "La part doit être comprise entre 0 et le montant total." } as const;
    }
  }

  let shares;
  try {
    shares = computeShares({
      userAId: userA.id,
      userBId: userB.id,
      amount: data.amount,
      splitType: data.splitType,
      customAmountA,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Répartition invalide." } as const;
  }

  return {
    value: {
      title: data.title,
      amount: data.amount,
      date: new Date(`${data.date}T12:00:00`),
      note: data.note || null,
      splitType: data.splitType,
      categoryId: data.categoryId,
      paidById: data.paidBySlot === "A" ? userA.id : userB.id,
      shares,
    },
  } as const;
}

export async function createExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const built = await buildExpenseData(formData);
  if ("error" in built) return { ok: false, error: built.error };
  const { shares, ...expense } = built.value;

  await prisma.expense.create({
    data: {
      ...expense,
      shares: { create: shares.map((s) => ({ userId: s.userId, amount: s.amount })) },
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function updateExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Dépense introuvable." };

  const built = await buildExpenseData(formData);
  if ("error" in built) return { ok: false, error: built.error };
  const { shares, ...expense } = built.value;

  await prisma.$transaction([
    prisma.expenseShare.deleteMany({ where: { expenseId: id } }),
    prisma.expense.update({
      data: {
        ...expense,
        shares: { create: shares.map((s) => ({ userId: s.userId, amount: s.amount })) },
      },
      where: { id },
    }),
  ]);

  revalidateAll();
  return { ok: true };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.expense.delete({ where: { id } });
  revalidateAll();
}

const settlementSchema = z.object({
  amount: amountField,
  date: z.string().min(1, "Date requise"),
  fromSlot: z.enum(["A", "B"]),
  note: z.string().trim().max(500).optional(),
});

export async function createSettlement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = settlementSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    fromSlot: formData.get("fromSlot"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const { userA, userB } = await getUsers();
  if (!userA || !userB) return { ok: false, error: "Utilisateurs manquants." };

  const from = parsed.data.fromSlot === "A" ? userA : userB;
  const to = parsed.data.fromSlot === "A" ? userB : userA;

  await prisma.settlement.create({
    data: {
      amount: parsed.data.amount,
      date: new Date(`${parsed.data.date}T12:00:00`),
      note: parsed.data.note || null,
      fromUserId: from.id,
      toUserId: to.id,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteSettlement(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.settlement.delete({ where: { id } });
  revalidateAll();
}

export async function setActiveSlot(formData: FormData): Promise<void> {
  const slot = formData.get("slot") === "B" ? "B" : "A";
  const store = await cookies();
  store.set(ACTIVE_USER_COOKIE, slot, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidateAll();
}

const usersSchema = z.object({
  nameA: z.string().trim().min(1, "Nom requis").max(40),
  nameB: z.string().trim().min(1, "Nom requis").max(40),
  colorA: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide"),
  colorB: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide"),
});

export async function updateUsers(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = usersSchema.safeParse({
    nameA: formData.get("nameA"),
    nameB: formData.get("nameB"),
    colorA: formData.get("colorA"),
    colorB: formData.get("colorB"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (parsed.data.nameA === parsed.data.nameB) {
    return { ok: false, error: "Les deux noms doivent être différents." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { slot: "A" },
      data: { name: parsed.data.nameA, color: parsed.data.colorA },
    }),
    prisma.user.update({
      where: { slot: "B" },
      data: { name: parsed.data.nameB, color: parsed.data.colorB },
    }),
  ]);

  revalidateAll();
  return { ok: true };
}

const categorySchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide"),
});

export async function createCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const exists = await prisma.category.findUnique({ where: { name: parsed.data.name } });
  if (exists) return { ok: false, error: "Cette catégorie existe déjà." };

  await prisma.category.create({ data: parsed.data });
  revalidateAll();
  return { ok: true };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const used = await prisma.expense.count({ where: { categoryId: id } });
  if (used === 0) await prisma.category.delete({ where: { id } });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Plafonds, buckets et revenus
// ---------------------------------------------------------------------------

const optionalAmount = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : toCents(v)))
  .refine(
    (v) => v === null || (Number.isFinite(v) && v >= 0),
    "Montant invalide",
  );

const categoryUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Nom requis").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide"),
  bucket: z.enum(["BESOINS", "ENVIES"]),
  // Un plafond par personne : vide = catégorie non suivie pour elle.
  budgetA: optionalAmount,
  budgetB: optionalAmount,
});

export async function updateCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categoryUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    color: formData.get("color"),
    bucket: formData.get("bucket"),
    budgetA: formData.get("budgetA") ?? undefined,
    budgetB: formData.get("budgetB") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const { id, budgetA, budgetB, ...data } = parsed.data;
  const clash = await prisma.category.findFirst({
    where: { name: data.name, NOT: { id } },
  });
  if (clash) return { ok: false, error: "Une autre catégorie porte déjà ce nom." };

  const users = await prisma.user.findMany({ select: { id: true, slot: true } });
  const budgetOps = users.map((u) => {
    const amount = u.slot === "A" ? budgetA : budgetB;
    // Champ vide ou 0 = on retire le plafond plutôt que d'en stocker un à zéro,
    // qui afficherait la catégorie en dépassement permanent.
    return amount === null || amount === 0
      ? prisma.categoryBudget.deleteMany({ where: { categoryId: id, userId: u.id } })
      : prisma.categoryBudget.upsert({
          where: { categoryId_userId: { categoryId: id, userId: u.id } },
          create: { categoryId: id, userId: u.id, amount },
          update: { amount },
        });
  });

  await prisma.$transaction([
    prisma.category.update({ where: { id }, data }),
    ...budgetOps,
  ]);
  revalidateAll();
  return { ok: true };
}

const baseIncomeSchema = z.object({
  incomeA: optionalAmount,
  incomeB: optionalAmount,
});

export async function updateIncomes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = baseIncomeSchema.safeParse({
    incomeA: formData.get("incomeA") ?? undefined,
    incomeB: formData.get("incomeB") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  await prisma.$transaction([
    prisma.user.update({
      where: { slot: "A" },
      data: { baseIncome: parsed.data.incomeA ?? 0 },
    }),
    prisma.user.update({
      where: { slot: "B" },
      data: { baseIncome: parsed.data.incomeB ?? 0 },
    }),
  ]);

  revalidateAll();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Dépenses récurrentes
// ---------------------------------------------------------------------------

const recurringSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(120),
  amount: amountField,
  dayOfMonth: z.coerce
    .number()
    .int()
    .min(1, "Jour entre 1 et 28")
    .max(28, "Jour entre 1 et 28"),
  categoryId: z.string().min(1, "Catégorie requise"),
  paidBySlot: z.enum(["A", "B"]),
  splitType: z.enum(SPLIT_TYPES),
  customAmountA: z.string().optional(),
});

export async function createRecurring(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = recurringSchema.safeParse({
    title: formData.get("title"),
    amount: formData.get("amount"),
    dayOfMonth: formData.get("dayOfMonth"),
    categoryId: formData.get("categoryId"),
    paidBySlot: formData.get("paidBySlot"),
    splitType: formData.get("splitType"),
    customAmountA: formData.get("customAmountA") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const { userA, userB } = await getUsers();
  if (!userA || !userB) return { ok: false, error: "Utilisateurs manquants." };

  const data = parsed.data;
  let customAmountA: number | null = null;
  if (data.splitType === "CUSTOM") {
    const value = toCents(data.customAmountA ?? "");
    if (!Number.isFinite(value) || value < 0 || value > data.amount) {
      return { ok: false, error: "La part doit être comprise entre 0 et le montant total." };
    }
    customAmountA = value;
  }

  await prisma.recurringExpense.create({
    data: {
      title: data.title,
      amount: data.amount,
      dayOfMonth: data.dayOfMonth,
      splitType: data.splitType,
      customAmountA,
      categoryId: data.categoryId,
      paidById: data.paidBySlot === "A" ? userA.id : userB.id,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function toggleRecurring(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const current = await prisma.recurringExpense.findUnique({ where: { id } });
  if (current) {
    await prisma.recurringExpense.update({
      where: { id },
      data: { active: !current.active },
    });
  }
  revalidateAll();
}

export async function deleteRecurring(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  // Les dépenses déjà générées survivent (recurringId passe à NULL) : on ne
  // réécrit pas l'historique parce qu'un modèle est supprimé.
  if (id) await prisma.recurringExpense.delete({ where: { id } });
  revalidateAll();
}

/**
 * Génère les dépenses du mois pour tous les modèles actifs.
 * Idempotent : un modèle qui a déjà produit une dépense sur ce mois est ignoré.
 */
export async function generateRecurring(formData: FormData): Promise<void> {
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return;

  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const [templates, existing, { userA, userB }] = await Promise.all([
    prisma.recurringExpense.findMany({ where: { active: true } }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end }, recurringId: { not: null } },
      select: { recurringId: true },
    }),
    getUsers(),
  ]);
  if (!userA || !userB) return;

  const alreadyDone = new Set(existing.map((e) => e.recurringId));

  for (const t of templates) {
    if (alreadyDone.has(t.id)) continue;
    const shares = computeShares({
      userAId: userA.id,
      userBId: userB.id,
      amount: t.amount,
      splitType: t.splitType as (typeof SPLIT_TYPES)[number],
      customAmountA: t.customAmountA ?? undefined,
    });
    await prisma.expense.create({
      data: {
        title: t.title,
        amount: t.amount,
        date: new Date(y, m - 1, t.dayOfMonth, 12),
        splitType: t.splitType,
        categoryId: t.categoryId,
        paidById: t.paidById,
        recurringId: t.id,
        shares: { create: shares.map((s) => ({ userId: s.userId, amount: s.amount })) },
      },
    });
  }

  revalidateAll();
}

// ---------------------------------------------------------------------------
// Revenus variables
// ---------------------------------------------------------------------------

const incomeEntrySchema = z.object({
  amount: amountField,
  date: z.string().min(1, "Date requise"),
  source: z.string().trim().min(1, "Source requise").max(60),
  userSlot: z.enum(["A", "B"]),
  note: z.string().trim().max(500).optional(),
});

export async function createIncome(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = incomeEntrySchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    source: formData.get("source"),
    userSlot: formData.get("userSlot"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const { userA, userB } = await getUsers();
  if (!userA || !userB) return { ok: false, error: "Utilisateurs manquants." };

  await prisma.income.create({
    data: {
      amount: parsed.data.amount,
      date: new Date(`${parsed.data.date}T12:00:00`),
      source: parsed.data.source,
      note: parsed.data.note || null,
      userId: parsed.data.userSlot === "A" ? userA.id : userB.id,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteIncome(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.income.delete({ where: { id } });
  revalidateAll();
}
