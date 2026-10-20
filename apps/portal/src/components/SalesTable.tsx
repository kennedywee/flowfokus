import { Link } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { formatWhen, saleState, saleStateLabel } from "../lib/format";
import { useOrganization } from "../lib/organization";
import { Money, Status } from "./ui";

export function SalesTable({ sales, showMember = true }: { sales: Schemas["Sale"][]; showMember?: boolean }) {
  const organization = useOrganization();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Sale</th>
            {showMember ? <th scope="col">Member</th> : null}
            <th scope="col">Status</th>
            <th scope="col" className="num">
              Total
            </th>
            <th scope="col" className="num">
              Balance
            </th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td>
                <Link
                  to="/$org/sales/$saleId"
                  params={{ org: organization.slug, saleId: sale.id }}
                  className="cell-title"
                >
                  {sale.line_item.product_name}
                </Link>
                <span className="cell-sub">
                  {sale.line_item.price_label} ·{" "}
                  <time dateTime={sale.purchased_at} suppressHydrationWarning>
                    {formatWhen(sale.purchased_at, organization.timezone)}
                  </time>
                </span>
              </td>
              {showMember ? (
                <td>
                  <Link
                    to="/$org/members/$memberId"
                    params={{ org: organization.slug, memberId: sale.member.id }}
                  >
                    {sale.member.name}
                  </Link>
                </td>
              ) : null}
              <td>
                <Status state={saleState(sale)}>{saleStateLabel(sale)}</Status>
              </td>
              <td className="num">
                <Money minor={sale.total_minor} currency={sale.currency} />
              </td>
              <td className="num">
                <Money minor={sale.balance_minor} currency={sale.currency} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
