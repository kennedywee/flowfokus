import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Wordmark } from "./ui";
import { buttonVariants } from "@/components/ui/button";

/**
 * A page that replaces the whole portal: access is off, or the organization
 * did not open. `homeLink` offers a way back to the portal start, which opens
 * the demo organization. Leave it out when that start is this same page.
 */
export function Blocked({
  title,
  description,
  homeLink = false,
  children,
}: {
  title: string;
  description: string;
  homeLink?: boolean;
  children?: ReactNode;
}) {
  return (
    <main className="entry" id="main">
      <div className="entry__panel">
        <Wordmark />
        <div className="entry__text">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
        {homeLink ? (
          <div className="actions">
            <Link to="/" className={buttonVariants({ variant: "secondary" })}>
              Go to the staff portal
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
