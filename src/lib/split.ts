import { allocate } from "./money";

export const SPLIT_TYPES = [
  "PERSONAL_A",
  "PERSONAL_B",
  "SHARED_50_50",
  "SHARED_60_40",
  "CUSTOM",
] as const;

export type SplitType = (typeof SPLIT_TYPES)[number];

export const SPLIT_LABELS: Record<SplitType, string> = {
  PERSONAL_A: "Personnel — A",
  PERSONAL_B: "Personnel — B",
  SHARED_50_50: "Partagé 50/50",
  SHARED_60_40: "Partagé 60/40 (personne A 60 %)",
  CUSTOM: "Répartition libre",
};

export function splitLabel(
  splitType: SplitType,
  userA?: string,
  userB?: string,
): string {
  switch (splitType) {
    case "PERSONAL_A":
      return `Personnel — ${userA ?? "A"}`;
    case "PERSONAL_B":
      return `Personnel — ${userB ?? "B"}`;
    case "SHARED_50_50":
      return "Partagé 50/50";
    case "SHARED_60_40":
      return "Partagé 60/40 (personne A 60 %)";
    case "CUSTOM":
      return "Répartition libre";
  }
}

export interface ShareInput {
  /** id de l'utilisateur occupant le slot "A" */
  userAId: string;
  /** id de l'utilisateur occupant le slot "B" */
  userBId: string;
  /** montant total en centimes */
  amount: number;
  splitType: SplitType;
  /** requis uniquement pour CUSTOM : part de A en centimes */
  customAmountA?: number;
}

export interface ComputedShare {
  userId: string;
  amount: number;
}

/**
 * Traduit un type de répartition en parts concrètes par utilisateur.
 * Invariant : la somme des parts renvoyées vaut exactement `amount`.
 */
export function computeShares(input: ShareInput): ComputedShare[] {
  const { userAId, userBId, amount, splitType } = input;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Le montant doit être un entier de centimes strictement positif.");
  }

  switch (splitType) {
    case "PERSONAL_A":
      return [{ userId: userAId, amount }];

    case "PERSONAL_B":
      return [{ userId: userBId, amount }];

    case "SHARED_50_50": {
      const [a, b] = allocate(amount, [1, 1]);
      return [
        { userId: userAId, amount: a },
        { userId: userBId, amount: b },
      ];
    }

    case "SHARED_60_40": {
      // Slot A (60 %), slot B (40 %).
      const [a, b] = allocate(amount, [60, 40]);
      return [
        { userId: userAId, amount: a },
        { userId: userBId, amount: b },
      ];
    }

    case "CUSTOM": {
      const a = input.customAmountA;
      if (a === undefined || !Number.isInteger(a) || a < 0 || a > amount) {
        throw new Error(
          "La part personnalisée doit être comprise entre 0 et le montant total.",
        );
      }
      const shares: ComputedShare[] = [];
      if (a > 0) shares.push({ userId: userAId, amount: a });
      if (amount - a > 0) shares.push({ userId: userBId, amount: amount - a });
      return shares;
    }
  }
}
