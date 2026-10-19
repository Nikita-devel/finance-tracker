-- AlterTable
ALTER TABLE "User" ADD COLUMN "monthlyIncome" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "monthlyBudget" INTEGER;
ALTER TABLE "Category" ADD COLUMN "bucket" TEXT NOT NULL DEFAULT 'BESOINS';

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "splitType" TEXT NOT NULL,
    "customAmountA" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "categoryId" TEXT NOT NULL,
    "paidById" TEXT NOT NULL,
    CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringExpense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables (ajout de Expense.recurringId avec clé étrangère)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "splitType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "categoryId" TEXT NOT NULL,
    "paidById" TEXT NOT NULL,
    "recurringId" TEXT,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "RecurringExpense" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Expense" ("id", "title", "amount", "date", "note", "splitType", "createdAt", "updatedAt", "categoryId", "paidById")
SELECT "id", "title", "amount", "date", "note", "splitType", "createdAt", "updatedAt", "categoryId", "paidById" FROM "Expense";

DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";

CREATE INDEX "Expense_date_idx" ON "Expense"("date");
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_recurringId_idx" ON "Expense"("recurringId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
