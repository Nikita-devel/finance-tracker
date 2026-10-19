"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorInput, Input, Label, Select } from "@/components/ui/field";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  updateIncomes,
  updateUsers,
  type ActionState,
} from "@/app/actions";
import { fromCents } from "@/lib/money";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="anim-in rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-crit)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-crit)]">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return <p className="text-xs text-[var(--color-good)]">Enregistré.</p>;
  }
  return null;
}

export function UsersForm({
  userA,
  userB,
}: {
  userA: { name: string; color: string };
  userB: { name: string; color: string };
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateUsers, {
    ok: false,
  });

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            { slot: "A", user: userA },
            { slot: "B", user: userB },
          ] as const
        ).map(({ slot, user }) => (
          <div key={slot} className="space-y-3 rounded-lg border border-[var(--color-border)] p-3">
            <p className="text-xs font-semibold text-[var(--color-muted)]">
              Utilisateur {slot}
            </p>
            <div>
              <Label htmlFor={`name${slot}`}>Nom</Label>
              <Input
                id={`name${slot}`}
                name={`name${slot}`}
                required
                maxLength={40}
                defaultValue={user.name}
              />
            </div>
            <div>
              <Label htmlFor={`color${slot}`}>Couleur</Label>
              <ColorInput id={`color${slot}`} name={`color${slot}`} defaultValue={user.color} />
            </div>
          </div>
        ))}
      </div>
      <Feedback state={state} />
      <Submit label="Enregistrer les utilisateurs" />
    </form>
  );
}

export function CategoryForm() {
  const [state, action] = useActionState<ActionState, FormData>(createCategory, {
    ok: false,
  });
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor="category-name">Nom de la catégorie</Label>
          <Input id="category-name" name="name" required maxLength={40} />
        </div>
        <div>
          <Label htmlFor="category-color">Couleur</Label>
          <ColorInput id="category-color" name="color" defaultValue="#4f46e5" />
        </div>
        <Submit label="Ajouter" />
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function IncomeForm({
  userA,
  userB,
}: {
  userA: { name: string; baseIncome: number };
  userB: { name: string; baseIncome: number };
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateIncomes, {
    ok: false,
  });

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="incomeA">Revenu récurrent — {userA.name} (€)</Label>
          <Input
            id="incomeA"
            name="incomeA"
            inputMode="decimal"
            defaultValue={userA.baseIncome ? String(fromCents(userA.baseIncome)) : ""}
            placeholder="0,00"
          />
        </div>
        <div>
          <Label htmlFor="incomeB">Revenu récurrent — {userB.name} (€)</Label>
          <Input
            id="incomeB"
            name="incomeB"
            inputMode="decimal"
            defaultValue={userB.baseIncome ? String(fromCents(userB.baseIncome)) : ""}
            placeholder="0,00"
          />
        </div>
      </div>
      <Feedback state={state} />
      <Submit label="Enregistrer la base" />
    </form>
  );
}

export function CategoryEditRow({
  category,
  names,
}: {
  category: {
    id: string;
    name: string;
    color: string;
    bucket: string;
    budgetA: number | null;
    budgetB: number | null;
    count: number;
  };
  names: { a: string; b: string };
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateCategory, {
    ok: false,
  });

  return (
    <li className="py-3">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={category.id} />
        <div className="min-w-[10rem] flex-1">
          <Label htmlFor={`cat-name-${category.id}`}>Nom</Label>
          <Input
            id={`cat-name-${category.id}`}
            name="name"
            defaultValue={category.name}
            required
            maxLength={40}
          />
        </div>
        <div>
          <Label htmlFor={`cat-color-${category.id}`}>Couleur</Label>
          <ColorInput id={`cat-color-${category.id}`} name="color" defaultValue={category.color} />
        </div>
        <div className="w-40">
          <Label htmlFor={`cat-bucket-${category.id}`}>Règle 50/30/20</Label>
          <Select
            id={`cat-bucket-${category.id}`}
            name="bucket"
            defaultValue={category.bucket}
          >
            <option value="BESOINS">Besoins (50 %)</option>
            <option value="ENVIES">Envies (30 %)</option>
          </Select>
        </div>
        <div className="w-32">
          <Label htmlFor={`cat-budget-a-${category.id}`}>
            Plafond {names.a} (€)
          </Label>
          <Input
            id={`cat-budget-a-${category.id}`}
            name="budgetA"
            inputMode="decimal"
            defaultValue={
              category.budgetA !== null ? String(fromCents(category.budgetA)) : ""
            }
            placeholder="aucun"
          />
        </div>
        <div className="w-32">
          <Label htmlFor={`cat-budget-b-${category.id}`}>
            Plafond {names.b} (€)
          </Label>
          <Input
            id={`cat-budget-b-${category.id}`}
            name="budgetB"
            inputMode="decimal"
            defaultValue={
              category.budgetB !== null ? String(fromCents(category.budgetB)) : ""
            }
            placeholder="aucun"
          />
        </div>
        <Submit label="OK" />
      </form>

      <div className="mt-1.5 flex items-center gap-3">
        <span className="text-xs text-[var(--color-muted)]">
          {category.count} dépense{category.count > 1 ? "s" : ""}
        </span>
        {state.error && (
          <span className="text-xs text-[var(--color-crit)]">{state.error}</span>
        )}
        {state.ok && <span className="text-xs text-[var(--color-good)]">Enregistré.</span>}
        <form action={deleteCategory} className="ml-auto">
          <input type="hidden" name="id" value={category.id} />
          <Button
            variant="ghost"
            size="icon"
            type="submit"
            aria-label="Supprimer"
            disabled={category.count > 0}
            title={
              category.count > 0
                ? "Impossible : des dépenses utilisent cette catégorie"
                : "Supprimer"
            }
          >
            <Trash2 className="h-4 w-4 text-[var(--color-crit)]" />
          </Button>
        </form>
      </div>
    </li>
  );
}
