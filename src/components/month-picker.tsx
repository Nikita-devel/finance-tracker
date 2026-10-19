"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/utils";

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Зберігаємо інші параметри (наприклад, vue=A|B|all), міняємо лише month.
  const go = (next: string) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("month", next);
    router.push(`${pathname}?${qs.toString()}`);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Mois précédent"
        onClick={() => go(shiftMonth(month, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[9.5rem] text-center text-sm font-medium">
        {monthLabel(month)}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Mois suivant"
        onClick={() => go(shiftMonth(month, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {month !== currentMonth() && (
        <Button variant="ghost" size="sm" onClick={() => go(currentMonth())}>
          Aujourd&apos;hui
        </Button>
      )}
    </div>
  );
}
