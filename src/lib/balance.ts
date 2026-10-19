/**
 * Moteur de règlement — 100 % pur, sans dépendance à Prisma ni à React.
 * Testable isolément (voir src/lib/balance.test.ts).
 */

export interface BalanceExpense {
  paidById: string;
  amount: number; // centimes
  shares: { userId: string; amount: number }[];
}

export interface BalanceSettlement {
  fromUserId: string;
  toUserId: string;
  amount: number; // centimes
}

export interface UserBalance {
  userId: string;
  /** Total avancé par l'utilisateur (dépenses qu'il a payées). */
  paid: number;
  /** Total réellement à sa charge (somme de ses parts). */
  owed: number;
  /** Solde net = payé − dû + remboursements reçus/envoyés. > 0 : on lui doit de l'argent. */
  net: number;
}

export interface Transfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface BalanceResult {
  balances: UserBalance[];
  /** Transferts minimaux pour remettre tous les soldes à zéro. */
  transfers: Transfer[];
}

export function computeBalances(
  userIds: string[],
  expenses: BalanceExpense[],
  settlements: BalanceSettlement[] = [],
): BalanceResult {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  const net = new Map<string, number>();
  for (const id of userIds) {
    paid.set(id, 0);
    owed.set(id, 0);
    net.set(id, 0);
  }

  const bump = (map: Map<string, number>, key: string, delta: number) => {
    if (!map.has(key)) map.set(key, 0);
    map.set(key, (map.get(key) as number) + delta);
  };

  for (const expense of expenses) {
    bump(paid, expense.paidById, expense.amount);
    bump(net, expense.paidById, expense.amount);
    for (const share of expense.shares) {
      bump(owed, share.userId, share.amount);
      bump(net, share.userId, -share.amount);
    }
  }

  // Un remboursement de X vers Y : X se décharge de sa dette, Y récupère son avance.
  for (const s of settlements) {
    bump(net, s.fromUserId, s.amount);
    bump(net, s.toUserId, -s.amount);
  }

  const balances: UserBalance[] = [...net.keys()].map((userId) => ({
    userId,
    paid: paid.get(userId) ?? 0,
    owed: owed.get(userId) ?? 0,
    net: net.get(userId) ?? 0,
  }));

  return { balances, transfers: minimalTransfers(balances) };
}

/**
 * Algorithme glouton de compensation des dettes.
 * Pour deux utilisateurs il produit toujours 0 ou 1 transfert ; il reste
 * correct si un troisième utilisateur est ajouté plus tard.
 */
export function minimalTransfers(balances: UserBalance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ userId: b.userId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ userId: b.userId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0) {
      transfers.push({
        fromUserId: debtors[i].userId,
        toUserId: creditors[j].userId,
        amount,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount === 0) i += 1;
    if (creditors[j].amount === 0) j += 1;
  }
  return transfers;
}
