import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { UserSwitcher } from "@/components/user-switcher";
import { AppShortcuts } from "@/components/app-shortcuts";
import { getCategories } from "@/lib/queries";
import { getActiveSlot, getUsers } from "@/lib/session";

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Suivi des dépenses et règlements à deux — 100 % local",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ userA, userB }, activeSlot, categories] = await Promise.all([
    getUsers(),
    getActiveSlot(),
    getCategories(),
  ]);

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        {/* En-tête en verre : le contenu défile dessous sans le traverser. */}
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--glass)] backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em]">
              <span
                className="h-5 w-5 rounded-[6px] bg-[var(--color-accent)] shadow-[var(--shadow-1)]"
                aria-hidden
              />
              Finance&nbsp;Tracker
            </span>
            <div className="ml-auto order-3 sm:order-none sm:ml-0">
              <UserSwitcher
                userA={userA ? { name: userA.name, color: userA.color } : null}
                userB={userB ? { name: userB.name, color: userB.color } : null}
                activeSlot={activeSlot}
              />
            </div>
            <div className="order-4 -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:order-none sm:mx-0 sm:ml-0 sm:w-auto sm:overflow-visible sm:px-0">
              <Nav />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-7">{children}</main>

        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-[var(--color-muted)]">
          Base SQLite locale — aucune donnée ne quitte cette machine.
        </footer>

        <AppShortcuts
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          userAName={userA?.name ?? "Utilisateur A"}
          userBName={userB?.name ?? "Utilisateur B"}
          activeSlot={activeSlot}
        />
      </body>
    </html>
  );
}
