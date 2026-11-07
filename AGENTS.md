# TGMSC Placement Assistant - instructions for coding agents

## Start here

Read this file before changing the project. It is shared context for Codex, Claude Code, Antigravity and other assistants. Read the actual source for the task; this file is not a substitute for it. User instructions and the current repository state take precedence over stale descriptions here.

1. Run `git status --short` and inspect the branch/recent commits. Preserve unrelated user edits.
2. Read `README.md`, `docs/DEPLOYMENT.md` and the files responsible for the requested behaviour.
3. State the intended behaviour and a small plan. Reuse existing components/libraries before adding dependencies.
4. Work in a feature branch for code changes. Reproduce the problem safely before fixing it.
5. Verify the changed behaviour and report changed files, checks run, results and remaining limits. Do not claim live verification from a local build alone.

Documentation baseline: 8 November 2026, source implementation audited at `743ea53e5e0cbc5865f2734f31c382a0abfcacb8`; visitor README/deployment guide added at `edb0b122a1ff93cf6e0057a0bff9c14df86b8ef6`. Verify current HEAD rather than treating those commits as permanently current.

## Product contract

TGMSC means Telangana Minorities Study Circle. The app helps candidates explore placement drives and register; approved placement staff manage drives, employers, roles and follow-up.

- Candidate accounts are not required. Staff use Google sign-in plus a server-approved email list.
- Recommendations guide choices. They never reject a person, guarantee employment, automatically submit an employer application or make an interview/hiring decision.
- All open roles for the selected drive remain available, even when similarity is low or requirements need discussion. Preserve the option to register without choosing a role, or choose up to 20 interests.
- IT-background candidates may explore non-IT roles. Do not add automatic background-based exclusion.
- Missing qualification/experience remains unknown. Do not infer it as confirmed from résumé wording.
- Experience accepts whole years only: 0, 1, 2, etc., through the existing bound of 60.
- An undergraduate still pursuing a degree must not be treated as a completed graduate. Keep highest completed qualification, degree/specialisation, study status and expected/completed year separate.
- Diploma details are required when applicable. Postgraduate-specific degree fields were not requested for the current release.
- Staff can specify accepted qualifications, pursuing-student acceptance and graduation batches. Degree-condition free text is displayed for organiser confirmation, not automatically interpreted as definitive eligibility.
- Keep wording simple, encouraging and factual. Do not introduce job guarantees or repeated discouraging warnings.

## Actual architecture

- React 19 + TypeScript + Vite; vanilla CSS and Lucide icons. This migrated app does not use Next.js, Vinext, SSR or React Server Components, despite the retained `app/` directory and a few legacy directives/type paths.
- One Cloudflare Worker serves `/api/*`; static assets share its origin. D1 stores relational records. Preserve `assets.run_worker_first: ["/api/*"]`: model/static downloads should bypass Worker execution.
- Firebase Authentication handles Google identity. `jose` verifies the signed Firebase ID token in the Worker; no Firebase Admin SDK/private service-account key is required.
- A pretrained quantized `Xenova/all-MiniLM-L6-v2` model runs in the browser through Transformers.js and ONNX WebAssembly. No TGMSC model was trained; no paid generative AI endpoint is used.
- Text PDF/DOCX/TXT parsing occurs on the device. The original file is not uploaded. Confirmed profile fields, editable summary and selected interests are saved after consent. Summary text can still contain personal information; do not call this complete anonymisation.
- Local request state uses AsyncLocalStorage. Never replace it with a mutable global env/user variable. A cached public JWKS resolver is different from per-request user state.

## File map: read before editing

| Concern | Files / entry points |
| --- | --- |
| Browser routing | `index.html`, `src/main.tsx` |
| Candidate stages and upload/recommend/register flow | `app/candidate-app.tsx` |
| Staff records, forms and export controls | `app/staff/staff-app.tsx` |
| Google login and authenticated fetch/export | `src/firebase.ts`, `src/staff-gate.tsx` |
| Worker routing / staff gate | `worker/index.ts` |
| Token checks / request identity | `lib/auth.ts`, `lib/context.ts`, `lib/server.ts` |
| Public catalogue | `app/api/catalog/route.ts`, `lib/catalog.ts` |
| Registration validation, retry and duplicate handling | `app/api/register/route.ts`, `lib/contact.ts` |
| Staff writes and audit history | `app/api/staff/route.ts` |
| Staff filters/paging/export SQL | `lib/staff-records.ts`, `lib/records.ts` |
| Embeddings and ranking | `lib/semantic.ts`, `lib/matching.ts` |
| Résumé extraction | `lib/resume.ts`, `extractDraft` in `lib/matching.ts` |
| Education UI and rules | `components/placement/education-fields.tsx`, `role-education.tsx`, `lib/education.ts`, `lib/validation.ts` |
| Drive role preview | `components/placement/drive-overview.tsx` |
| Visual design / responsive behaviour | `app/globals.css` |
| Schema and migrations | `db/schema.ts`, `drizzle.config.ts`, ordered `drizzle/*.sql` and metadata |
| Build/deployment | `package.json`, lockfile, `pnpm-workspace.yaml`, `vite.config.ts`, `wrangler.jsonc`, `scripts/check-config.mjs` |
| Regression checks / fixtures | `tests/*.test.ts`, `tests/fixtures/` |
| Model/runtime provenance | `docs/MODEL_MANIFEST.json`, `docs/RUNTIME_MANIFEST.json`, upstream licences |

## API and data invariants

- Public: `GET /api/catalog`, `POST /api/register`. Protected: `GET/POST /api/staff`, including auth checks and CSV export. Unknown routes must not expose records.
- Worker verifies token signature with Google's public JWKS, RS256, issuer, audience, expiry, required identity/time claims, verified email and Google provider. Exact email membership in `STAFF_EMAILS` is checked on every staff request.
- A client-provided email, hidden button, URL, local storage value or prior successful page load is never sufficient authorisation.
- Keep bearer tokens in headers. CSV uses authenticated fetch/blob download, not a token in a URL. Do not print tokens or actual secret values to logs.
- Runtime `FIREBASE_PROJECT_ID` and `STAFF_EMAILS` must both exist; missing configuration fails closed. Do not add service-token/testing bypasses to fix a login problem.
- Body reader caps request size at 50,000 bytes. Zod validates values; preserve bounds and bind SQL parameters. Frontend validation is not the security boundary.
- Origin checking accepts a missing Origin and therefore is not a complete anti-bot control. The registration connection limit is basic protection, not a comprehensive abuse defence.
- D1 batch writes preserve registration/profile/interest/audit consistency. Keep duplicate constraints and request-id retry recovery; do not blindly insert again after a lost response.
- Shared family phone numbers can belong to different people. Preserve name/email-aware contact-key behaviour and staff warnings.
- Closed/expired/demo drives and closed/demo-company roles must not accept new public registration interests. Dates/deadlines use the existing India-time rules.
- Candidate registration refers to one drive. Jobs/companies/interests must retain relational consistency. Role reassignment is restricted if interests exist.
- Staff records page size is 50. Filtered CSV export must include matching records across all pages; export batches use keyset pagination. Do not reintroduce a silent 2,000-record cutoff.
- Preserve CSV formula escaping. A registration reference is a convenience label, not a public authorisation token.
- Audit records store actor/action/record/time, not a second copy of profile contents. Removing a registration requires the existing reference confirmation and cleans up unused profile data.

Eight application tables: drives, companies, jobs, candidates, registrations, interests, changes, submission_limits. D1 may also create its own migration metadata table.

## Matching and document handling

- `profileText` combines skills, degree and summary; `jobText` combines title, skills and description. Explicit identity fields are not ranking features; text cleanup is not guaranteed PII removal.
- `semanticScores` uses feature extraction, mean pooling, normalisation and cosine similarity. Similarity is not a probability, eligibility decision or validated accuracy score.
- Qualification/batch/experience checks remain separate from similarity ordering. Missing skills are explanatory, not automatic disqualification.
- The candidate workflow has a 90-second model wait/fallback path and run-sequence protection. A timeout or basic-mode selection ignores stale results; it does not prove underlying inference is cancelled.
- Model/runtime first-use downloads are roughly 43 MiB before extra parser/app assets. Preserve lazy loading and explicit basic matching on low-memory/slow-network devices.
- PDF: at most 12 pages and 5 MiB, text extraction only; `isEvalSupported: false`, worker teardown in `finally`. DOCX uses Mammoth raw-text extraction. TXT uses local text reading. Manual entry remains available.
- Do not add OCR, remote résumé uploads, cloud AI, paid APIs or candidate profiling without a user-requested scope change and suitable privacy/deployment review.
- Do not casually upgrade/replace individual ONNX JS/WASM/model files. Treat them as a tested pairing; update recorded hashes/licences and verify inference when changing them.

## Environments and deployment

Production URL: https://tgmsc-placement-assistant.anwar7-akber.workers.dev/ . Do not mutate its data for a routine test. Use a local database and fictional fixtures unless a live action is explicitly within the user's scope.

| Setting | Local | Cloudflare |
| --- | --- | --- |
| Four public `VITE_FIREBASE_*` values | `.env` | Build variables |
| `FIREBASE_PROJECT_ID` | `.dev.vars` | Worker vars in `wrangler.jsonc` |
| `STAFF_EMAILS` | `.dev.vars` | Worker **runtime secret**, not build secret |
| D1 | Wrangler local state | `DB` binding and account-specific `database_id` |

Do not commit real `.env`, `.dev.vars`, API tokens, passwords, database dumps or candidate data. Examples contain blank values only. Firebase web configuration/project IDs and D1 UUIDs identify resources but do not grant access. Do not replace a working account's identifiers with placeholders during maintenance.

Firebase must enable Google and authorise the actual website hostname; add localhost separately for local sign-in. Sign-out clears browser state but copied ID tokens may survive until expiry; administrator-level revocation checks are not implemented. Allowlist removal is rechecked per request.

Workers Builds uses `pnpm run build`. Deployment may use:

```sh
pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.jsonc && pnpm run deploy
```

This needs D1 permissions on the build token. Check current build settings before assuming migrations run automatically. If migrations run separately, deployment is `pnpm run deploy`. Never use `pnpm deploy` as shorthand: pnpm has a different built-in command with that name.

The old hosting platform's database is separate and is not automatically migrated by this repo. Never assume a new D1 database contains historical records.

## Commands and verification

Use Node 24, pnpm 11.25.0, and Python 3 available as `python` for the SQLite regression test. Use a folder outside OneDrive for large installs when feasible. Keep the lockfile; do not switch package managers as a troubleshooting shortcut.

```sh
pnpm install --frozen-lockfile
pnpm db:local
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm audit
```

The 40-test baseline covers auth/token rejection, request isolation, matching, education/batches, shared contacts, CSV protection, model/runtime hashes, document parsing and migration/paging/export with 2,505 fictional rows. That is not a complete live load test or an accuracy guarantee.

Use meaningful checks for behaviour changes:
- Auth: approved/unapproved accounts; absent/expired/tampered/wrong-project token; authenticated CSV; sign-out; missing-runtime-setting error.
- Candidate: manual + PDF/DOCX/TXT, corrupt/scanned/oversize document, unknown fields, pursuing vs completed degree, shared contact, consent, duplicate/retry, closed role/drive, no-interest submission.
- Matching: all roles remain visible, basic fallback, slow model, stale result after navigation, memory on intended Android devices.
- Staff: draft/open/closed, active batch-rule switching, correction, follow-up, filtered paging and export beyond one page, reference-confirmed deletion.
- UI-only: verify mobile width, touch controls, keyboard focus, loading/error/empty states. Do not alter business logic merely to restyle a page.

For migrations, append new ordered SQL and matching schema/metadata changes; test on a fresh DB and a copy of the previous schema. Preserve history and data. Back up and verify recovery before production-destructive changes. Do not apply test fixtures to the live database.

## Known maintenance work - verify current status

The 8 Nov 2026 source audit found no committed private credentials in the then-current main/history, but `pnpm audit` reported 48 advisories (18 high, 22 moderate, 8 low). Package advisories require reachability assessment and tested updates, especially direct Zod usage. Many others concern build tooling or unused Node paths of browser libraries. A green test suite is not a clean security audit. Re-run the scan; do not preserve these counts as permanent truth. `.npmrc` currently disables automatic install audit output.

Other follow-ups: explicit access-check retry when Google identity is unchanged after a server denial; physical Android memory/performance and relevance evaluation; agreed retention/backups; no project-wide LICENSE yet. A cached export start time does not make concurrent record edits an immutable export snapshot.

Harmless migration leftovers include Next/Vinext paths in type/ignore config, Sites store/cache settings in pnpm workspace policy, an optional BUCKET declaration, a terminal.local dev host and unused styles/directives. Inspect references before removing; they are not evidence of live services. Keep upstream attribution and model/runtime assets.

## Finish a change

Report the problem and resulting behaviour, files changed, exact checks and whether they passed, migrations/env additions, operational limits and how to roll back. Update this file and the deployment guide if contracts change. Do not inflate accuracy, uptime, production-readiness or test coverage claims. Never claim a deploy, Git push, live Google login or real-device test happened unless its result was observed.

For a new IDE session, a sufficient starting request is: "Read AGENTS.md and docs/DEPLOYMENT.md, inspect the current source, then [describe the desired change]. Preserve the product and security contracts and verify the change before reporting completion."
