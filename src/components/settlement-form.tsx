"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { createSettlement, type ActionState } from "@/app/actions";
import { fromCents } from "@/lib/money";
import { toDateInputValue } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer le remboursement"}
    </Button>
  );
}

export function SettlementForm({
  userAName,
  userBName,
  activeSlot,
  suggestion,
}: {
  userAName: string;
  userBName: string;
  activeSlot: "A" | "B";
  suggestion?: { fromSlot: "A" | "B"; amount: number } | null;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createSettlement,
    { ok: false },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState(
    suggestion ? String(fromCents(suggestion.amount)) : "",
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setAmount("");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="fromSlot">Qui rembourse</Label>
          <Select
            id="fromSlot"
            name="fromSlot"
            defaultValue={suggestion?.fromSlot ?? activeSlot}
          >
            <option value="A">{userAName}</option>
            <option value="B">{userBName}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="settlement-amount">Montant (€)</Label>
          <Input
            id="settlement-amount"
            name="amount"
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div>
          <Label htmlFor="settlement-date">Date</Label>
          <Input
            id="settlement-date"
            name="date"
            type="date"
            required
            defaultValue={toDateInputValue(new Date())}
          />
        </div>
        <div>
          <Label htmlFor="settlement-note">Note (facultatif)</Label>
          <Input id="settlement-note" name="note" maxLength={500} placeholder="Virement, espèces…" />
        </div>
      </div>

      {state.error && (
        <p className="anim-in rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-crit)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-crit)]">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
