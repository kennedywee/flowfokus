---
name: flowfokus-review-screen
description: Review a new or changed Flowfokus portal or gym-site screen for token use, component reuse, API state accuracy, and accessible interaction.
---

Read `docs/design-system.md` and the target app's `DESIGN.md` from the repository
root. Review the changed screen and its request owner. Follow the real response
and action flow; static appearance alone cannot establish correctness.

1. Check styling against the app's semantic tokens. Flag raw colors, direct
   swatches in components, invented type/space values, and unsupported variants.
   Check `src/styles.css` import order when tokens change.
2. Match each section to an existing block or component. Keep a new abstraction
   only when repeated uses share intent. Check defaults and interactive states
   against the source, not a generic shadcn example.
3. Check loading, no records, load failure, mutation pending, mutation failure,
   and success at the request owner. Identify states that cannot apply. Do not
   show Empty while a request has failed or is still loading.
4. Trace displayed statuses to API fields. Paid is not delivered. Granted
   check-in is not a general membership status. Verify void/revoked precedence,
   currency, organization time zone, and preview labels where applicable.
5. Check labels and error associations, visible focus, keyboard operation,
   icon names, pending repeat-submit prevention, and dialog focus behavior.
   When visual verification tools are available and permitted, inspect a narrow
   viewport and desktop. For the portal also check light and dark themes.
6. Run `bun run design:check`, `bun run typecheck`, `bun run test:web`, and the
   changed app's build. Add behavior tests only for meaningful changed behavior.

Report specific findings with file and line, effect, and smallest useful fix.
Report what was checked and any unverified states. Do not claim a visual or
keyboard check from a build alone. Do not push, deploy, or publish as part of review.
