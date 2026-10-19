import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fromCents } from "@/lib/money";
import { toDateInputValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Échappement CSV : guillemets doublés, champ toujours entre guillemets. */
function cell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function GET() {
  const [expenses, users] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { date: "asc" },
      include: { category: true, paidBy: true, shares: { include: { user: true } } },
    }),
    prisma.user.findMany({ orderBy: { slot: "asc" } }),
  ]);

  const header = [
    "date",
    "intitule",
    "montant_eur",
    "categorie",
    "bucket",
    "paye_par",
    "repartition",
    ...users.map((u) => `part_${u.name}_eur`),
    "note",
  ];

  const rows = expenses.map((e) => {
    const shareFor = (userId: string) =>
      fromCents(e.shares.find((s) => s.userId === userId)?.amount ?? 0);
    return [
      toDateInputValue(e.date),
      e.title,
      fromCents(e.amount).toFixed(2),
      e.category.name,
      e.category.bucket,
      e.paidBy.name,
      e.splitType,
      ...users.map((u) => shareFor(u.id).toFixed(2)),
      e.note ?? "",
    ];
  });

  // BOM UTF-8 : sans lui, Excel casse les accents à l'ouverture.
  const csv =
    "﻿" +
    [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") +
    "\r\n";

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="depenses-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
