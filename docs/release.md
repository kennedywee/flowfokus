# Release

This is the target release process. Sprint 1 implements CI and candidate artifact packaging. Registry publication and live deployment wait for credentials. See [Deployment candidate](deployment.md).

One Git tag releases every app in the [monorepo](monorepo.md). Building a release never deploys it. A person deploys it later, through an approval gate.

## Flow

```mermaid
flowchart LR
  pr["Pull request<br/>CI, optional preview"] --> master["Merge to master<br/>CI only"]
  master --> rc["Tag vX.Y.Z-rc.N<br/>candidate"]
  rc -->|test, fix on master, new rc| rc
  rc --> stable["Tag vX.Y.Z<br/>same commit"]
  stable --> deploy["Deploy workflow<br/>approval gate"]
  stable --> mobile["Mobile workflow<br/>update or store build"]
```

| Build | Identified by | Started by | Reaches production? |
| --- | --- | --- | --- |
| PR preview | PR number and commit | `preview` label on a PR | No |
| Release candidate | Tag `vX.Y.Z-rc.N` | A person pushes the tag | No |
| Stable release | Tag `vX.Y.Z` | A person tags the tested candidate commit | Only through Deploy and Mobile |

Merging to `master` runs CI only. It never deploys.

There is no staging environment yet. Production is the only deployed environment. Test release candidates locally and with PR previews.

## Workflows

| Workflow | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | Pull request, push to `master`. Skipped when only `docs/**` or `*.md` files change. | Rails specs with contract checks, generated types current, type checks, all app builds, breaking-contract check on PRs. |
| `preview.yml` | PR with the `preview` label: label added or removed, push, reopen, close, `/preview` comment. Nightly, or manual, for the clean-up. | Creates, updates, or deletes the [preview](#pull-request-previews) of the PR on Boat. The job holds one secret, a Boat API key that reaches preview sandboxes only. |
| `release.yml` | Push of a `v*` tag | Runs CI, builds each app once, publishes the server image, writes the release manifest, creates one GitHub Release. Deploys nothing. |
| `deploy.yml` | Manual: tag, apps | Approval, database backup, migration, server start, smoke test, then web sites. |
| `mobile.yml` | Manual: tag | Sends an EAS Update or submits a store build. |

The **release manifest** records the tag, commit, channel, and each app's build result, checksums, and publication status. If any build fails or is missing, no GitHub Release is created.

## Rules

- **Never move a tag.** Fix on `master` and tag the next `rc`.
- **Promote the same commit.** A stable tag points at the tested candidate commit.
- **Build once, promote the artifact.** Server image and web builds are reused across environments. Only runtime configuration changes. Mobile is the exception: it needs one build per environment.
- **Candidates never reach production.** Deploy and Mobile refuse candidate tags for production.
- **Deploy only what changed.** Choose apps in the Deploy workflow. A change in `packages/api` affects every client. When unsure, deploy all.

## Pull request previews

A PR with the `preview` label gets a preview: one [Boat](https://boat.dev) sandbox that runs the full local stack from that PR. The stack is the one in `compose.yaml`: Rails, the jobs process, the portal, the gym site, PostgreSQL, and WorkOS Emulate.

Each preview is a virtual machine of its own, named `flowfokus-pr-<number>`. It holds demo data and fake users only. It needs no production secret and no WorkOS redirect URI.

| Event | Result |
| --- | --- |
| The `preview` label is added, or the PR is reopened with it | A new sandbox. Build, prepare the database, start the stack. About 4 minutes. |
| A push while the preview runs | The sandbox takes the new commit. Images are rebuilt only when a file inside an image changed. |
| A push while the preview sleeps | The sandbox stays asleep. The comment says so. |
| 30 minutes after the last deploy | Boat stops the sandbox. It costs nothing while it sleeps. The disk and the database stay. |
| A `/preview` comment from someone who can write to the repository | Wakes the sandbox and takes the latest commit. About 1 minute. |
| The label is removed, or the PR is closed | The sandbox is deleted. |

The workflow keeps one comment on the PR with the state and the portal link. The link is a Boat link with an access token, see [Access through a Boat link](local-auth.md#access-through-a-boat-link). On a public repository, anyone who reads the comment can open a running preview.

Rules:

- **Staff portal only.** The gym site selects the gym from its host name, and a Boat link has no place for one.
- **The label is the switch.** GitHub lets only people with triage access set it. A PR from a fork gets no preview.
- **Sleep is on a timer.** Boat counts from the last deploy or wake, not from the last request.
- **No more than 5 previews run at once.** When a sixth starts, the one that ran longest is stopped. Its comment says so, and `/preview` wakes it. Two previews that start at the same moment can pass the limit by one.
- **A nightly clean-up** deletes sandboxes whose PR is closed, has lost the label, or has slept for more than 7 days. It touches only sandboxes named `flowfokus-pr-<number>`. After 7 days asleep, `/preview` builds a new preview with fresh data.

`scripts/preview` holds the logic. The workflow only chooses the command. A PR whose branch does not hold the script uses the copy on `master`. GitHub keeps only the newest queued run for a PR, so each run checks the sandbox it finds: a new label or a reopen deletes any old sandbox first, and `/preview` on a PR without the label deletes it. GitHub runs a comment and the nightly clean-up from the workflow on `master`, so a change to either cannot be tried from its own PR.

## Versions

| Number | Example | Use |
| --- | --- | --- |
| Repository tag | `v1.1.0` | The release of every app. No per-app tags. |
| Mobile store version | `1.1.0` | Tag without `v` and `-rc.N`. Stores reject `-rc`. |
| Mobile build number | `42` | Set by EAS for each store upload. Not a release tag. |
| Mobile runtime version | fingerprint | Decides which installed builds can take an EAS Update. |
| Web `version.json` | `{"tag": "v1.1.0"}` | Shows which release a host serves. |

## Hotfix

Production runs `v1.0.0`. `master` has work that cannot ship yet.

1. Branch from the production tag: `git switch -c hotfix/v1.0.1 v1.0.0`.
2. Fix the bug and run the relevant checks.
3. Tag `v1.0.1` and push the branch and tag. The normal release workflow builds it.
4. Merge the hotfix branch back into `master`.

`v1.0.1` contains `v1.0.0` plus the fix, and none of the newer `master` work.

## Hosting

| App | Runs on | Artifact |
| --- | --- | --- |
| `apps/server` | VPS, as a Docker container | Server image from GHCR |
| PostgreSQL | Reached by the server through `DATABASE_URL` | — |
| `apps/portal` | Cloudflare Worker on `portal.flowfokus.com` | Worker bundle with static assets |
| `apps/site` | Cloudflare Worker on the route `*.flowfokus.com/*` (custom domains later) | Same |

The Workers call Rails at `api.flowfokus.com`. The mobile app and WorkOS webhooks use the same host. Only Cloudflare may reach the VPS. Custom domains, when added, need Cloudflare custom hostnames with certificates.

The `portal.flowfokus.com` route takes precedence over the wildcard route, so the site Worker never serves the portal host. Reserved slugs keep `api`, `portal`, and `www` away from gyms.

Web apps deploy as a new version of each Worker from the released bundle. Only Worker variables and secrets differ per environment. Rollback restores the previous Worker version.

Use the Workers Paid plan in production. The Free plan's daily request cap and per-request CPU limit are too low for server rendering.

## Server deployment

1. Approval by a required reviewer.
2. Pull the image for the tag.
3. Back up the database with `pg_dump`.
4. Run `bin/rails db:migrate` in a one-off container. The server does not migrate on boot.
5. Replace the running server.
6. Smoke test `/up` and one API endpoint.
7. Deploy portal and site Workers with the environment's variables.

Rollback: start the previous image and restore the previous Worker versions. A migration that changed data cannot be undone this way; restore the backup.

Keep migrations backward compatible. Add first, remove in a later release. Old mobile apps and the previous server may still run against the new schema.

### Manual data preparation

When a migration can fail on existing production rows (for example, a new check constraint):

1. **Inspect** production with a read-only script.
2. **Decide** per finding: permit, repair, or block.
3. **Repair** approved rows in one transaction. Save the output. A repair is not a migration.
4. **Verify** again, and once more right before deployment.
5. **Approve** the deploy with a link to the record.

A candidate database cannot prove that production is ready. Only an inspection on production can.

## Mobile delivery

| Change | Ships as |
| --- | --- |
| TypeScript only: screens, text, API calls, fixes | EAS Update to installed builds with the same runtime version |
| Native: modules, SDK upgrade, permissions, icons, native config | New EAS build and store submission |

Submitting is not releasing. A person releases the build in the store, often as a staged rollout. Users update over weeks; some never do. The API must keep working for older versions.
