"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { createIncome, deleteIncome, type ActionState } from "@/app/actions";
import { INCOME_SOURCES } from "@/lib/budget";
import { formatCents } from "@/lib/money";
import { formatDate, toDateInputValue } from "@/lib/utils";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "…" : "Ajouter le revenu"}
    </Button>
  );
}

export function IncomeEntryForm({
  userAName,
  userBName,
  activeSlot,
}: {
  userAName: string;
  userBName: string;
  activeSlot: "A" | "B";
}) {
  const [state, action] = useActionState<ActionState, FormData>(createIncome, {
    ok: false,
  });
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="income-amount">Montant (€)</Label>
          <Input
            id="income-amount"
            name="amount"
            required
            inputMode="decimal"
            placeholder="0,00"
          />
        </div>
        <div>
          <Label htmlFor="income-date">Date d&apos;encaissement</Label>
          <Input
            id="income-date"
            name="date"
            type="date"
            required
            defaultValue={toDateInputValue(new Date())}
          />
        </div>
        <div>
          <Label htmlFor="income-source">Source</Label>
          <Input
            id="income-source"
            name="source"
            required
            maxLength={60}
            list="income-sources"
            defaultValue={INCOME_SOURCES[0]}
          />
          <datalist id="income-sources">
            {INCOME_SOURCES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="income-user">Pour</Label>
          <Select id="income-user" name="userSlot" defaultValue={activeSlot}>
            <option value="A">{userAName}</option>
            <option value="B">{userBName}</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="income-note">Note (facultatif)</Label>
          <Input id="income-note" name="note" maxLength={500} />
        </div>
      </div>

      {state.error && (
        <p className="anim-in rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-crit)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-crit)]">
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}

export interface IncomeRow {
  id: string;
  amount: number;
  date: string;
  source: string;
  note: string | null;
  userName: string;
  userColor: string;
}

export function IncomeList({ rows }: { rows: IncomeRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-muted)]">
        Aucun revenu variable ce mois-ci. Seule la base récurrente est comptée.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: r.userColor }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{r.source}</p>
            <p className="text-xs text-[var(--color-muted)]">
              {formatDate(new Date(`${r.date}T12:00:00`))} · {r.userName}
              {r.note ? ` · ${r.note}` : ""}
            </p>
          </div>
          <span className="tabular-nums font-semibold">{formatCents(r.amount)}</span>
          <form action={deleteIncome}>
            <input type="hidden" name="id" value={r.id} />
            <Button variant="ghost" size="icon" type="submit" aria-label="Supprimer">
              <Trash2 className="h-4 w-4 text-[var(--color-crit)]" />
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
