import { Link } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { formatMoney, formatWhen, saleState, saleStateLabel } from "../lib/format";
import { useOrganization } from "../lib/organization";
import { Money, Status } from "./ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SalesTable({ sales, showMember = true }: { sales: Schemas["Sale"][]; showMember?: boolean }) {
  const organization = useOrganization();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Sale</TableHead>
          {showMember ? (
            <TableHead scope="col" className="col-wide">
              Member
            </TableHead>
          ) : null}
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col" className="num col-wide">
            Total
          </TableHead>
          <TableHead scope="col" className="num col-wide">
            Balance
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell>
              <Link
                to="/$org/sales/$saleId"
                params={{ org: organization.slug, saleId: sale.id }}
                className="cell-title"
              >
                {sale.line_item.product_name}
              </Link>
              <span className="cell-sub">
                {sale.line_item.price_label}
                {sale.renewal ? " · Renewal" : null} ·{" "}
                <time dateTime={sale.purchased_at} suppressHydrationWarning>
                  {formatWhen(sale.purchased_at, organization.timezone)}
                </time>
              </span>
              <span className="cell-sub phone-only">
                {showMember ? `${sale.member.name} · ` : null}
                {formatMoney(sale.total_minor, sale.currency)}
                {sale.balance_minor > 0 ? `, ${formatMoney(sale.balance_minor, sale.currency)} due` : null}
              </span>
            </TableCell>
            {showMember ? (
              <TableCell className="col-wide">
                <Link
                  to="/$org/members/$memberId"
                  params={{ org: organization.slug, memberId: sale.member.id }}
                >
                  {sale.member.name}
                </Link>
              </TableCell>
            ) : null}
            <TableCell>
              <Status state={saleState(sale)}>{saleStateLabel(sale)}</Status>
            </TableCell>
            <TableCell className="num col-wide">
              <Money minor={sale.total_minor} currency={sale.currency} />
            </TableCell>
            <TableCell className="num col-wide">
              <Money minor={sale.balance_minor} currency={sale.currency} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
