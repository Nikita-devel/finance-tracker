"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CornerDownLeft,
  Database,
  FileDown,
  Plus,
  Search,
} from "lucide-react";
import { ExpenseForm } from "@/components/expense-form";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * Raccourcis globaux.
 *
 *   n      → nouvelle dépense, depuis n'importe quelle page
 *   ⌘K / Ctrl+K → palette de commandes
 *   Échap  → ferme
 *
 * Le frottement de la saisie décide si un budget est encore tenu dans trois
 * mois. Trois touches valent mieux qu'un aller-retour vers la page Dépenses.
 */

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
}

/** N'intercepte pas les touches pendant une saisie. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

function Overlay({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>(
      "input, select, textarea, button",
    );
    first?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "anim-in w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]",
          "bg-[var(--color-raised)] shadow-[var(--shadow-3)]",
          wide ? "max-w-lg" : "max-w-xl",
        )}
      >
        <div className="border-b border-[var(--color-border)] px-5 py-3">
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{subtitle}</p>
          )}
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function AppShortcuts({
  categories,
  userAName,
  userBName,
  activeSlot,
}: {
  categories: { id: string; name: string }[];
  userAName: string;
  userBName: string;
  activeSlot: "A" | "B";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "palette" | "add">("none");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const close = useCallback(() => {
    setMode("none");
    setQuery("");
    setCursor(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const commands: Cmd[] = [
    { id: "add", label: "Nouvelle dépense", hint: "n", icon: Plus, run: () => setMode("add") },
    { id: "home", label: "Tableau de bord", icon: Search, run: () => go("/") },
    { id: "dep", label: "Dépenses", icon: Search, run: () => go("/depenses") },
    { id: "rev", label: "Revenus", icon: Search, run: () => go("/revenus") },
    { id: "bud", label: "Plafonds", icon: Search, run: () => go("/budgets") },
    { id: "rec", label: "Dépenses récurrentes", icon: Search, run: () => go("/recurrentes") },
    { id: "reg", label: "Règlements", icon: Search, run: () => go("/reglements") },
    { id: "par", label: "Paramètres", icon: Search, run: () => go("/parametres") },
    {
      id: "csv",
      label: "Exporter les dépenses (CSV)",
      icon: FileDown,
      run: () => {
        close();
        window.location.href = "/api/export/csv";
      },
    },
    {
      id: "db",
      label: "Sauvegarder la base (.db)",
      icon: Database,
      run: () => {
        close();
        window.location.href = "/api/export/db";
      },
    },
  ];

  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const matches = commands.filter((c) => norm(c.label).includes(norm(query)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode !== "none") {
        e.preventDefault();
        close();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMode((m) => (m === "palette" ? "none" : "palette"));
        return;
      }
      if (mode === "none" && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
        if (e.key === "n") {
          e.preventDefault();
          setMode("add");
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, close]);

  if (mode === "add") {
    return (
      <Overlay
        title="Nouvelle dépense"
        subtitle={`Payée par ${activeSlot === "A" ? userAName : userBName} · Échap pour fermer`}
        onClose={close}
        wide
      >
        {categories.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Créez d&apos;abord une catégorie dans Paramètres.
          </p>
        ) : (
          <ExpenseForm
            categories={categories}
            userAName={userAName}
            userBName={userBName}
            activeSlot={activeSlot}
            onDone={() => {
              close();
              router.refresh();
            }}
          />
        )}
      </Overlay>
    );
  }

  if (mode === "palette") {
    return (
      <Overlay title="Commandes" onClose={close}>
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCursor((c) => Math.min(matches.length - 1, c + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCursor((c) => Math.max(0, c - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  matches[cursor]?.run();
                }
              }}
              placeholder="Aller à… ou lancer une action"
              className="pl-9"
            />
          </div>

          <ul className="space-y-0.5">
            {matches.length === 0 && (
              <li className="px-2 py-3 text-sm text-[var(--color-muted)]">
                Aucune commande ne correspond.
              </li>
            )}
            {matches.map((c, i) => {
              const Icon = c.icon;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={c.run}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm",
                      i === cursor
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "text-[var(--color-fg)] hover:bg-[var(--color-sunken)]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    <span className="flex-1">{c.label}</span>
                    {c.hint && (
                      <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-sunken)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-muted)]">
                        {c.hint}
                      </kbd>
                    )}
                    {i === cursor && (
                      <CornerDownLeft
                        className="h-3.5 w-3.5 opacity-60"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Overlay>
    );
  }

  // Rappel discret : un raccourci que personne ne connaît n'existe pas.
  return (
    <button
      type="button"
      onClick={() => setMode("palette")}
      title="Commandes (⌘K) · Nouvelle dépense (n)"
      className={cn(
        "fixed bottom-5 right-5 z-40 hidden items-center gap-2 rounded-[var(--radius-pill)] sm:flex",
        "border border-[var(--color-border)] bg-[var(--glass)] px-3 py-2 text-xs text-[var(--color-muted)]",
        "shadow-[var(--shadow-2)] backdrop-blur-xl",
        "transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-fg)]",
      )}
    >
      <Command className="h-3.5 w-3.5" aria-hidden />
      <span>
        <kbd className="font-mono">⌘K</kbd> commandes ·{" "}
        <kbd className="font-mono">n</kbd> dépense
      </span>
    </button>
  );
}
