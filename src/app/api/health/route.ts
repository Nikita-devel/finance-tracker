import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Sonde de santé : healthcheck Docker et siteMonitor Homepage.
 * Touche réellement la base — un conteneur qui répond alors que le volume
 * n'est pas monté serait un faux positif.
 */
export async function GET() {
  try {
    const [users, expenses] = await Promise.all([
      prisma.user.count(),
      prisma.expense.count(),
    ]);
    return NextResponse.json(
      { status: "ok", users, expenses, at: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "erreur inconnue",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
