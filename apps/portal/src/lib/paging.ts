/** Rows per list page. */
export const PAGE_SIZE = 50;

/** Page numbers to show: first, last, and the current page with its neighbours. */
export function pageItems(page: number, pages: number): (number | "gap")[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  sorted.forEach((n, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && n - previous > 1) items.push("gap");
    items.push(n);
  });
  return items;
}

/** The rows on one page of a list, as numbers: "1–50 of 186" is `{ from: 1, to: 50, total: 186 }`. */
export function pageRange(page: number, size: number, total: number): { from: number; to: number; total: number; pages: number } {
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pages);
  if (total === 0) return { from: 0, to: 0, total, pages };
  return { from: (current - 1) * size + 1, to: Math.min(current * size, total), total, pages };
}

/** The footer count: "1–50 of 186 members". An empty list says "0 members". */
export function rangeLabel(page: number, size: number, total: number, noun: string, nounOne = noun.replace(/s$/, "")): string {
  const { from, to } = pageRange(page, size, total);
  if (total === 0) return `0 ${noun}`;
  if (total === 1) return `1 ${nounOne}`;
  return `${from}–${to} of ${total} ${noun}`;
}
