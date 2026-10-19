import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { SPLIT_TYPES } from "@/lib/split";

/**
 * Formulaire GET pur : les filtres vivent dans l'URL, donc ils sont partageables,
 * survivent au rafraîchissement et fonctionnent sans JavaScript.
 */
export function ExpenseFilters({
  month,
  categories,
  userAName,
  userBName,
  values,
}: {
  month: string;
  categories: { id: string; name: string }[];
  userAName: string;
  userBName: string;
  values: { q?: string; categoryId?: string; paidBySlot?: string; splitType?: string };
}) {
  const active =
    Boolean(values.q) ||
    Boolean(values.categoryId) ||
    Boolean(values.paidBySlot) ||
    Boolean(values.splitType);

  const splitLabels: Record<(typeof SPLIT_TYPES)[number], string> = {
    PERSONAL_A: `Personnel — ${userAName}`,
    PERSONAL_B: `Personnel — ${userBName}`,
    SHARED_50_50: "Partagé 50/50",
    SHARED_60_40: "Partagé 60/40 (personne A 60 %)",
    CUSTOM: "Répartition libre",
  };

  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="month" value={month} />

      <div className="min-w-[12rem] flex-1">
        <Label htmlFor="filter-q">Recherche</Label>
        <Input
          id="filter-q"
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="Intitulé ou note…"
        />
      </div>

      <div className="w-40">
        <Label htmlFor="filter-category">Catégorie</Label>
        <Select id="filter-category" name="categoryId" defaultValue={values.categoryId ?? ""}>
          <option value="">Toutes</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-36">
        <Label htmlFor="filter-paid">Payé par</Label>
        <Select id="filter-paid" name="paidBySlot" defaultValue={values.paidBySlot ?? ""}>
          <option value="">Indifférent</option>
          <option value="A">{userAName}</option>
          <option value="B">{userBName}</option>
        </Select>
      </div>

      <div className="w-44">
        <Label htmlFor="filter-split">Répartition</Label>
        <Select id="filter-split" name="splitType" defaultValue={values.splitType ?? ""}>
          <option value="">Toutes</option>
          {SPLIT_TYPES.map((s) => (
            <option key={s} value={s}>
              {splitLabels[s]}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" variant="outline">
        <Search className="h-4 w-4" />
        Filtrer
      </Button>

      {active && (
        <Link
          href={`/depenses?month=${month}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <X className="h-4 w-4" />
          Réinitialiser
        </Link>
      )}
    </form>
  );
}
