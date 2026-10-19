import { test } from "node:test";
import assert from "node:assert/strict";
import { computeShares } from "./split";

const base = { userAId: "A", userBId: "B" };
const total = (s: { amount: number }[]) => s.reduce((a, x) => a + x.amount, 0);

test("60/40 sur un montant rond", () => {
  assert.deepEqual(
    computeShares({ ...base, amount: 10000, splitType: "SHARED_60_40" }),
    [
      { userId: "A", amount: 6000 },
      { userId: "B", amount: 4000 },
    ],
  );
});

test("60/40 sans perte de centime", () => {
  const s = computeShares({ ...base, amount: 1001, splitType: "SHARED_60_40" });
  assert.equal(total(s), 1001);
  assert.equal(s[0].amount, 601);
});

test("50/50 inchangé", () => {
  const s = computeShares({ ...base, amount: 1001, splitType: "SHARED_50_50" });
  assert.equal(total(s), 1001);
  assert.equal(s[0].amount, 501);
});
