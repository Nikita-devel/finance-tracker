import { ArrowRight, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BalanceCard } from "@/components/balance-card";
import { SettlementForm } from "@/components/settlement-form";
import { deleteSettlement } from "@/app/actions";
import { getGlobalBalance, getSettlements } from "@/lib/queries";
import { getActiveSlot, getUsers } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const [balance, settlements, users, activeSlot] = await Promise.all([
    getGlobalBalance(),
    getSettlements(),
    getUsers(),
    getActiveSlot(),
  ]);

  const userAName = users.userA?.name ?? "Utilisateur A";
  const userBName = users.userB?.name ?? "Utilisateur B";

  const transfer = balance.transfers[0];
  const suggestion = transfer
    ? {
        fromSlot:
          users.all.find((u) => u.id === transfer.fromUserId)?.slot === "B"
            ? ("B" as const)
            : ("A" as const),
        amount: transfer.amount,
      }
    : null;

  return (
    <div className="space-y-5">
      <h1 className="t-page">Règlements</h1>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <BalanceCard
          balance={balance}
          users={users.all.map((u) => ({ id: u.id, name: u.name, color: u.color }))}
        />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Nouveau remboursement</CardTitle>
            <CardDescription>
              {suggestion
                ? "Le montant est pré-rempli avec le solde à équilibrer."
                : "Les comptes sont déjà équilibrés."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettlementForm
              userAName={userAName}
              userBName={userBName}
              activeSlot={activeSlot}
              suggestion={suggestion}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des remboursements</CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-muted)]">
              Aucun remboursement enregistré.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {settlements.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <span>{s.fromUser.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                    <span>{s.toUser.name}</span>
                  </div>
                  <span className="text-xs text-[var(--color-muted)]">
                    {formatDate(s.date)}
                    {s.note ? ` · ${s.note}` : ""}
                  </span>
                  <span className="ml-auto tabular-nums font-semibold">
                    {formatCents(s.amount)}
                  </span>
                  <form action={deleteSettlement}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button variant="ghost" size="icon" aria-label="Supprimer" type="submit">
                      <Trash2 className="h-4 w-4 text-[var(--color-crit)]" />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
