"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/depenses", label: "Dépenses" },
  { href: "/revenus", label: "Revenus" },
  { href: "/budgets", label: "Plafonds" },
  { href: "/recurrentes", label: "Récurrentes" },
  { href: "/reglements", label: "Règlements" },
  { href: "/parametres", label: "Paramètres" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto">
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1.5 text-sm",
              "transition-colors duration-[var(--dur-fast)]",
              active
                ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)] shadow-[var(--shadow-1)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-fg)]",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
