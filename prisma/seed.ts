import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { computeShares, type SplitType } from "../src/lib/split";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

// `bucket` : BESOINS (50 %) ou ENVIES (30 %) pour la règle 50/30/20.
// `budget` en centimes : plafond de DÉMO attribué au profil A, null = non suivi.
// Les plafonds sont désormais personnels (table CategoryBudget).
const CATEGORIES = [
  { name: "Courses", icon: "ShoppingCart", color: "#10b981", bucket: "BESOINS", budget: 40000 },
  { name: "Logement", icon: "Home", color: "#6366f1", bucket: "BESOINS", budget: 78000 },
  { name: "Transport", icon: "Bus", color: "#f59e0b", bucket: "BESOINS", budget: 6000 },
  { name: "Restaurants", icon: "UtensilsCrossed", color: "#ef4444", bucket: "ENVIES", budget: 10000 },
  { name: "Loisirs", icon: "Ticket", color: "#a855f7", bucket: "ENVIES", budget: 8000 },
  { name: "Santé", icon: "HeartPulse", color: "#06b6d4", bucket: "BESOINS", budget: null },
  { name: "Abonnements", icon: "Repeat", color: "#ec4899", bucket: "ENVIES", budget: 3000 },
  { name: "Voyages", icon: "Plane", color: "#14b8a6", bucket: "ENVIES", budget: null },
  { name: "Divers", icon: "Tag", color: "#94a3b8", bucket: "BESOINS", budget: null },
];

async function main() {
  const userA = await prisma.user.upsert({
    where: { slot: "A" },
    update: {},
    create: { slot: "A", name: "Utilisateur A", color: "#6366f1", baseIncome: 95000 },
  });
  const userB = await prisma.user.upsert({
    where: { slot: "B" },
    update: {},
    create: { slot: "B", name: "Utilisateur B", color: "#ec4899", baseIncome: 110000 },
  });

  for (const { budget, ...category } of CATEGORIES) {
    const saved = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    if (budget !== null) {
      await prisma.categoryBudget.upsert({
        where: { categoryId_userId: { categoryId: saved.id, userId: userA.id } },
        update: {},
        create: { categoryId: saved.id, userId: userA.id, amount: budget },
      });
    }
  }

  // Modèles récurrents d'exemple (aucune dépense n'est créée tant qu'on ne
  // clique pas sur « Générer » depuis la page Récurrentes).
  if ((await prisma.recurringExpense.count()) === 0) {
    const cats = await prisma.category.findMany();
    const catId = (name: string) => cats.find((c) => c.name === name)!.id;
    await prisma.recurringExpense.createMany({
      data: [
        { title: "Loyer", amount: 78000, dayOfMonth: 1, splitType: "SHARED_50_50", categoryId: catId("Logement"), paidById: userB.id },
        { title: "Netflix + Spotify", amount: 2398, dayOfMonth: 11, splitType: "SHARED_50_50", categoryId: catId("Abonnements"), paidById: userA.id },
        { title: "Abonnement TCL", amount: 3450, dayOfMonth: 3, splitType: "PERSONAL_A", categoryId: catId("Transport"), paidById: userA.id },
      ],
    });
  }

  // Revenus variables d'exemple (cours particuliers, freelance…)
  if ((await prisma.income.count()) === 0) {
    const now = new Date();
    const on = (monthOffset: number, day: number) =>
      new Date(now.getFullYear(), now.getMonth() - monthOffset, day, 12);
    await prisma.income.createMany({
      data: [
        { amount: 12000, date: on(0, 5), source: "Cours particuliers", userId: userA.id },
        { amount: 8000, date: on(0, 12), source: "Cours particuliers", userId: userA.id },
        { amount: 25000, date: on(1, 8), source: "Freelance", userId: userA.id },
        { amount: 9000, date: on(1, 22), source: "Cours particuliers", userId: userA.id },
        { amount: 6000, date: on(2, 14), source: "Cours particuliers", userId: userA.id },
        { amount: 15000, date: on(2, 28), source: "Prime", userId: userB.id },
        { amount: 11000, date: on(3, 9), source: "Cours particuliers", userId: userA.id },
      ],
    });
  }

  const existing = await prisma.expense.count();
  if (existing > 0) {
    console.log(`Seed terminé (${existing} dépenses déjà présentes, aucun exemple ajouté).`);
    return;
  }

  const categories = await prisma.category.findMany();
  const byName = (name: string) => categories.find((c) => c.name === name)!.id;
  const today = new Date();
  /** Date d'exemple : `monthOffset` mois en arrière, jour `day`. */
  const at = (monthOffset: number, day: number) =>
    new Date(today.getFullYear(), today.getMonth() - monthOffset, day, 12);

  const samples: {
    title: string;
    amount: number;
    category: string;
    paidBy: "A" | "B";
    splitType: SplitType;
    customAmountA?: number;
    monthOffset: number;
    day: number;
  }[] = [
    // Mois en cours
    { title: "Courses Carrefour", amount: 8450, category: "Courses", paidBy: "A", splitType: "SHARED_50_50", monthOffset: 0, day: 2 },
    { title: "Loyer", amount: 78000, category: "Logement", paidBy: "B", splitType: "SHARED_50_50", monthOffset: 0, day: 1 },
    { title: "Abonnement TCL", amount: 3450, category: "Transport", paidBy: "A", splitType: "PERSONAL_A", monthOffset: 0, day: 3 },
    { title: "Restaurant italien", amount: 5620, category: "Restaurants", paidBy: "B", splitType: "SHARED_50_50", monthOffset: 0, day: 6 },
    { title: "Cinéma", amount: 2400, category: "Loisirs", paidBy: "A", splitType: "SHARED_50_50", monthOffset: 0, day: 8 },
    { title: "Pharmacie", amount: 1890, category: "Santé", paidBy: "B", splitType: "PERSONAL_B", monthOffset: 0, day: 9 },
    { title: "Netflix + Spotify", amount: 2398, category: "Abonnements", paidBy: "A", splitType: "SHARED_50_50", monthOffset: 0, day: 11 },
    { title: "Week-end Annecy", amount: 18000, category: "Voyages", paidBy: "A", splitType: "CUSTOM", customAmountA: 12000, monthOffset: 0, day: 14 },
    { title: "Boulangerie", amount: 1240, category: "Courses", paidBy: "B", splitType: "SHARED_50_50", monthOffset: 0, day: 16 },
    // Historique (pour le graphique d'évolution)
    { title: "Loyer", amount: 78000, category: "Logement", paidBy: "B", splitType: "SHARED_50_50", monthOffset: 1, day: 1 },
    { title: "Courses du mois", amount: 21500, category: "Courses", paidBy: "A", splitType: "SHARED_50_50", monthOffset: 1, day: 12 },
    { title: "Randonnée Vercors", amount: 6400, category: "Loisirs", paidBy: "A", splitType: "SHARED_50_50", monthOffset: 1, day: 20 },
    { title: "Loyer", amount: 78000, category: "Logement", paidBy: "B", splitType: "SHARED_50_50", monthOffset: 2, day: 1 },
    { title: "Courses du mois", amount: 19800, category: "Courses", paidBy: "B", splitType: "SHARED_50_50", monthOffset: 2, day: 10 },
    { title: "Consultation médecin", amount: 2500, category: "Santé", paidBy: "A", splitType: "PERSONAL_A", monthOffset: 2, day: 18 },
    { title: "Loyer", amount: 78000, category: "Logement", paidBy: "B", splitType: "SHARED_50_50", monthOffset: 3, day: 1 },
    { title: "Courses du mois", amount: 23100, category: "Courses", paidBy: "A", splitType: "SHARED_50_50", monthOffset: 3, day: 14 },
  ];

  for (const s of samples) {
    const shares = computeShares({
      userAId: userA.id,
      userBId: userB.id,
      amount: s.amount,
      splitType: s.splitType,
      customAmountA: s.customAmountA,
    });
    await prisma.expense.create({
      data: {
        title: s.title,
        amount: s.amount,
        date: at(s.monthOffset, s.day),
        splitType: s.splitType,
        categoryId: byName(s.category),
        paidById: s.paidBy === "A" ? userA.id : userB.id,
        shares: { create: shares.map((x) => ({ userId: x.userId, amount: x.amount })) },
      },
    });
  }

  console.log(`Seed terminé : 2 utilisateurs, ${CATEGORIES.length} catégories, 3 modèles récurrents, ${samples.length} dépenses d'exemple.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
