import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import type { BalanceResult } from "@/lib/balance";

interface Person {
  id: string;
  name: string;
  color: string;
}

export function BalanceCard({
  balance,
  users,
}: {
  balance: BalanceResult;
  users: Person[];
}) {
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const transfer = balance.transfers[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solde courant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {transfer ? (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              <span>{name(transfer.fromUserId)}</span>
              <ArrowRight className="h-4 w-4 text-[var(--color-muted)]" />
              <span>{name(transfer.toUserId)}</span>
            </div>
            <p className="text-3xl font-semibold tabular-nums text-[var(--color-accent)]">
              {formatCents(transfer.amount)}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Montant à transférer pour équilibrer les dépenses partagées.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Check className="h-5 w-5 text-[var(--color-good)]" />
              Comptes équilibrés
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Personne ne doit rien à l&apos;autre.
            </p>
          </div>
        )}

        <div className="grid gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
          {balance.balances.map((b) => {
            const user = users.find((u) => u.id === b.userId);
            return (
              <div key={b.userId} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: user?.color ?? "#94a3b8" }}
                  aria-hidden
                />
                <span className="text-[var(--color-fg)]">{user?.name ?? "—"}</span>
                <span className="ml-auto tabular-nums text-[var(--color-muted)]">
                  avancé {formatCents(b.paid)} · à sa charge {formatCents(b.owed)}
                </span>
              </div>
            );
          })}
        </div>

        {transfer && (
          <Link
            href="/reglements"
            className="inline-flex text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            Enregistrer un remboursement →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
