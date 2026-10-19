"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { AmountCalculator } from "@/components/amount-calculator";
import { SplitSlider } from "@/components/split-slider";
import { createExpense, updateExpense, type ActionState } from "@/app/actions";
import { fromCents } from "@/lib/money";
import { toDateInputValue } from "@/lib/utils";
import type { SplitType } from "@/lib/split";

export interface ExpenseFormValues {
  id: string;
  title: string;
  amount: number;
  date: string;
  categoryId: string;
  paidBySlot: "A" | "B";
  splitType: SplitType;
  customAmountA?: number;
  note?: string | null;
}

interface Props {
  categories: { id: string; name: string }[];
  userAName: string;
  userBName: string;
  activeSlot: "A" | "B";
  initial?: ExpenseFormValues;
  onDone?: () => void;
  /**
   * Action de création à utiliser à la place de `createExpense`.
   * C'est ce point d'accroche qui permet au panneau parent d'insérer la ligne
   * optimiste avant que le serveur réponde.
   */
  action?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}

function SubmitButton({ label, icon }: { label: string; icon?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : icon ? (
        <Plus className="h-4 w-4" aria-hidden />
      ) : null}
      {pending ? "Enregistrement…" : label}
    </Button>
  );
}

export function ExpenseForm({
  categories,
  userAName,
  userBName,
  activeSlot,
  initial,
  onDone,
  action,
}: Props) {
  const isEdit = Boolean(initial);
  const [state, formAction] = useActionState<ActionState, FormData>(
    isEdit ? updateExpense : (action ?? createExpense),
    { ok: false },
  );

  const [splitType, setSplitType] = useState<SplitType>(
    initial?.splitType ?? "SHARED_50_50",
  );
  const [amount, setAmount] = useState(
    initial ? String(fromCents(initial.amount)) : "",
  );
  const [customA, setCustomA] = useState(
    initial?.customAmountA !== undefined
      ? String(fromCents(initial.customAmountA))
      : "",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!state.ok) return;
    if (!isEdit) {
      formRef.current?.reset();
      setAmount("");
      setCustomA("");
      setSplitType("SHARED_50_50");
    }
    doneRef.current?.();
  }, [state, isEdit]);

  const numericAmount = Number.parseFloat(amount.replace(",", ".")) || 0;
  const numericA = Number.parseFloat(customA.replace(",", ".")) || 0;
  const remainderB = Math.max(0, Math.round((numericAmount - numericA) * 100) / 100);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor={`title-${initial?.id ?? "new"}`}>Intitulé</Label>
          <Input
            id={`title-${initial?.id ?? "new"}`}
            name="title"
            required
            maxLength={120}
            defaultValue={initial?.title}
            placeholder="Courses, loyer, restaurant…"
          />
        </div>

        <div>
          <Label htmlFor={`amount-${initial?.id ?? "new"}`}>Montant (€)</Label>
          <Input
            id={`amount-${initial?.id ?? "new"}`}
            name="amount"
            required
            inputMode="decimal"
            className="tnum"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
          <div className="mt-2">
            <AmountCalculator onApply={(value) => setAmount(value)} />
          </div>
        </div>

        <div>
          <Label htmlFor={`date-${initial?.id ?? "new"}`}>Date</Label>
          <Input
            id={`date-${initial?.id ?? "new"}`}
            name="date"
            type="date"
            required
            defaultValue={initial?.date ?? toDateInputValue(new Date())}
          />
        </div>

        <div>
          <Label htmlFor={`category-${initial?.id ?? "new"}`}>Catégorie</Label>
          <Select
            id={`category-${initial?.id ?? "new"}`}
            name="categoryId"
            required
            defaultValue={initial?.categoryId ?? categories[0]?.id}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor={`paid-${initial?.id ?? "new"}`}>Payé par</Label>
          <Select
            id={`paid-${initial?.id ?? "new"}`}
            name="paidBySlot"
            defaultValue={initial?.paidBySlot ?? activeSlot}
          >
            <option value="A">{userAName}</option>
            <option value="B">{userBName}</option>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor={`split-${initial?.id ?? "new"}`}>Répartition</Label>
          <Select
            id={`split-${initial?.id ?? "new"}`}
            name="splitType"
            value={splitType}
            onChange={(e) => setSplitType(e.target.value as SplitType)}
          >
            <option value="SHARED_50_50">Partagé 50/50</option>
            <option value="SHARED_60_40">Partagé 60/40 (personne A 60 %)</option>
            <option value="PERSONAL_A">Personnel — {userAName}</option>
            <option value="PERSONAL_B">Personnel — {userBName}</option>
            <option value="CUSTOM">Répartition libre</option>
          </Select>
        </div>

        {splitType === "CUSTOM" && (
          <div className="anim-in rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-sunken)] p-3 sm:col-span-2">
            <Label htmlFor={`custom-${initial?.id ?? "new"}`}>
              Part de {userAName} (€)
            </Label>
            <Input
              id={`custom-${initial?.id ?? "new"}`}
              name="customAmountA"
              inputMode="decimal"
              className="tnum"
              value={customA}
              onChange={(e) => setCustomA(e.target.value)}
              placeholder="0,00"
            />
            <SplitSlider
              totalEuros={numericAmount}
              valueAEuros={numericA}
              nameA={userAName}
              nameB={userBName}
              onChange={(v) => setCustomA(v.toFixed(2).replace(".", ","))}
            />
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Reste pour {userBName} :{" "}
              <span className="tnum font-medium text-[var(--color-fg)]">
                {remainderB.toFixed(2).replace(".", ",")} €
              </span>
            </p>
          </div>
        )}

        <div className="sm:col-span-2">
          <Label htmlFor={`note-${initial?.id ?? "new"}`}>Note (facultatif)</Label>
          <Input
            id={`note-${initial?.id ?? "new"}`}
            name="note"
            maxLength={500}
            defaultValue={initial?.note ?? ""}
          />
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="anim-in rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-crit)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-crit)]"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <SubmitButton label={isEdit ? "Enregistrer" : "Ajouter la dépense"} icon={!isEdit} />
        {isEdit && onDone && (
          <Button type="button" variant="outline" onClick={onDone}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
