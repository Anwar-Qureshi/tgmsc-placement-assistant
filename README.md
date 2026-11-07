# TGMSC Placement Assistant

Help job seekers explore placement-drive opportunities, register once and arrive better prepared. Give TGMSC staff one place to manage employers, roles, registrations and follow-up.

Built from an internship observation: candidates from different backgrounds need useful guidance across IT and non-IT vacancies, while organisers need consistent registration records. Recommendations guide exploration; employers make interview and hiring decisions. All open roles remain available.

## What it does

- Public drive and role browsing before entering personal details.
- PDF (text-based, up to 12 pages), DOCX and TXT resume reading, up to 5 MB.
- Editable, candidate-confirmed profile; education, pursuing status, batches and whole-year experience checks.
- Pretrained MiniLM semantic suggestions in the browser, plus a labelled basic matching option.
- Registration reference, selected interests and repeat-submission recovery.
- Approved staff Google sign-in; event/company/role management, corrections, follow-up, search, paging and CSV export.

Original resume files stay on the device. Confirmed profile details are saved in the database after consent. No new neural model was trained and no paid generative AI API is used. Software was developed with AI assistance and reviewed through implementation and testing; synthetic examples do not establish a real-world accuracy percentage.

## Architecture

React + TypeScript + Vite serves the interface as static files. A small Cloudflare Worker handles `/api/*`. Cloudflare D1 stores records. Firebase Authentication verifies Google identities; the Worker validates signed ID tokens and the approved-email list on every staff request. It does not trust client-supplied identity headers or typed emails.

PDF.js and Mammoth extract resume text. Transformers.js uses the bundled quantized `Xenova/all-MiniLM-L6-v2` model and ONNX WebAssembly runtime to compare profile/role text. Explicit requirements are separate from similarity. Model/runtime downloads total approximately 43 MB on a first uncached use; basic matching remains available. Physical low-memory Android performance and independent relevance evaluation need a supervised pilot.

## Requirements

Node.js 22.13+ (Node 24 recommended), pnpm 11.25.0, a Cloudflare account on Workers Free, and a Firebase project on Spark. Do not enable paid services to follow these instructions.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm test
```

## Firebase: owner setup

1. Create a Firebase project, keep Spark, and skip Analytics unless you independently need it.
2. In Authentication, enable Google and choose the project support email.
3. In Project settings, register a Web app. Copy its public configuration into `.env` using `.env.example`.
4. Add `localhost` and your eventual `YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev` domain to Authentication's authorised domains.
5. Set the same project ID and the exact approved staff email(s) in `.dev.vars` using `.dev.vars.example` for local development. Comma-separate multiple staff emails. No candidate needs a Firebase account.

Google sign-in opens a popup; allow it if the browser blocks it. Authentication is stored for the browser session. Signing out clears that browser's login; an already-issued copied ID token can remain valid until expiry (normally up to an hour). Removing an email from the server allowlist and redeploying prevents future requests by that account. This release does not claim Firebase administrator-level token revocation checks.

## Cloudflare database and deployment

Create the database in your own account:

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create tgmsc-placement
```

Replace the placeholder `database_id` in `wrangler.jsonc` with the returned ID. Set `vars.FIREBASE_PROJECT_ID` there. After the initial deploy, run `pnpm exec wrangler secret put STAFF_EMAILS` and enter the comma-separated approved staff emails into its prompt. Do not add STAFF_EMAILS as a second `vars` entry when it is a secret. Staff access stays closed until it is configured. Do not create a service-account key for this app.

```sh
pnpm db:local
pnpm dev
# Before first production use, against your NEW empty database:
pnpm db:remote
pnpm build
pnpm run deploy
```

`pnpm build` reads public `VITE_FIREBASE_*` values at build time. For automatic deploys, connect this repository to Workers Builds: build command `pnpm build`, deploy command `pnpm run deploy`, root repository directory. Configure Node 24, pnpm 11.25.0 and the four `VITE_FIREBASE_*` build variables in the Cloudflare project. Keep the production project ID consistent between browser build and Worker runtime. Apply migrations deliberately before deploying code that needs them; a Git push does not automatically migrate the database.

After the first deploy, add the exact generated hostname in Firebase authorised domains, rebuild/redeploy if configuration changed, and verify Google sign-in with your approved account. Google sign-in alone does not make someone an administrator.

The old ChatGPT-hosted database is separate. This repository does not copy, delete or migrate its records automatically. Before moving any real data, export/back up the original database, test import into a separate database and compare counts and interests. Keep the old link available until acceptance passes. Historical SQL migration files must not be rewritten or replayed on already-migrated databases.

## Release acceptance

Verify registration on an Android phone, resume correction, all-role exploration, confirmation reference, duplicate/retry recovery, staff sign-out, approved versus unapproved accounts, every staff write operation and a filtered CSV export. Check actual Worker CPU metrics: the Free limit is 10 ms per API invocation. Static files should bypass the Worker; do not change `assets.run_worker_first` to `true` for the whole site. No target-host load/CPU result is claimed before deployment to your account.

Close fictional events and use verified employer/event information before public launch. Agree access, retention/deletion and export handling with TGMSC. Use D1 Time Travel plus a separate controlled backup/export, test recovery, and keep a known-good deployment for rollback. Never put real candidate records or resumes in Git.

## Configuration and security

- `.env` and `.dev.vars` are ignored. Examples contain blanks only.
- `VITE_*` configuration becomes public JavaScript. Never place a server secret in those variables.
- Firebase browser API configuration identifies the project; it does not grant staff access. Restrict the Firebase key to its intended APIs and authorised domains.
- No service-account private key, Cloudflare API token or password belongs in the repository. Use provider-managed secrets if a future feature requires them.
- API responses and exports use `Cache-Control: no-store`. Staff access is checked server-side. Signed tokens require the correct issuer, audience, signature, expiry, verified email and Google provider.
- Bearer tokens are sent in request headers, never download URLs. CSV download uses the authenticated request. Cross-origin writes are rejected and there are no auth cookies added by this app.
- Input validation, bound SQL, atomic writes, CSV formula escaping and reference-confirmed deletion are retained.
- Rate limiting is best-effort and is not a complete anti-abuse service. Free quotas can stop service when exhausted; monitor usage. No zero-bug, uptime or hiring-accuracy guarantee is claimed.

## Project files

`app/` and `components/placement/`: screens and API handlers. `src/`: browser entry and Firebase login. `lib/`: matching, parsing, authentication and database operations. `worker/`: request routing. `drizzle/`: append-only migrations. `public/`: model, PDF worker, WebAssembly, fonts and licences. `tests/`: focused authentication and request-isolation tests.

Third-party licence notices are under `public/licenses` and `public/fonts`. The upstream runtime loader is kept unchanged with its matching WASM asset. New development should preserve model/runtime compatibility and all-role visibility, and add meaningful regression tests for behaviour changes.

## Validation status

This migration passes 40 automated checks (including signed-token verification, wrong-project/expired/tampered-token rejection, unapproved accounts, request isolation, matching, parsing and legacy database migration checks), TypeScript checking and a production build. The five SQL migrations applied successfully to a fresh local D1 database. Real Google sign-in and Cloudflare CPU/load validation require the owner's configured Firebase and Cloudflare accounts and are not claimed as completed.
