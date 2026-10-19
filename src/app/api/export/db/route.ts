import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Télécharge une copie du fichier SQLite.
 * Route locale uniquement — l'application n'est pas exposée hors de la machine.
 */
export async function GET() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const relative = url.replace(/^file:/, "");
  const absolute = path.isAbsolute(relative)
    ? relative
    : path.join(process.cwd(), relative);

  try {
    const buffer = await readFile(absolute);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="finance-tracker-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Base introuvable. Lancez `npx prisma migrate deploy`." },
      { status: 404 },
    );
  }
}
