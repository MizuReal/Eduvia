# AGENTS.md

Eduvia is a web-only learning management system: instructors author courses, lessons, files,
and quizzes; students enroll, consume content, and track progress; admins manage users, roles,
and content. Web-only — there is no mobile client and no media transcoding pipeline.

## Read this first

1. **This file** — operating rules for every change.
2. **`docs/SPEC.md`** — the detailed product contract (API routes, files/uploads, quizzes,
   database + RLS). Read the relevant section before domain work.
3. **`DESIGN.md`** — design tokens and component treatments. Read before any UI work.

## Stack

- **Frontend** — React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), React Router 6,
  react-hook-form + Zod, Tiptap 3, react-dropzone, Vitest + React Testing Library.
- **Backend** — Node.js ESM, Express 5, strict TypeScript (NodeNext), Zod 4, Supabase JS,
  jose, pino, helmet, multer, file-type, mammoth, sharp, yauzl, sanitize-html, Vitest + Supertest.
- **Data** — Supabase Postgres, Auth, and Storage. Schema lives in `schemas/`.

## Commands

```bash
cd frontend && npm run lint && npm test && npm run typecheck   # typecheck is `tsc -b`
cd backend  && npm run lint && npm test && npm run typecheck   # typecheck is `tsc --noEmit`
```

There is no CI pipeline yet. These three gates are the gate.

## Repository map

```
schemas/                 Ordered SQL migrations (001_profiles.sql, 002_courses.sql, ...)
DESIGN.md                Design system — single source of truth for all UI
docs/SPEC.md             Product contract — API, files/uploads, quizzes, database + RLS
frontend/src/services/   API + Supabase auth wrappers (only place Supabase is called)
frontend/src/context/    AuthContext provider
frontend/src/{pages,components,types,config,schemas}/
frontend/src/test/       Vitest setup and shared doubles
frontend/src/__tests__/  Vitest suites
backend/src/app.ts       createApp() factory
backend/src/server.ts    HTTP listener and graceful shutdown
backend/src/routes/      Feature routers
backend/src/{controllers,services,schemas,middleware,db,config,errors,lib,types,utils}/
backend/tests/           Supertest API and integration tests
backend/src/test/        Env setup and token fixtures
```

## Non-negotiables

These are stated once, here. Every other section assumes them.

1. **The backend is the only gateway to application data.** The frontend reaches Supabase only
   through `frontend/src/services/authService.ts` for sign-in, sign-out, session refresh, and
   auth-state subscription — never tables, RPC, or storage.
2. **The service-role key never leaves the backend.** It lives in `backend/src/config/` and
   `backend/src/db/` only — never in `frontend/`, logs, error responses, or bundles. Only
   `VITE_*` values reach the browser, and a `VITE_*` value is never a secret.
3. **RLS is enabled on every table and every bucket**, with explicit policies and no implicit
   public access. No public-read bucket. Disabling RLS is forbidden.
4. **Authorization is enforced server-side** on every protected route, plus per-resource
   ownership, enrollment, and role checks in services. Never trust a client-supplied user id,
   role, or ownership value. Return 404 for resources the caller cannot see; use 403 only when
   the resource's existence is not sensitive.
5. **Secrets, tokens, cookies, signed URLs, and file contents never appear** in logs, error
   responses, analytics, or commits.
6. **Deleting a course, lesson, file, or profile is a soft delete** (`deleted_at`). Application
   code never hard-deletes records.
7. **Signed storage URLs are short-lived and scoped**, and are never logged or cached.
8. **Students never receive correct answers, accepted answers, correct option ids,
   explanations, or scoring keys before submission.** Grading is server-side only; a score,
   points value, or pass/fail from the client is always rejected.
9. **Every visual decision comes from `DESIGN.md` tokens.** Express a new treatment with the
   existing vocabulary first; adding a token requires updating `DESIGN.md` in the same change.
10. **A change is done only when lint, tests, and typecheck pass** in every affected app.

## TypeScript & style

- `strict` on, `allowJs` off; source is `.ts`/`.tsx` only. JavaScript is confined to tooling.
- Backend is ESM: relative imports use `.js` specifiers. Frontend imports stay extensionless.
- No `any` without an inline justification — prefer `unknown` plus narrowing. No `@ts-ignore`;
  `@ts-expect-error` only with a reason. No JSDoc type annotations.
- Use `import type` for type-only imports. `const` by default; `let` only for reassignment;
  `var` is forbidden.
- Named function declarations at top level; arrows for callbacks and hooks. Async/await only.
  Every awaited call is handled — translated in a `catch` or forwarded to the error middleware.
- `camelCase` for values, functions, hooks; `PascalCase` for components and types;
  `SCREAMING_SNAKE_CASE` for module constants. Files: `PascalCase.tsx` components,
  `camelCase.ts` everything else.
- No magic numbers or strings — name them at the top of the file or in `config/`.
- Comments explain *why*, never *what*. No commented-out code, no stubs, no TODOs, no empty or
  placeholder bodies, and no swallowed errors.
- One responsibility per module; split a file that does two unrelated things.
- A feature ships whole: authorization, validation, persistence, error handling, tests, and UI
  states together. Partial features are not merged.

## Frontend

- React 19 function components and hooks only. No class components.
- Routing: React Router 6. Guard routes by authentication and role; the server stays the
  authority for every permission check.
- Auth: one `AuthProvider` at the root subscribing through `services/authService.ts`. Children
  read auth state from context and never call `supabase.auth.getSession()` ad hoc.
- Every network call goes through `frontend/src/services/`. Components and hooks never call
  `fetch`, the API, or Supabase directly.
- Forms use react-hook-form + Zod schemas from `frontend/src/schemas/`: inline field errors,
  submit disabled while pending, visible server-error summary, no double submit.
- `useEffect` lists all dependencies. An empty dependency array requires a comment explaining why
  mount-only is intended.
- Prop drilling beyond two levels is a signal to use Context or a shared hook.
- Uploads: drag-and-drop **and** a keyboard-accessible picker; accepted types and size limits
  shown before selection; progress, cancel, retry, processing, ready, failed, and quarantined
  states; progress announced via `aria-live`. Never fire-and-forget an upload.
- Video: native HTML5 player, `preload="metadata"`, no autoplay, keyboard controls, optional
  WebVTT captions. No custom streaming UI.
- Rich text: the shared Tiptap editor and renderer, storing Tiptap JSON. Never pass unsanitized
  HTML to `dangerouslySetInnerHTML`.
- Quiz runner: autosave answers, support resume, show time remaining, confirm before submitting,
  never reveal answers before submission.
- Every page that fetches data implements loading (skeleton, not a layout-shifting spinner),
  empty, error, and permission-denied states.
- Styling: Tailwind utilities composed from `DESIGN.md` tokens. No CSS modules, no CSS-in-JS.
  Dynamic layout values (percentages, chart and progress dimensions) may use `style={{}}`;
  nothing else is inline.
- Accessibility: WCAG 2.2 AA — keyboard path, visible focus, labelled controls, 4.5:1 contrast,
  44px targets, alt text, captions, and respect for `prefers-reduced-motion`.
- Status is never conveyed by color alone, anywhere.
- Lesson reading surfaces use a measure of roughly 65–75 characters per line.
- Client-side validation is a UX convenience only; the server re-enforces every limit.

## Backend

- `app.ts` exports `createApp()` for tests. `server.ts` owns the listener, signal handling, and
  graceful shutdown. Never listen from `app.ts`.
- Routes are grouped by feature domain in `src/routes/`; split `routes/index.ts` into per-feature
  routers as features land rather than letting one router grow monolithic.
- Controllers are thin: parse with Zod, call a service, return a typed response. Business logic
  lives in `src/services/`.
- Every request body, query, and route parameter is parsed by a Zod schema in `src/schemas/`
  before use. Controllers never read raw `req.body`.
- Every route declares a response type or schema. No untyped `res.json()` payloads.
- Errors: throw `AppError` (`src/errors/AppError.ts`) with `statusCode`, `code`, `message`, and
  optional `details`. The error middleware maps it to the standard envelope; unknown failures
  become a generic 500 with no stack traces or internals. Never send a response after
  `next(error)`.
- Express 5 forwards rejected async handlers to the error middleware. Do not swallow errors.
- Auth: verify the Supabase JWT with `jose` in `src/lib/jwt.ts` + `src/middleware/auth.ts` —
  JWKS derived from `SUPABASE_URL`, `SUPABASE_JWT_SECRET` only for legacy HS256 projects.
  Attach the authenticated user and role to the request, typed in `src/types/express.d.ts`.
- Role checks: `src/middleware/roles.ts` for coarse gates; per-resource ownership in services.
- Config: parsed and validated with Zod at boot in `src/config/env.ts`, exposed through
  `src/config/`. Never read `process.env` elsewhere.
- Logging: `pino` with `pino-http` and request ids. No `console.log` in production code. Redact
  `authorization`, `cookie`, passwords, tokens, signed URLs, and file contents.
- Security middleware: `helmet`, an explicit CORS allowlist from `CORS_ALLOWED_ORIGINS`
  (wildcard forbidden in production), JSON bodies capped by `JSON_BODY_LIMIT`, and rate limits
  from `AUTH_RATE_LIMIT_*` on auth-adjacent, upload, quiz-start, and quiz-submit endpoints.
- Uploads: `multer` disk storage in a dedicated temp directory with hard size limits, streamed to
  Supabase Storage, temp files deleted in `finally`. Never buffer a large video in memory.
- All third-party calls originate here. No server-side fetching of user-supplied URLs (no SSRF).
- Write admin actions, role changes, publishes, unpublishes, and content removals to `audit_logs`.

## Data & Supabase

- Schema changes only as ordered migrations in `schemas/` (`0NN_name.sql`), never via a dashboard.
- Every table has `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`. Tables with mutable rows also
  have `updated_at` and a trigger that maintains it.
- Foreign keys on every relationship, with an explicit `ON DELETE` choice.
- Multi-row changes run in a transaction: course publishing, lesson reordering, quiz publishing,
  attempt submission, and manual grading.
- Unique constraints prevent duplicate enrollments (`course_id, student_id`), duplicate lesson
  progress (`lesson_id, student_id`), duplicate answers (`attempt_id, question_id`), and
  duplicate attempt numbers.
- `audit_logs` is append-only. Quiz attempts and their answers are append-only after submission;
  only `in_progress` attempts may update answers.
- Never overwrite a file in place: a replacement is a new record, and the old one is soft-deleted
  once the new file is ready.
- No orphaned records or storage objects. Cleanup jobs are idempotent and auditable.
- Table list, buckets, and the per-role RLS matrix: **`docs/SPEC.md` §4**.

## Domain invariants

- Courses are `draft`, `published`, or `archived`. Only the owner or an admin may edit.
  Publishing requires at least one lesson with at least one block, and is transactional.
- Course codes are generated from the course name when omitted, with a numeric suffix for
  collisions in the same instructor/trimester/year-level scope. Custom codes remain supported and
  must satisfy the same uniqueness rule.
- Courses contain ordered topics; topics contain ordered lessons. The table of contents is the
  ordered projection of those rows — there is no separate table-of-contents table.
- Topics and lessons are ordered; reordering happens in one transaction and preserves a
  contiguous `order_index`.
- Lesson blocks have explicit types: `text`, `image`, `file`, `video`, `quiz`.
- Course text is stored as Tiptap JSON and rendered through the shared renderer or converted to
  sanitized HTML server-side. Raw client HTML is never rendered.
- Students self-enroll only in published courses; enrollment is idempotent. Instructors and
  admins manage enrollment for courses they manage.
- Lesson completion is idempotent and recalculates enrollment progress from completed lessons.
- An upload is invisible to students until it reaches `ready`. Validate by magic bytes with
  `file-type`; never trust the extension or the client `Content-Type`.
- Details: **`docs/SPEC.md` §2** for files and uploads, **§3** for quizzes and grading.

## API

- All endpoints are `kebab-case` under `/api/`. Success: `{ "data": ..., "error": null }`.
  Failure: `{ "data": null, "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." } }`
  with an optional `details` array of field paths and messages.
- Paginated lists include `total`, `page`, and `limit` alongside `data`.
- All timestamps are UTC ISO 8601 (`2026-08-25T12:00:00Z`).
- HTTP status codes are semantically correct. 200 is never an error response.
- Mutating endpoints that may be retried accept an `Idempotency-Key` header.
- File uploads use `multipart/form-data` with a single `file` field plus the target course or
  lesson id. `GET /api/files/:fileId/url` returns `{ "url": "...", "expiresAt": "..." }`.
- In-progress attempt responses omit correct answers, correct option ids, accepted answers,
  explanations, and scoring keys.
- Full route table: **`docs/SPEC.md` §1**.

## Testing

- Frontend: Vitest + React Testing Library in jsdom. Suites live in `frontend/src/__tests__/`;
  setup and shared doubles in `frontend/src/test/`. Cover role-aware routing, form validation,
  upload states, quiz runner timer and resume behavior, and accessibility-critical interactions.
- Backend: Vitest + Supertest. Suites live in `backend/tests/*.test.ts`; env setup and fixtures in
  `backend/src/test/`. Cover auth middleware, role authorization, Zod validation, quiz grading,
  attempt snapshots, file validation, signed URL issuance, and soft-delete behavior.
- Tests never touch a real Supabase project, storage, or the network. Mock
  `services/supabaseClient.ts`, `db/supabaseAdmin.ts`, storage calls, and `fetch`. Values come
  from committed `frontend/.env.test` and `backend/.env.test`; tests pass with no `.env` present.
- Every feature covers the happy path, validation failures, permission failures, and
  duplicate/retry behavior.

## Working agreements

- Keep `AGENTS.md`, `DESIGN.md`, and `docs/SPEC.md` in sync with the code in the same change.
- `.env` is never committed. `frontend/.env.example` and `backend/.env.example` carry every
  required key with empty values.
- Uploaded files, generated previews, temporary uploads, and local storage data are never
  committed.
- Treat all user-generated content as untrusted: course text, quiz content, filenames, metadata,
  and uploaded files.
