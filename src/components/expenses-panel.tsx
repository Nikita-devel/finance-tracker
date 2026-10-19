"use client";

import { useOptimistic } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseList, type ExpenseRow } from "@/components/expense-list";
import { createExpense, deleteExpense, type ActionState } from "@/app/actions";
import { toCents, formatCents } from "@/lib/money";
import type { SplitType } from "@/lib/split";

/**
 * Le formulaire et la liste partagent un même état optimiste : une dépense
 * ajoutée apparaît AVANT la réponse du serveur, et une dépense supprimée
 * disparaît tout de suite.
 *
 * `useOptimistic` retombe automatiquement sur les données du serveur quand
 * l'action se termine — si l'écriture échoue, la ligne provisoire s'efface
 * d'elle-même et le message d'erreur du formulaire prend le relais. Aucun état
 * local à réconcilier à la main.
 */

type Patch =
  | { type: "add"; row: ExpenseRow }
  | { type: "remove"; id: string };

function reducer(rows: ExpenseRow[], patch: Patch): ExpenseRow[] {
  switch (patch.type) {
    case "add":
      return [patch.row, ...rows];
    case "remove":
      return rows.filter((r) => r.id !== patch.id);
  }
}

export function ExpensesPanel({
  rows,
  categories,
  userAName,
  userBName,
  activeSlot,
  total,
}: {
  rows: ExpenseRow[];
  categories: { id: string; name: string; color: string }[];
  userAName: string;
  userBName: string;
  activeSlot: "A" | "B";
  total: number;
}) {
  const [optimisticRows, patch] = useOptimistic(rows, reducer);

  /** Reconstruit une ligne plausible à partir du formulaire, le temps de l'aller-retour. */
  function draftFrom(formData: FormData): ExpenseRow | null {
    const amount = toCents(String(formData.get("amount") ?? ""));
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const categoryId = String(formData.get("categoryId") ?? "");
    const category = categories.find((c) => c.id === categoryId);
    const paidBySlot = formData.get("paidBySlot") === "B" ? "B" : "A";

    return {
      id: `draft-${Math.random().toString(36).slice(2)}`,
      title: String(formData.get("title") ?? ""),
      amount,
      date: String(formData.get("date") ?? ""),
      categoryId,
      categoryName: category?.name ?? "—",
      categoryColor: category?.color ?? "#94a3b8",
      paidBySlot,
      paidByName: paidBySlot === "A" ? userAName : userBName,
      splitType: String(formData.get("splitType") ?? "SHARED_50_50") as SplitType,
      note: (formData.get("note") as string) || null,
      shares: [],
      pending: true,
    };
  }

  async function create(prev: ActionState, formData: FormData): Promise<ActionState> {
    const draft = draftFrom(formData);
    if (draft) patch({ type: "add", row: draft });
    return createExpense(prev, formData);
  }

  async function remove(formData: FormData): Promise<void> {
    patch({ type: "remove", id: String(formData.get("id") ?? "") });
    await deleteExpense(formData);
  }

  const optimisticTotal = optimisticRows.reduce((s, r) => s + r.amount, 0);
  const count = optimisticRows.length;

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr] lg:items-start">
      <Card variant="raised" className="anim-rise">
        <CardHeader>
          <CardTitle>Nouvelle dépense</CardTitle>
          <CardDescription>
            « Payé par » est pré-rempli avec l&apos;utilisateur actif.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              Créez d&apos;abord une catégorie dans Paramètres.
            </p>
          ) : (
            <ExpenseForm
              categories={categories}
              userAName={userAName}
              userBName={userBName}
              activeSlot={activeSlot}
              action={create}
            />
          )}
        </CardContent>
      </Card>

      <Card className="anim-rise">
        <CardHeader>
          <CardTitle>
            {count} dépense{count > 1 ? "s" : ""} —{" "}
            <span className="tnum">{formatCents(optimisticTotal || total)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseList
            expenses={optimisticRows}
            categories={categories}
            userAName={userAName}
            userBName={userBName}
            activeSlot={activeSlot}
            onDelete={remove}
          />
        </CardContent>
      </Card>
    </div>
  );
}
