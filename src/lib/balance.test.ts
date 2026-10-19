import assert from "node:assert/strict";
import { test } from "node:test";
import { computeBalances } from "./balance";
import { computeShares } from "./split";
import { allocate, toCents } from "./money";

const A = "user-a";
const B = "user-b";

const shared = (paidById: string, amount: number) => ({
  paidById,
  amount,
  shares: computeShares({
    userAId: A,
    userBId: B,
    amount,
    splitType: "SHARED_50_50" as const,
  }),
});

test("toCents gère la virgule française et les espaces", () => {
  assert.equal(toCents("12,34"), 1234);
  assert.equal(toCents("1 000,05"), 100005);
  assert.equal(toCents(19.99), 1999);
});

test("allocate ne perd jamais un centime", () => {
  assert.deepEqual(allocate(101, [1, 1]), [51, 50]);
  assert.deepEqual(allocate(100, [1, 1]), [50, 50]);
  assert.equal(allocate(9999, [1, 1, 1]).reduce((a, b) => a + b, 0), 9999);
});

test("A paie 100 € partagés → B lui doit 50 €", () => {
  const { balances, transfers } = computeBalances([A, B], [shared(A, 10000)]);
  const a = balances.find((b) => b.userId === A)!;
  const b = balances.find((b) => b.userId === B)!;
  assert.equal(a.net, 5000);
  assert.equal(b.net, -5000);
  assert.deepEqual(transfers, [{ fromUserId: B, toUserId: A, amount: 5000 }]);
});

test("une dépense personnelle n'affecte aucun solde", () => {
  const { transfers } = computeBalances(
    [A, B],
    [
      {
        paidById: A,
        amount: 4200,
        shares: computeShares({
          userAId: A,
          userBId: B,
          amount: 4200,
          splitType: "PERSONAL_A",
        }),
      },
    ],
  );
  assert.deepEqual(transfers, []);
});

test("les dépenses partagées symétriques s'annulent", () => {
  const { transfers } = computeBalances(
    [A, B],
    [shared(A, 10000), shared(B, 10000)],
  );
  assert.deepEqual(transfers, []);
});

test("répartition libre 70/30", () => {
  const shares = computeShares({
    userAId: A,
    userBId: B,
    amount: 10000,
    splitType: "CUSTOM",
    customAmountA: 7000,
  });
  const { balances } = computeBalances([A, B], [{ paidById: B, amount: 10000, shares }]);
  assert.equal(balances.find((b) => b.userId === A)!.net, -7000);
  assert.equal(balances.find((b) => b.userId === B)!.net, 7000);
});

test("un remboursement remet le solde à zéro", () => {
  const { transfers } = computeBalances(
    [A, B],
    [shared(A, 10000)],
    [{ fromUserId: B, toUserId: A, amount: 5000 }],
  );
  assert.deepEqual(transfers, []);
});

test("montant impair : la somme des parts reste exacte", () => {
  const shares = computeShares({
    userAId: A,
    userBId: B,
    amount: 1001,
    splitType: "SHARED_50_50",
  });
  assert.equal(shares.reduce((s, x) => s + x.amount, 0), 1001);
});

test("un montant nul ou négatif est rejeté", () => {
  assert.throws(() =>
    computeShares({ userAId: A, userBId: B, amount: 0, splitType: "SHARED_50_50" }),
  );
});
