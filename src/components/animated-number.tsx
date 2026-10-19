"use client";

import { useEffect, useRef, useState } from "react";
import { formatCents } from "@/lib/money";

/**
 * Chiffre qui se pose : il compte depuis zéro à l'affichage, puis anime toute
 * variation ultérieure. La valeur finale est écrite dans le DOM dès la première
 * frame côté serveur, donc rien ne dépend du JavaScript pour être lisible.
 *
 * `prefers-reduced-motion` coupe l'animation, pas la valeur.
 */
export function AnimatedNumber({
  value,
  format = formatCents,
  duration = 650,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = value;

    if (reduced || from === to) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo : rapide au départ, s'immobilise sans rebond.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}

/** Variante montée : part de zéro au premier rendu client. */
export function CountUp(props: Parameters<typeof AnimatedNumber>[0]) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <AnimatedNumber {...props} value={mounted ? props.value : 0} />;
}
