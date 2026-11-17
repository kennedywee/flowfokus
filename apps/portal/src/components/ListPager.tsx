import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageItems } from "../lib/paging";

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;

/**
 * The footer of a list: the range on the left ("1–50 of 212 sales") and
 * page buttons on the right when there is more than one page.
 */
export function ListPager({
  label,
  range,
  page,
  pages,
  onPage,
}: {
  /** Names the pages for assistive technology, for example "Sales pages". */
  label: string;
  range: string;
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="list-pager" aria-label={label}>
      <p className="list-pager__range" aria-live="polite">
        {range}
      </p>
      {pages > 1 ? (
        <ul className="list-pager__list">
          <li>
            <button
              type="button"
              className="list-pager__button"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => onPage(page - 1)}
            >
              <ChevronLeft {...icon} />
            </button>
          </li>
          {pageItems(page, pages).map((item, index) => (
            <li key={item === "gap" ? `gap-${index}` : item}>
              {item === "gap" ? (
                <span className="list-pager__gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  className="list-pager__button"
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => onPage(item)}
                >
                  {item}
                </button>
              )}
            </li>
          ))}
          <li>
            <button
              type="button"
              className="list-pager__button"
              aria-label="Next page"
              disabled={page === pages}
              onClick={() => onPage(page + 1)}
            >
              <ChevronRight {...icon} />
            </button>
          </li>
        </ul>
      ) : null}
    </nav>
  );
}
