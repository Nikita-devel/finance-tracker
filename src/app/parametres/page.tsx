import { Database, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  CategoryEditRow,
  CategoryForm,
  IncomeForm,
  UsersForm,
} from "@/components/settings-forms";
import { prisma } from "@/lib/db";
import { getUsers } from "@/lib/session";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [users, categories] = await Promise.all([
    getUsers(),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { expenses: true } },
        budgets: { select: { userId: true, amount: true } },
      },
    }),
  ]);

  if (!users.userA || !users.userB) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Base non initialisée</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--color-muted)]">
          Lancez <code className="rounded bg-[var(--color-bg)] px-1.5 py-0.5">npm run db:seed</code>{" "}
          pour créer les deux utilisateurs et les catégories par défaut.
        </CardContent>
      </Card>
    );
  }

  // Extrait APRÈS le garde : le rétrécissement de type ne survit pas dans les
  // callbacks (map), alors qu'une const, si.
  const { userA, userB } = users;
  const baseTotal = userA.baseIncome + userB.baseIncome;

  return (
    <div className="space-y-5">
      <h1 className="t-page">Paramètres</h1>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>
            Deux profils fixes (A et B) — renommez-les librement. Aucun mot de passe :
            l&apos;application est locale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersForm
            userA={{ name: userA.name, color: userA.color }}
            userB={{ name: userB.name, color: userB.color }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenu récurrent</CardTitle>
          <CardDescription>
            Part STABLE du revenu net (bourse, APL, aide familiale) : {formatCents(baseTotal)}
            par mois pour le foyer. Les revenus variables — cours, freelance, primes —
            se saisissent dans <strong>Revenus</strong>, un encaissement à la fois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncomeForm
            userA={{ name: userA.name, baseIncome: userA.baseIncome }}
            userB={{ name: userB.name, baseIncome: userB.baseIncome }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catégories, plafonds et règle 50/30/20</CardTitle>
          <CardDescription>
            Un plafond par personne : ce qui est compté est sa <strong>part</strong> des
            dépenses du mois, pas ce qu&apos;elle a avancé. Laissez vide pour ne pas
            suivre la catégorie pour cette personne. Une catégorie utilisée par au
            moins une dépense ne peut pas être supprimée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CategoryForm />
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {categories.map((c) => (
              <CategoryEditRow
                key={c.id}
                category={{
                  id: c.id,
                  name: c.name,
                  color: c.color,
                  bucket: c.bucket,
                  budgetA:
                    c.budgets.find((b) => b.userId === userA.id)?.amount ?? null,
                  budgetB:
                    c.budgets.find((b) => b.userId === userB.id)?.amount ?? null,
                  count: c._count.expenses,
                }}
                names={{ a: userA.name, b: userB.name }}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sauvegarde</CardTitle>
          <CardDescription>
            Toutes vos données tiennent dans un fichier SQLite. Exportez-le
            régulièrement — le perdre, c&apos;est tout perdre.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a
            href="/api/export/db"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium hover:bg-[var(--color-bg)]"
          >
            <Database className="h-4 w-4" />
            Télécharger la base (.db)
          </a>
          <a
            href="/api/export/csv"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium hover:bg-[var(--color-bg)]"
          >
            <FileDown className="h-4 w-4" />
            Exporter les dépenses (.csv)
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
