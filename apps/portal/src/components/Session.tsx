import { forwardRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, LogIn, LogOut } from "lucide-react";
import type { StaffOrganizationChoice } from "../lib/staff.functions";
import { buttonVariants } from "@/components/ui/button";

/*
 * Sign-in and sign-out controls. Both are plain browser requests to server
 * routes, never server function calls, so no token or session data passes
 * through page scripts.
 */

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

/** The sign-in address. `returnTo` is the page to open afterwards; the server keeps same-origin paths only. */
export function signInHref(returnTo?: string): string {
  return returnTo && returnTo !== "/" ? `/sign-in?returnTo=${encodeURIComponent(returnTo)}` : "/sign-in";
}

/** Starts WorkOS sign-in. A full page load, because the server sets the PKCE cookie and redirects. */
export function SignInLink({ returnTo, label = "Sign in" }: { returnTo?: string; label?: string }) {
  return (
    <a href={signInHref(returnTo)} className={buttonVariants()}>
      <LogIn {...icon} />
      {label}
    </a>
  );
}

/**
 * The sign-out form. It posts to `/sign-out`, which accepts same-origin POST
 * only. The server clears the session cookie and ends the WorkOS session.
 * Give it an `id` to submit it from a menu item with `form.requestSubmit()`.
 */
export const SignOutForm = forwardRef<HTMLFormElement, { id?: string; showButton?: boolean }>(function SignOutForm(
  { id, showButton = true },
  ref,
) {
  return (
    <form ref={ref} id={id} method="post" action="/sign-out" hidden={!showButton}>
      {showButton ? (
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>
          <LogOut {...icon} />
          Sign out
        </button>
      ) : null}
    </form>
  );
});

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  receptionist: "Receptionist",
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

/** The organizations the signed-in person can open, as links. */
export function OrganizationChoices({ organizations }: { organizations: StaffOrganizationChoice[] }) {
  return (
    <nav aria-label="Your organizations">
      <ul className="entry__list">
        {organizations.map((organization) => (
          <li key={organization.slug}>
            <Link to="/$org" params={{ org: organization.slug }} className="entry__choice">
              <span className="entry__choice-text">
                <span className="entry__choice-name">{organization.name}</span>
                <span className="entry__choice-detail">{roleLabel(organization.role)}</span>
              </span>
              <ChevronRight {...icon} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
