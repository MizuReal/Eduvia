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
  react-hook-form + Zod, Tiptap 3, react-dropzone, `@dnd-kit` sortable controls,
  `@tanstack/react-table` for result summaries, Vitest + React Testing Library.
- **Backend** — Node.js ESM, Express 5, strict TypeScript (NodeNext), Zod 4, Supabase JS,
  jose, pino, helmet, multer, file-type, mammoth, sharp, yauzl, sanitize-html, Vitest + Supertest.
  Presentation previews also require LibreOffice (`soffice`) and Poppler (`pdftoppm`).
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
docs/SPEC.md             Product contract — API, files/uploads, quizzes, enrollment, database + RLS
frontend/src/services/   API + Supabase auth wrappers (only place Supabase is called)
frontend/src/context/    AuthContext provider
frontend/src/components/content/  Tiptap editor, slide rail, asset node views
frontend/src/{pages,components,types,config,schemas}/
frontend/src/test/       Vitest setup and shared doubles
frontend/src/__tests__/  Vitest suites
backend/src/app.ts       createApp() factory
backend/src/server.ts    HTTP listener and graceful shutdown
backend/src/routes/      Feature routers
backend/src/{controllers,services,schemas,middleware,db,config,errors,lib,types,utils}/
backend/src/storage/     Supabase Storage adapters
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
- Topic content: the slides editor and docs editor use the shared Tiptap editor/renderer.
  Images and embedded files are custom nodes that store only file ids; resolve them through
  signed URLs. Uploads use the shared progress, cancel, retry, processing, ready, and failed
  states.
- Quiz authoring: the **Quiz** tab offers native A–D question editing or a PDF/DOCX paper with an
  A–D answer key. Preview grading calls the server; never compute a score in the browser.
- Enrollment: teachers share an invite link, choose approval or auto-accept, and manage a
  roster. Students see active subjects, a read-only topic/lesson table of contents, and each
  topic's Tiptap slides or uploaded presentation previews. Never expose docs or quizzes in this
  pass.
- Quiz runner: autosave answers, resume in-progress attempts, confirm before submitting, never
  reveal answers before submission, and show a pass congratulation with a review after passing.
  Failed attempts show the score and retry action but never reveal correct answers. There is no
  timer because quizzes have no time-limit setting.
- Teacher quiz results: sortable datatables for a topic's full roster (every active student,
  including “Not taken”) and for one student's published quizzes across the subject. Default the
  class view to last name and the student view to highest percentage first. Export the current
  order as CSV or through the browser print dialog (Save as PDF); never compute grades in the
  browser.
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
- File validation: extension allowlist, size, magic bytes with `file-type`, image decode and
  re-encode with `sharp`, SHA-256 checksum, per-user quota, and short-lived signed URLs.
- Topic content: validate Tiptap JSON against the server allowlist before persistence, and
  validate every embedded file reference against its owning content item.
- Quizzes: validate mode, question counts, unique options, and answer keys with Zod; enforce
  ownership in the service. Grading is server-side only and preview attempts are never stored.
  DOCX quiz papers are converted with `mammoth` plus `sanitize-html` before storage.
- Enrollment: every teacher action verifies course ownership; every student action derives the
  student id from the authenticated token. Enrollment mutations are idempotent and never trust a
  client-supplied status or student id.
- Student learning: verify active enrollment and topic unlock state on every progress, content,
  and quiz route. Attempts snapshot the quiz before answers are accepted; grading reads only the
  snapshot. Autosave replaces the answer set transactionally, and submission is atomic.
- Presentation previews: convert uploaded PPTX files to PDF with LibreOffice, render pages to
  WebP with Poppler and `sharp`, and store them under the file's `previews/` prefix. Enforce a
  200-slide cap, command timeouts, and temp-directory cleanup. Fail the upload without replacing
  the previous presentation if preview generation fails.
- All third-party calls originate here. No server-side fetching of user-supplied URLs (no SSRF).
- Write admin actions, role changes, course and quiz publishing, unpublishes, quiz paper
  replacement/removal, quiz deletion, and content removals to `audit_logs`.

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
- Table list, buckets, and the per-role RLS matrix: **`docs/SPEC.md` §5**.

## Domain invariants

- Self-registration requires a `TUPT-XX-XXXX` username with digits, first/middle/last name,
  faculty, and role. Student accounts are open; instructor accounts require the backend-only
  teacher registration code. Legacy usernames remain valid for sign-in.
- Courses are `draft`, `published`, or `archived`. Only the owner or an admin may edit.
  Publishing requires at least one lesson with at least one block, and is transactional.
- Course lifecycle status remains target behavior. Current enrollment availability is controlled
  separately by `courses.enrollment_open`, so a subject can be open for joining without a full
  publish workflow.
- Course codes are generated from the course name when omitted, with a numeric suffix for
  collisions in the same instructor/trimester/year-level scope. Custom codes remain supported and
  must satisfy the same uniqueness rule.
- Courses contain ordered topics; topics contain ordered lessons. The table of contents is the
  ordered projection of those rows — there is no separate table-of-contents table.
- Topics and lessons are ordered; reordering happens in one transaction and preserves a
  contiguous `order_index`. Moving a lesson to another topic appends it to that topic.
- Deleting a topic soft-deletes its lessons as one batch. Restoring the topic restores that
  batch; individually deleted lessons remain in the trash. Restored topics and lessons append.
- Lesson blocks have explicit types: `text`, `image`, `file`, `video`, `quiz`.
- Topic content is a singleton workspace per topic: one Tiptap slides document, one Tiptap
  document, one uploaded presentation, and one quiz. The editor opens directly on the PPTX tab;
  Docs, Upload, and Quiz are the other three tabs.
- The slides editor stores a versioned list of slides, each a Tiptap document. Docs and slides
  store embedded image/file references as file ids, never signed URLs or base64 data.
- Uploaded presentations keep the original file and a required summary. Replacing an upload
  creates a new file record and soft-deletes the previous file once the new file is ready.
  Per-slide WebP previews are generated at upload and stored beside the original.
- A quiz is either `native` (10–20 A–D multiple-choice questions authored in Eduvia) or
  `document` (a PDF/DOCX paper plus a numbered A–D answer key). Mode is fixed once created.
- Native questions have one correct A–D option and duplicate options are rejected. Document
  papers are replaced as new file records; the previous paper is soft-deleted once the new file is
  ready.
- Publishing requires 10–20 complete answers and, for document quizzes, a `ready` paper.
  Publishing increments `version`; drafts stay on version 1.
- Teacher preview grading is server-side and never persisted. Student attempts are persisted as
  `quiz_attempts` with an immutable snapshot and `attempt_answers`; there is no timer in this
  pass.
- Slides finish when the student reaches the last slide of either available deck. Topics with no
  slides count as slide-complete; topics with no published quiz complete after their slides.
- A topic is unlocked only when the previous topic is complete. The backend re-enforces this on
  content, progress, and quiz routes.
- Failed quizzes may be retried; passed quizzes cannot be retaken. Passing a topic unlocks the
  next topic immediately.
- Teacher result summaries read the best graded attempt per student and quiz (highest
  percentage, latest on a tie). The topic summary lists every active enrolled student, including
  “Not taken”; the student summary lists every published quiz across the subject's topics.
  Results never expose correct answers and are read-only.
- A subject has one enrollment setting: open or closed, with `approval` or `auto` mode. New
  subjects start closed and require approval.
- One enrollment row exists per `(course_id, student_id)` with status `pending`, `active`,
  `rejected`, or `removed`. Rejected and removed students may request again.
- Removing a student revokes subject access immediately. Approval, rejection, and removal are
  restricted to the course owner.
- Students see subject metadata, the ordered topics/lessons, and each topic's slides/presentation
  previews. Docs, quizzes, and other lesson content remain out of scope until the student runner
  lands.
- Course text is stored as Tiptap JSON and rendered through the shared renderer or converted to
  sanitized HTML server-side. Raw client HTML is never rendered.
- Students self-enroll through the subject invite link; enrollment is idempotent. Instructors
  manage the roster for courses they own.
- Lesson completion is idempotent and recalculates enrollment progress from completed lessons.
- An upload is invisible to students until it reaches `ready`. Validate by magic bytes with
  `file-type`; never trust the extension or the client `Content-Type`.
- Details: **`docs/SPEC.md` §2** for files and uploads, **§3** for quizzes, **§4** for
  enrollment.

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
  upload states, slides editing, embedded image/file rendering, quiz authoring and preview
  states, enrollment dashboard and invite flows, teacher roster actions, student topic slide
  viewers, topic status/locking, quiz autosave/submission/results, quiz resume behavior, and
  accessibility-critical interactions.
- Backend: Vitest + Supertest. Suites live in `backend/tests/*.test.ts`; env setup and fixtures in
  `backend/src/test/`. Cover auth middleware, role authorization, Zod validation, Tiptap content
  validation, embedded-file ownership, image/document validation, signed URL issuance, quiz
  authoring and preview grading, enrollment approval/auto/removal, student topic slides,
  presentation preview conversion, topic progress and locking, quiz attempts and grading,
  attempt snapshots, and soft-delete behavior.
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
