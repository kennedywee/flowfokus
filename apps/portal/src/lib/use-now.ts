import { useEffect, useState } from "react";

/**
 * One clock for a page. The server render and the first browser render both
 * read `loadedAt`, so the two match. After hydration the clock moves to the
 * browser's own time, and then ticks every `every` ms (0 for no ticks).
 */
export function useNow(loadedAt: number, every = 0): number {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!every) return;
    const timer = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(timer);
  }, [loadedAt, every]);
  return now ?? loadedAt;
}
