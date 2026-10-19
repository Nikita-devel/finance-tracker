"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/field";
import { ExpenseForm, type ExpenseFormValues } from "@/components/expense-form";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { splitLabel, type SplitType } from "@/lib/split";
import { cn } from "@/lib/utils";

export interface ExpenseRow extends ExpenseFormValues {
  categoryName: string;
  categoryColor: string;
  paidByName: string;
  shares: { userName: string; amount: number }[];
  /** Ligne provisoire : écrite côté serveur, pas encore confirmée. */
  pending?: boolean;
}

function DeleteButton({
  id,
  onDelete,
}: {
  id: string;
  onDelete: (formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      aria-label="Supprimer"
      disabled={pending}
      onClick={() => {
        const data = new FormData();
        data.set("id", id);
        startTransition(() => {
          void onDelete(data);
        });
      }}
    >
      <Trash2 className="h-4 w-4 text-[var(--color-crit)]" />
    </Button>
  );
}

export function ExpenseList({
  expenses,
  categories,
  userAName,
  userBName,
  activeSlot,
  onDelete,
}: {
  expenses: ExpenseRow[];
  categories: { id: string; name: string }[];
  userAName: string;
  userBName: string;
  activeSlot: "A" | "B";
  onDelete: (formData: FormData) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          Aucune dépense sur cette période.
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Ajoutez-en une avec le formulaire, ou changez de mois.
        </p>
      </div>
    );
  }

  return (
    <ul className="-mx-2 divide-y divide-[var(--color-border)]">
      {expenses.map((e) => {
        const editing = editingId === e.id;
        return (
          <li
            key={e.id}
            className={cn(
              "px-2 py-2.5 transition-colors duration-[var(--dur-fast)]",
              e.pending ? "pending" : "hover:bg-[var(--color-sunken)]",
            )}
          >
            {editing ? (
              <div className="anim-in rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-sunken)] p-4">
                <p className="t-label mb-3">Modifier la dépense</p>
                <ExpenseForm
                  categories={categories}
                  userAName={userAName}
                  userBName={userBName}
                  activeSlot={activeSlot}
                  initial={e}
                  onDone={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.title}</span>
                    <Badge color={e.categoryColor}>{e.categoryName}</Badge>
                    {e.pending && (
                      <span className="t-label text-[var(--color-accent)]">
                        enregistrement…
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {formatDate(new Date(`${e.date}T12:00:00`))} · payé par {e.paidByName} ·{" "}
                    {splitLabel(e.splitType as SplitType, userAName, userBName)}
                    {e.shares.length > 1 && (
                      <>
                        {" · "}
                        {e.shares
                          .map((s) => `${s.userName} ${formatCents(s.amount)}`)
                          .join(" / ")}
                      </>
                    )}
                  </p>
                  {e.note && (
                    <p className="mt-0.5 text-xs italic text-[var(--color-muted)]">
                      {e.note}
                    </p>
                  )}
                </div>

                {/* Sur mobile, montant et actions passent sur leur propre ligne :
                    coincés à côté d'un intitulé qui tient sur trois lignes, ils
                    deviennent illisibles. */}
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                  <span className="tnum font-semibold">{formatCents(e.amount)}</span>

                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Modifier"
                      disabled={e.pending}
                      onClick={() => setEditingId(e.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!e.pending && <DeleteButton id={e.id} onDelete={onDelete} />}
                  </div>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
