"use client";

import { useTransition } from "react";
import { setActiveSlot } from "@/app/actions";
import { cn } from "@/lib/utils";

interface Person {
  name: string;
  color: string;
}

export function UserSwitcher({
  userA,
  userB,
  activeSlot,
}: {
  userA: Person | null;
  userB: Person | null;
  activeSlot: "A" | "B";
}) {
  const [pending, startTransition] = useTransition();

  const select = (slot: "A" | "B") => {
    if (slot === activeSlot) return;
    const data = new FormData();
    data.set("slot", slot);
    startTransition(() => {
      void setActiveSlot(data);
    });
  };

  const options: { slot: "A" | "B"; person: Person | null }[] = [
    { slot: "A", person: userA },
    { slot: "B", person: userB },
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] p-1",
        pending && "opacity-60",
      )}
      title="Profil actif : plafonds, part du mois, pré-remplissage des formulaires"
    >
      {options.map(({ slot, person }) => {
        const active = slot === activeSlot;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => select(slot)}
            disabled={pending}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-[var(--color-surface)] shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: person?.color ?? "#94a3b8" }}
            />
            {person?.name ?? `Utilisateur ${slot}`}
          </button>
        );
      })}
    </div>
  );
}
