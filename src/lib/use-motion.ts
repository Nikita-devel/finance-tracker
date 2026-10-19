"use client";

import { useEffect, useState } from "react";

/**
 * Deux préférences système lues une fois, au montage, puis suivies.
 * Les graphiques en ont besoin ensemble : la palette dépend du thème,
 * l'animation dépend de `prefers-reduced-motion`.
 */
export function useChartEnv() {
  const [env, setEnv] = useState({ dark: false, animate: false });

  useEffect(() => {
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () =>
      setEnv({ dark: darkQuery.matches, animate: !motionQuery.matches });

    sync();
    darkQuery.addEventListener("change", sync);
    motionQuery.addEventListener("change", sync);
    return () => {
      darkQuery.removeEventListener("change", sync);
      motionQuery.removeEventListener("change", sync);
    };
  }, []);

  return env;
}
