import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE = "active-user-slot";

/** Les deux utilisateurs, toujours ordonnés A puis B. */
export async function getUsers() {
  const users = await prisma.user.findMany({ orderBy: { slot: "asc" } });
  return {
    userA: users.find((u) => u.slot === "A") ?? null,
    userB: users.find((u) => u.slot === "B") ?? null,
    all: users,
  };
}

/** Slot actif choisi dans l'en-tête (cookie local, pas d'authentification). */
export async function getActiveSlot(): Promise<"A" | "B"> {
  const store = await cookies();
  return store.get(COOKIE)?.value === "B" ? "B" : "A";
}

export { COOKIE as ACTIVE_USER_COOKIE };
