-- Plafonds par personne : `Category.monthlyBudget` (un seul chiffre partagé)
-- devient `CategoryBudget` (une ligne par couple catégorie/personne).

-- CreateTable
CREATE TABLE "CategoryBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CategoryBudget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategoryBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBudget_categoryId_userId_key" ON "CategoryBudget"("categoryId", "userId");

-- CreateIndex
CREATE INDEX "CategoryBudget_userId_idx" ON "CategoryBudget"("userId");

-- Reprise des plafonds communs existants : ils deviennent ceux du profil A.
-- Aucun chiffre n'est perdu ; le profil B part sans plafond, à saisir.
INSERT INTO "CategoryBudget" ("id", "amount", "categoryId", "userId")
SELECT lower(hex(randomblob(16))), c."monthlyBudget", c."id", u."id"
  FROM "Category" c, "User" u
 WHERE c."monthlyBudget" IS NOT NULL
   AND c."monthlyBudget" > 0
   AND u."slot" = 'A';

-- DropColumn
ALTER TABLE "Category" DROP COLUMN "monthlyBudget";
