import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateExpression } from "./calc";

const round2 = (n: number) => Math.round(n * 100) / 100;

test("priorité des opérateurs et parenthèses", () => {
  assert.equal(round2(evaluateExpression("12,5 + 8,3 * 2")), 29.1);
  assert.equal(evaluateExpression("(10 + 5) / 3"), 5);
});

test("moins unaire", () => {
  assert.equal(evaluateExpression("2 * -3"), -6);
});

test("rejette les entrées invalides", () => {
  assert.throws(() => evaluateExpression(""));
  assert.throws(() => evaluateExpression("2 +"));
  assert.throws(() => evaluateExpression("abc"));
  assert.throws(() => evaluateExpression("1/0"));
  assert.throws(() => evaluateExpression("(1+2"));
  assert.throws(() => evaluateExpression("1.2.3"));
  assert.throws(() => evaluateExpression("process.exit()"));
});
