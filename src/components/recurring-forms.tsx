"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pause, Play, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import {
  createRecurring,
  deleteRecurring,
  generateRecurring,
  toggleRecurring,
  type ActionState,
} from "@/app/actions";
import { formatCents, fromCents } from "@/lib/money";
import { splitLabel, type SplitType } from "@/lib/split";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function RecurringForm({
  categories,
  userAName,
  userBName,
  activeSlot,
}: {
  categories: { id: string; name: string }[];
  userAName: string;
  userBName: string;
  activeSlot: "A" | "B";
}) {
  const [state, action] = useActionState<ActionState, FormData>(createRecurring, {
    ok: false,
  });
  const ref = useRef<HTMLFormElement>(null);
  const [splitType, setSplitType] = useState<SplitType>("SHARED_50_50");

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setSplitType("SHARED_50_50");
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="rec-title">Intitulé</Label>
          <Input id="rec-title" name="title" required maxLength={120} placeholder="Loyer, Netflix…" />
        </div>
        <div>
          <Label htmlFor="rec-amount">Montant (€)</Label>
          <Input id="rec-amount" name="amount" required inputMode="decimal" placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="rec-day">Jour du mois (1–28)</Label>
          <Input
            id="rec-day"
            name="dayOfMonth"
            type="number"
            min={1}
            max={28}
            defaultValue={1}
            required
          />
        </div>
        <div>
          <Label htmlFor="rec-category">Catégorie</Label>
          <Select id="rec-category" name="categoryId" required defaultValue={categories[0]?.id}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="rec-paid">Payé par</Label>
          <Select id="rec-paid" name="paidBySlot" defaultValue={activeSlot}>
            <option value="A">{userAName}</option>
            <option value="B">{userBName}</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="rec-split">Répartition</Label>
          <Select
            id="rec-split"
            name="splitType"
            value={splitType}
            onChange={(e) => setSplitType(e.target.value as SplitType)}
          >
            <option value="SHARED_50_50">Partagé 50/50</option>
            <option value="PERSONAL_A">Personnel — {userAName}</option>
            <option value="PERSONAL_B">Personnel — {userBName}</option>
            <option value="CUSTOM">Répartition libre</option>
          </Select>
        </div>
        {splitType === "CUSTOM" && (
          <div className="sm:col-span-2">
            <Label htmlFor="rec-custom">Part de {userAName} (€)</Label>
            <Input id="rec-custom" name="customAmountA" inputMode="decimal" placeholder="0,00" />
          </div>
        )}
      </div>

      {state.error && (
        <p className="anim-in rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-crit)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-crit)]">
          {state.error}
        </p>
      )}

      <Submit label="Ajouter le modèle" />
    </form>
  );
}

export interface RecurringRow {
  id: string;
  title: string;
  amount: number;
  dayOfMonth: number;
  splitType: SplitType;
  categoryName: string;
  paidByName: string;
  active: boolean;
  generatedThisMonth: boolean;
}

export function RecurringList({
  rows,
  userAName,
  userBName,
}: {
  rows: RecurringRow[];
  userAName: string;
  userBName: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-muted)]">
        Aucun modèle récurrent.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className={r.active ? "font-medium" : "font-medium line-through opacity-60"}>
              {r.title}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              le {r.dayOfMonth} du mois · {r.categoryName} · payé par {r.paidByName} ·{" "}
              {splitLabel(r.splitType, userAName, userBName)}
              {r.generatedThisMonth ? " · déjà généré ce mois-ci" : ""}
            </p>
          </div>
          <span className="tabular-nums font-semibold">{formatCents(r.amount)}</span>
          <div className="flex items-center gap-1">
            <form action={toggleRecurring}>
              <input type="hidden" name="id" value={r.id} />
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                aria-label={r.active ? "Suspendre" : "Réactiver"}
                title={r.active ? "Suspendre" : "Réactiver"}
              >
                {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </form>
            <form action={deleteRecurring}>
              <input type="hidden" name="id" value={r.id} />
              <Button variant="ghost" size="icon" type="submit" aria-label="Supprimer">
                <Trash2 className="h-4 w-4 text-[var(--color-crit)]" />
              </Button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GenerateButton({
  month,
  pending,
}: {
  month: string;
  pending: number;
}) {
  return (
    <form action={generateRecurring} className="flex items-center gap-3">
      <input type="hidden" name="month" value={month} />
      <Button type="submit" variant={pending > 0 ? "default" : "outline"} disabled={pending === 0}>
        <RefreshCw className="h-4 w-4" />
        {pending > 0
          ? `Générer ${pending} dépense${pending > 1 ? "s" : ""}`
          : "Tout est déjà généré"}
      </Button>
    </form>
  );
}

export { fromCents };
