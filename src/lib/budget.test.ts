import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeBudgetLines,
  computeRule503020,
  monthProgress,
  savingsRate,
  totalIncome,
} from "./budget";

test("monthProgress : passé = 1, futur = 0, courant = prorata", () => {
  const now = new Date(2026, 8, 15); // 15 septembre 2026 (30 jours)
  assert.equal(monthProgress("2026-08", now), 1);
  assert.equal(monthProgress("2026-10", now), 0);
  assert.equal(monthProgress("2026-09", now), 15 / 30);
});

test("monthProgress gère février bissextile", () => {
  assert.equal(monthProgress("2028-02", new Date(2028, 1, 29)), 1); // 29/29
});

const cats = [
  { id: "c1", name: "Courses", budget: 30000, spent: 10000 },
  { id: "c2", name: "Loisirs", budget: 10000, spent: 9000 },
  { id: "c3", name: "Restaurants", budget: 8000, spent: 9500 },
  { id: "c4", name: "Divers", budget: null, spent: 5000 },
];

test("les catégories sans plafond sont ignorées", () => {
  const lines = computeBudgetLines(cats, 0.5);
  assert.equal(lines.length, 3);
  assert.ok(!lines.some((l) => l.id === "c4"));
});

test("statuts : ok / warning / critical à mi-mois", () => {
  const lines = computeBudgetLines(cats, 0.5);
  const by = (id: string) => lines.find((l) => l.id === id)!;
  // 100 € sur 300 € à mi-mois : rythme attendu 150 € → sous le rythme
  assert.equal(by("c1").status, "ok");
  // 90 € sur 100 € à mi-mois : rythme attendu 50 € → en avance, mais pas dépassé
  assert.equal(by("c2").status, "warning");
  // 95 € sur 80 € : dépassé
  assert.equal(by("c3").status, "critical");
  assert.equal(by("c3").overBy, 1500);
  assert.equal(by("c3").remaining, 0);
});

test("tri par ratio décroissant : le plus critique en premier", () => {
  const lines = computeBudgetLines(cats, 0.5);
  assert.deepEqual(lines.map((l) => l.id), ["c3", "c2", "c1"]);
});

test("en début de mois, dépasser le rythme alerte tout de suite", () => {
  const early = [{ id: "x", name: "X", budget: 10000, spent: 500 }];
  // Jour 1 sur 30 : rythme attendu ≈ 3,33 € ; 5 € dépensés → en avance.
  assert.equal(computeBudgetLines(early, 1 / 30)[0].status, "warning");
  // 1 € dépensé le même jour → sous le rythme, aucune alerte.
  assert.equal(
    computeBudgetLines([{ ...early[0], spent: 100 }], 1 / 30)[0].status,
    "ok",
  );
});

test("mois clos : le rythme vaut le plafond entier", () => {
  const lines = computeBudgetLines(
    [{ id: "x", name: "X", budget: 10000, spent: 9999 }],
    1,
  );
  assert.equal(lines[0].pace, 10000);
  assert.equal(lines[0].status, "ok");
});

test("50/30/20 : sans revenu, pas de règle", () => {
  assert.equal(computeRule503020({ income: 0, besoins: 100, envies: 50 }), null);
});

test("50/30/20 : répartition exacte est respectée", () => {
  const r = computeRule503020({
    income: 200000,
    besoins: 100000,
    envies: 60000,
  })!;
  assert.equal(r.epargne, 40000);
  assert.equal(r.respected, true);
  assert.deepEqual(
    r.buckets.map((b) => b.share),
    [0.5, 0.3, 0.2],
  );
});

test("50/30/20 : trop d'envies casse la règle et l'épargne", () => {
  const r = computeRule503020({
    income: 200000,
    besoins: 100000,
    envies: 90000,
  })!;
  assert.equal(r.epargne, 10000);
  assert.equal(r.buckets.find((b) => b.key === "envies")!.respected, false);
  assert.equal(r.buckets.find((b) => b.key === "epargne")!.respected, false);
  assert.equal(r.buckets.find((b) => b.key === "besoins")!.respected, true);
  assert.equal(r.respected, false);
});

test("50/30/20 : l'épargne peut être négative (on vit au-dessus de ses moyens)", () => {
  const r = computeRule503020({
    income: 100000,
    besoins: 80000,
    envies: 40000,
  })!;
  assert.equal(r.epargne, -20000);
  assert.equal(r.buckets.find((b) => b.key === "epargne")!.respected, false);
});

test("totalIncome additionne base et encaissements variables", () => {
  assert.equal(totalIncome([120000, 0], []), 120000);
  assert.equal(
    totalIncome([120000, 0], [{ amount: 4500 }, { amount: 12000 }]),
    136500,
  );
  assert.equal(totalIncome([0, 0], []), 0);
});

test("savingsRate : null sans revenu, négatif en déficit", () => {
  assert.equal(savingsRate(0, 5000), null);
  assert.equal(savingsRate(200000, 150000), 0.25);
  assert.equal(savingsRate(100000, 130000), -0.3);
});
