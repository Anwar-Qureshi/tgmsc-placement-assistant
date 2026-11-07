# Deployment and maintenance

This guide is for maintainers deploying this repository to their own accounts. The hosted application uses Cloudflare Workers with static assets and D1, plus Firebase Authentication for staff.

## Configuration: build versus runtime

These are two different settings areas in Cloudflare. Adding a value to the build environment does not automatically make it available to the running Worker.

| Value | Where it belongs | Purpose |
| --- | --- | --- |
| `NODE_VERSION=24` | Cloudflare build variables | Build runtime |
| `PNPM_VERSION=11.25.0` | Cloudflare build variables | Package manager |
| `VITE_FIREBASE_API_KEY` | Build variables; `.env` locally | Firebase public web configuration |
| `VITE_FIREBASE_AUTH_DOMAIN` | Build variables; `.env` locally | Firebase public web configuration |
| `VITE_FIREBASE_PROJECT_ID` | Build variables; `.env` locally | Firebase public web configuration |
| `VITE_FIREBASE_APP_ID` | Build variables; `.env` locally | Firebase public web configuration |
| `FIREBASE_PROJECT_ID` | Worker `vars` in `wrangler.jsonc`; `.dev.vars` locally | Server verification of the correct Firebase project |
| `STAFF_EMAILS` | **Worker runtime secret**; `.dev.vars` locally | Comma-separated approved Google email addresses |
| D1 `database_id` | `wrangler.jsonc` | Database binding for this deployment |

`VITE_*` values are embedded in browser JavaScript. Encrypting them in the build dashboard does not make the resulting client configuration private. Never put a server credential in a `VITE_*` variable.

The database UUID and Firebase project ID identify resources; they are not authentication credentials. Never commit cloud API tokens, passwords, Firebase service-account private keys, `.env` or `.dev.vars`.

## 1. Firebase

1. Create a Firebase project using the Spark plan and register a Web app.
2. Enable Google under Authentication and select the support email.
3. Copy the four needed web configuration values into the build variables above. Use `.env.example` for local development.
4. After deployment, add the actual Worker hostname under Authentication → Settings → Authorized domains. Enter the hostname without a protocol or path.
5. Add `localhost` separately if testing local Google sign-in.

Google identity is only the first check. The Worker also requires verified email, the Google provider and membership in `STAFF_EMAILS`. A candidate does not need a Firebase account. No service-account key is required by this implementation.

## 2. Cloudflare D1

Create a new database in the Cloudflare D1 dashboard or with:

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create tgmsc-placement
```

Replace `database_id` in `wrangler.jsonc` with the ID from your account. Keep the binding name `DB`. Set `vars.FIREBASE_PROJECT_ID` to your Firebase project ID.

Apply ordered SQL migrations before the application uses the database:

```sh
pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.jsonc
```

Use `--local` for the separate development database. Do not rewrite applied migrations or manually rerun their SQL on an existing database. Add a new migration for a new schema change.

The database from the former hosting platform is separate. This repository does not automatically move its records. Export and verify any required historical data before retiring the old deployment.

## 3. Deploy from GitHub

Connect the repository to **Cloudflare Workers Builds**, rather than creating a static-only Pages deployment.

| Setting | Value |
| --- | --- |
| Worker name | Match `name` in `wrangler.jsonc` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `pnpm run build` |
| Deploy command | See below |
| Build variables | The six build variables in the configuration table |

When the build token has permission to apply D1 migrations in the intended Cloudflare account, use:

```sh
pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.jsonc && pnpm run deploy
```

If migrations are applied separately, use `pnpm run deploy` as the deploy command. Deployment alone does not create tables. A D1 permission error needs an appropriately scoped deployment token, not a change to the application login checks. Never share that token in an issue or commit.

Add `STAFF_EMAILS` under the Worker's **runtime Variables and Secrets** and save/deploy it. A similarly named secret under **Build** will not authorise staff requests.

Do not protect the entire application with Cloudflare Access if candidates need public browsing and registration. Staff endpoints already have application-level authentication and authorisation.

## 4. Deploy from a computer

Use a normal local development folder outside OneDrive or other continuously synced folders when possible. Install the locked dependencies and supply `.env` before building.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm exec wrangler login
pnpm db:remote
pnpm run deploy
pnpm exec wrangler secret put STAFF_EMAILS
```

Use `pnpm run deploy` explicitly; `pnpm deploy` is also a pnpm command with a different meaning. Python 3 available as `python` is needed for one database regression test.

## Release checks

- `/api/catalog` returns public drive information without candidate records.
- `/staff` opens the Google sign-in gate. An approved account reaches records; an unapproved account does not.
- A fictional test registration appears in staff records, can be corrected and is included in a filtered export.
- A retry does not create a second registration with the same confirmed identity for that drive.
- Closed roles and drives stop accepting new interests/registrations as intended.
- Registration, document review and controls work on the intended Android devices.
- Close test drives before publishing verified events. Do not use real candidate data in screenshots or fixtures.

Review actual Cloudflare CPU, request and D1 usage against the active plan. Keep static asset routing as configured; routing every model download through the Worker changes the operational cost and request profile.

## Troubleshooting

| Message or symptom | What to check |
| --- | --- |
| “Staff sign-in is not configured” | Runtime `STAFF_EMAILS` and runtime `FIREBASE_PROJECT_ID`; save/deploy them |
| Google popup reports an unauthorised domain | Add the exact live hostname to Firebase authorised domains |
| Google login succeeds but staff access is denied | Exact Google email in `STAFF_EMAILS`, correct Firebase project and verified Google identity |
| Access was fixed but the sign-in screen stays visible | Reload the staff page so it checks the existing identity again |
| Catalogue or records API fails | D1 binding, database ID, migration logs and Worker logs |
| No open drives | Check drive date, open status, deadline, reporting time, help contact and at least one open role |
| Model loading fails | Use basic matching; inspect device memory/network and model asset availability |
| Scanned résumé produces little text | Enter the profile manually or use a text-based PDF/DOCX/TXT |

## Maintenance and security boundaries

Run `pnpm audit` explicitly when reviewing dependencies. The repository's `.npmrc` disables automatic audit output during install; it does not make packages vulnerability-free. Evaluate production reachability, update compatible packages in a branch, regenerate the lockfile deliberately and run relevant checks before release. Avoid blind forced major-version upgrades.

The November 2026 review reported dependency advisories, including Zod and development tooling. This documentation update does not remediate those packages or claim a clean dependency audit.

Keep snapshots/backups and test restoration before destructive changes. Agree record retention and export access with the organisation; no automatic retention scheduler is implemented. Public registration has a best-effort hourly connection limit, not a comprehensive anti-abuse system.

Staff authentication persists for the browser session. Signing out clears that browser's state; an already issued copied token may remain valid until expiry, normally about an hour. The Worker rechecks its approved-email list for every staff request. Remove a revoked email from that runtime list and save/deploy the change. Firebase administrator-level token revocation checks are not implemented.

The browser reads résumé content locally, but summaries may still contain personal information after extraction. Candidates should review and remove unnecessary details before submitting. Keep real records out of Git and issue discussions.

## Upstream documentation

- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase ID-token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
