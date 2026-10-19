"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Calculator, GripHorizontal, X } from "lucide-react";
import { evaluateExpression } from "@/lib/calc";

const toEuroInput = (n: number) => n.toFixed(2).replace(".", ",");

const WIN_W = 288;
const WIN_H_EST = 230;

type Pos = { x: number; y: number };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Кнопка «Calculatrice» відкриває плаваюче вікно (поверх сторінки, не зсуває форму).
 * Вікно тягнеться за заголовок. Результат іде в поле «Montant».
 */
export function AmountCalculator({ onApply }: { onApply: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("");
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const openWindow = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      setPos({
        x: clamp(r.right - WIN_W, 8, window.innerWidth - WIN_W - 8),
        y: clamp(r.bottom + 8, 8, window.innerHeight - WIN_H_EST - 8),
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || winRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onHeaderDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHeaderMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const w = winRef.current?.offsetWidth ?? WIN_W;
    const h = winRef.current?.offsetHeight ?? WIN_H_EST;
    setPos({
      x: clamp(e.clientX - d.dx, 0, window.innerWidth - w),
      y: clamp(e.clientY - d.dy, 0, window.innerHeight - h),
    });
  };

  const onHeaderUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  let result: number | null = null;
  let error: string | null = null;
  if (expr.trim()) {
    try {
      result = Math.round(evaluateExpression(expr) * 100) / 100;
    } catch (e) {
      error = e instanceof Error ? e.message : "Expression invalide";
    }
  }

  const apply = () => {
    if (result === null) return;
    onApply(toEuroInput(result));
    setExpr("");
    setOpen(false);
  };

  const floating = open
    ? createPortal(
        <div
          ref={winRef}
          role="dialog"
          aria-label="Calculatrice"
          className="anim-in fixed z-50 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-raised)] p-3 shadow-lg"
          style={{ left: pos.x, top: pos.y, width: WIN_W }}
        >
          <div
            onPointerDown={onHeaderDown}
            onPointerMove={onHeaderMove}
            onPointerUp={onHeaderUp}
            onPointerCancel={onHeaderUp}
            className="mb-2 flex touch-none cursor-grab select-none items-center justify-between active:cursor-grabbing"
            title="Glisser pour déplacer"
          >
            <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-fg)]">
              <GripHorizontal className="h-4 w-4 text-[var(--color-muted)]" aria-hidden />
              Calculatrice
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="rounded-[var(--radius-sm)] p-1 text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-fg)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <input
            autoFocus
            aria-label="Expression à calculer"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            placeholder="12,50 + 8,30 * 2"
            className="tnum w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-base text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]"
          />

          <p
            className={`mt-2 min-h-[1.25rem] text-sm tnum ${
              error ? "text-[var(--color-crit)]" : "text-[var(--color-fg)]"
            }`}
          >
            {error ?? (result !== null ? `= ${toEuroInput(result)} €` : "Tapez une expression")}
          </p>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-fg)] hover:bg-[var(--color-sunken)]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={result === null}
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Utiliser
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openWindow())}
        aria-expanded={open}
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-sunken)]"
      >
        <Calculator className="h-3.5 w-3.5" aria-hidden />
        Calculatrice
      </button>
      {floating}
    </>
  );
}
