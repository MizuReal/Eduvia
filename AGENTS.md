# AGENTS.md

## Project Overview

Eduvia is a web-only learning management system where instructors create courses and
lessons, build quizzes, and upload learning materials such as Word documents, PDFs,
presentations, images, and short videos. Students enroll in published courses, consume
content, take quizzes, and track their progress. Admins manage users, roles, and content.

Full-stack application: React web frontend (Vite + Tailwind CSS), Node.js + Express 5
backend in strict TypeScript, and Supabase for authentication, PostgreSQL, and Storage.
The application is web-only and has no media transcoding pipeline.

---

## Repository Structure

```
project-root/
├── website/                # React web (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── services/       # Centralized API + Supabase auth wrappers
│   │   ├── components/
│   │   ├── context/        # React Context providers
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/
│   │   ├── test/           # Shared test doubles and fixtures
│   │   ├── types/
│   │   └── utils/
│   └── ...
├── backend/                # Node.js + Express 5 (strict TypeScript)
│   ├── src/
│   │   ├── app.ts          # Express app factory
│   │   ├── server.ts       # HTTP listener and graceful shutdown
│   │   ├── routes/         # Feature routers
│   │   ├── controllers/    # Thin request handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation, errors, uploads, rate limits
│   │   ├── schemas/        # Zod request, response, and domain schemas
│   │   ├── db/             # Supabase clients and query helpers
│   │   ├── storage/        # Upload, validation, preview, and signed URLs
│   │   ├── config/         # Environment parsing and constants
│   │   ├── test/           # Shared test doubles and fixtures
│   │   └── utils/
│   └── tests/              # API and integration tests
├── schemas/                # Supabase SQL migration files
├── DESIGN.md               # Design system — single source of truth for all UI work
└── AGENTS.md
```

---

## General Rules

- Write production-quality code on every generation — no stubs, no TODOs, no placeholder logic.
- Never leave a function body empty or return `null`/`undefined` without an explicit reason.
- All error paths must be handled. Silent failures are forbidden.
- No commented-out code in commits. If code is removed, it is gone.
- Comments explain *why*, never *what*. Self-documenting names eliminate the need for what-comments.
- No magic numbers or magic strings. Extract to named constants at the top of the file or in `config/`.
- One responsibility per module. If a file is doing two unrelated things, split it.
- Never hardcode credentials, URLs, ports, file limits, or environment-specific values inline.
  All configuration comes from environment variables or named module constants.
- Never commit `.env`. Maintain `.env.example` with every required key and empty values for
  both `website/` and `backend/`.
- Never commit uploaded files, generated previews, temporary uploads, or local storage data.
- Treat all user-generated content as untrusted: course text, quiz content, filenames, metadata,
  and uploaded files.
- Every feature is complete only when authorization, validation, persistence, error handling,
  tests, and UI states are all implemented where applicable.
- Client-side validation is a UX convenience, never a security control. Enforce limits and
  permissions again on the server.
- Keep `AGENTS.md` and `DESIGN.md` in sync with the code. Any new rule, token, or visual pattern
  ships with its documentation update.

---

## Testing & CI

- Website tests: `cd website && npm test` (Vitest + jsdom + React Testing Library).
- Backend tests: `cd backend && npm test` (Vitest + Supertest).
- Unit tests live in `__tests__/` directories next to the modules they cover, named `*.test.ts`.
  API and integration tests live in `backend/tests/`.
- Shared test doubles live in `website/src/test/` and `backend/src/test/`. They include the
  Supabase client mock, auth fixtures, storage mock, and upload fixtures used by service tests.
- Tests never touch a real Supabase project, real storage, or external network. Mock
  `services/supabaseClient.ts`, `db/supabaseAdmin.ts`, storage calls, and `fetch`.
  Fake values come from committed, non-secret files such as `website/.env.test` and
  `backend/.env.test`; tests must pass with no `.env` present.
- Backend tests must cover: auth middleware, role authorization, Zod validation, quiz grading,
  attempt snapshots, file validation, signed URL issuance, and soft-delete behavior.
- Website tests must cover: role-aware routing, form validation, upload states, quiz runner
  behavior, timer/resume behavior, and accessibility-critical interactions.
- Run `npm run lint`, `npm test`, and `npm run typecheck` in the affected app before considering
  a change complete.
- CI (`.github/workflows/ci.yml`) runs lint, tests, and `npm run typecheck` for both `website`
  and `backend`. It also verifies that every migration in `schemas/` is present and ordered.

---

## TypeScript / JavaScript

- TypeScript (`strict`) is the standard for both `website` and `backend`; `allowJs` is off, so
  source files are `.ts`/`.tsx` only. The only JavaScript kept is tooling and entry config.
- Backend is ESM (`"type": "module"`) compiled with `tsc` using `NodeNext`. Relative imports in
  backend source use `.js` specifiers. Frontend relative imports remain extensionless.
- No JSDoc type annotations. No `any` except with an inline justification comment — prefer
  `unknown` plus narrowing. No `@ts-ignore`; `@ts-expect-error` with a reason only.
- Use `import type` for type-only imports. Do not import types as runtime values.
- `const` by default. `let` only when reassignment is required. `var` is forbidden.
- Functional components and hooks only. No class components.
- Named exports preferred over default exports, except for page components.
- Arrow functions for callbacks and hooks. Named function declarations for top-level functions.
- Async/await only. No `.then().catch()` chains. Never let unhandled promise rejections surface.
- Every awaited call is either inside a `try/catch` that translates the failure, or inside an
  Express handler whose rejection is forwarded to the central error middleware.
- Destructure props and objects at the top of the function body, not inline.
- Styling: Tailwind CSS exclusively on the website. Dynamic layout values (percentage widths,
  chart dimensions, progress values) via `style={{}}` are acceptable when Tailwind cannot express
  them. All other inline styles are forbidden.
- `camelCase` for variables, functions, hooks. `PascalCase` for components and types.
  `SCREAMING_SNAKE_CASE` for module-level constants.
- File names: `PascalCase` for components (`QuizCard.tsx`), `camelCase` for everything else
  (`useQuizAttempt.ts`).
- Custom hooks must be prefixed with `use` and encapsulate all logic for a single concern.
- All frontend Supabase calls go through `website/src/services/`. No raw `supabase.from()`,
  `supabase.rpc()`, `supabase.storage`, or `supabase.auth.*` calls inside components, hooks, or
  pages.
- **The backend is the sole gateway for application data and external services.** The frontend
  may use Supabase only through the auth service for sign-in, sign-out, session refresh, and
  auth state subscription. It must never query tables or storage directly.
- Prop drilling beyond two levels is a signal to use Context or a shared hook.
- `useEffect` must list all dependencies. No empty dependency arrays unless the intent is truly
  mount-only, with a comment explaining why.

---

## React Web

- Routing: React Router v6. `createBrowserRouter` preferred; component-based
  `BrowserRouter` + `Routes`/`Route` acceptable.
- Route structure: public catalog and course preview, authenticated student area, instructor
  authoring area, and admin area. Guard routes by authentication and role; the server remains
  the authority for every permission check.
- Global state: React Context. Redux Toolkit only for complex cross-cutting state when Context
  becomes unwieldy.
- Supabase auth: a single `AuthProvider` at the root, subscribing through
  `services/authService.ts` via `supabase.auth.onAuthStateChange()`. Child components read auth
  state from context and never call `supabase.auth.getSession()` ad hoc.
- Environment variables: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Never
  hardcode these values in source files.
- Styling: Tailwind CSS exclusively. No CSS modules, no CSS-in-JS libraries.
- Forms: controlled inputs, inline field errors, disabled submit while pending, and a visible
  summary for server-side validation failures. Never submit twice on rapid clicks.
- File upload: drag-and-drop **and** a keyboard-accessible file picker. Show accepted types and
  size limits before selection, upload progress, cancel, retry, processing, ready, failed, and
  quarantined states. Announce progress changes with `aria-live`.
- Video: use the native HTML5 player with `preload="metadata"`, no autoplay, keyboard controls,
  and optional WebVTT captions. Do not build a custom streaming UI.
- Rich text: use the shared Tiptap editor and renderer. Store Tiptap JSON, not raw client HTML.
  Never pass unsanitized HTML to `dangerouslySetInnerHTML`.
- Quiz runner: autosave answers, support resume, show time remaining, confirm before submitting,
  and never expose correct answers before submission.
- Empty, loading, error, and permission-denied states are required for every page that fetches
  data. Use skeletons rather than layout-shifting spinners where appropriate.
- Accessibility: WCAG 2.2 AA. Keyboard navigation, visible focus, labelled controls, 4.5:1
  contrast, 44px minimum touch targets, alt text, captions, and respect for
  `prefers-reduced-motion`.
- ESLint + Prettier must be configured. Minimum: `eslint:recommended` +
  `plugin:react/recommended`.

---

## Design System

- Every UI component, page, and flow must follow the design system in `DESIGN.md`. It is the
  single source of truth for visual style.
- Colors, typography, spacing, radii, shadows, and component treatments come only from tokens
  defined in `DESIGN.md`. No ad-hoc values in implementation code.
- Express new components with the existing token vocabulary before introducing new tokens.
  Adding a token requires updating `DESIGN.md` first.
- Every component defines its default, hover, focus-visible, active, disabled, loading, error,
  and empty states where applicable.
- Never use color alone to communicate status. Pair color with an icon, label, or text.
- Lesson reading surfaces must use a comfortable measure of roughly 65–75 characters per line.
- Keep `DESIGN.md` in sync with the code. Any visual change ships with its `DESIGN.md` update.

---

## Backend (Node.js + Express)

- Express 5 with strict TypeScript. `app.ts` exports `createApp()` for tests; `server.ts` owns
  the listener, signal handling, and graceful shutdown.
- Routes are grouped by feature domain in `src/routes/`. No monolithic router file.
- Controllers are thin: validate the request, call a service, return a typed response. Business
  logic lives in `src/services/`.
- Every request body, query string, and route parameter is validated with a Zod schema from
  `src/schemas/`. Controllers consume the parsed, typed values, never raw `req.body`.
- Every route declares a response type or response schema. No untyped `res.json()` payloads.
- Use a central `AppError` with `statusCode`, `code`, `message`, and optional `details`. The
  error middleware maps known errors to the standard envelope and returns a generic 500 for
  unknown failures without leaking stack traces or internal details.
- Express 5 forwards rejected async handlers to the error middleware. Do not swallow errors and
  do not send a response after calling `next(error)`.
- Auth: verify the Supabase JWT server-side using the project's verification keys or JWKS.
  Attach the authenticated user and role to the request. Never trust a user ID, role, or course
  ownership value supplied by the client.
- Authorization: reusable middleware for authentication and role checks, plus per-resource
  ownership checks in services. Return 404 for resources the caller cannot see; use 403 only
  when the resource's existence is not sensitive.
- Supabase service-role access lives only in `src/db/`. The service-role key must never appear
  in `website/`, logs, error responses, or client bundles.
- Configuration: parse and validate environment variables with Zod at boot. Missing or invalid
  values fail fast. Expose validated config through `src/config/`, never directly from
  `process.env`.
- Logging: structured logging with request IDs. Redact `authorization`, `cookie`, passwords,
  tokens, signed URLs, and file contents. No `console.log` in production code.
- Security middleware: `helmet`, an explicit CORS allowlist, JSON body limits, and rate limits
  on auth-adjacent, upload, quiz-start, and quiz-submit endpoints.
- File uploads: use `multer` with disk storage in a dedicated temporary directory and hard size
  limits. Never buffer a 100 MB video in memory. Stream validated files to Supabase Storage and
  delete temporary files in a `finally` block.
- External services: all third-party calls originate from the backend. Never let the frontend
  call a third-party API directly. No remote URL ingestion or server-side fetching of
  user-supplied URLs in v1.
---

## Content, Files & Video

### Courses and lessons

- Course states: `draft`, `published`, `archived`. Only the owner or an admin may edit a course.
- Publishing requires at least one lesson with at least one block. Publishing is a transaction.
- Lessons are ordered. Reordering happens in a single transaction and preserves a contiguous
  `order_index`.
- Lesson blocks have explicit types: `text`, `image`, `file`, `video`, `quiz`.
- Course text is stored as Tiptap JSON. Render it through the shared renderer or convert it to
  sanitized HTML server-side. Never render raw client HTML.
- Students may self-enroll only in published courses. Enrollment is idempotent. Instructors and
  admins may enroll or remove students from courses they manage.
- Lesson completion is idempotent and recalculates enrollment progress from completed lessons.

### Accepted files

- Documents: `.docx`, `.pdf`, `.pptx`, `.txt`, `.md`.
- Images: `.jpg`, `.jpeg`, `.png`, `.webp`.
- Video: `.mp4`, `.webm`.
- Reject legacy `.doc`, macro-enabled `.docm`, executables, scripts, standalone archives
  (`.zip`, `.rar`, `.7z`), and SVG.
- Limits are configuration values, not literals: 25 MB per document, 10 MB per image, 100 MB
  per video, and a per-user storage quota. Reject oversized uploads before transferring them
  to permanent storage.
- Validate by magic bytes with `file-type`; never trust the extension or the client-supplied
  `Content-Type`.
- Sanitize and truncate original filenames for display. Storage paths use UUIDs:
  `courses/{course_id}/{file_id}/{sanitized-name}`. User-controlled paths are forbidden.
- Store a SHA-256 checksum with every file.

### Upload lifecycle

- File states: `uploading`, `processing`, `ready`, `failed`, `quarantined`.
- An upload is not visible to students until it reaches `ready`.
- Show accepted types, limits, and progress before and during upload.
- Support cancel, retry, and a clear failure reason. Never fire-and-forget an upload.
- Delete temporary files on success, failure, and cancellation.
- If a malware scanner is configured, it must pass before `ready`. Without a scanner, only the
  allowlisted types above are accepted, and non-previewable files are served as attachments.
- `.docx` files are converted to sanitized HTML for preview with `mammoth`; enforce ZIP entry
  count, uncompressed size, and conversion timeout limits before parsing.
- `.pdf` files preview inline through a short-lived signed URL. Images preview inline. `.txt`
  and `.md` render as plain text. `.pptx` is download-only in v1.
- Video is stored as uploaded. There is no transcoding, HLS, adaptive streaming, frame
  extraction, or server-side duration probing. Playback uses a short-lived signed URL and the
  storage provider's range requests; do not proxy video through Express.
- Video player: `preload="metadata"`, no autoplay, keyboard controls, and optional WebVTT
  captions. Enforce the size limit, not a duration limit, in lightweight mode.

### Deletion

- Deleting a course, lesson, or file is a soft delete (`deleted_at`). Storage cleanup and
  derived-preview cleanup are separate, auditable jobs.
- Never overwrite an existing file in place. A replacement creates a new file record and
  soft-deletes the old one after the new file is ready.

---

## Quiz System

- Question types: `single_choice`, `multiple_choice`, `true_false`, `short_answer`, `essay`.
- Objective questions (`single_choice`, `multiple_choice`, `true_false`) auto-grade server-side.
- `short_answer` may auto-grade by normalized exact match or be manually graded; the quiz
  setting must be explicit. `essay` is always manually graded.
- Correct answers, accepted answers, and explanations are stored server-side and never sent to
  a student before submission.
- Starting an attempt snapshots the quiz: questions, options, points, correct answers,
  explanations, randomization seed, and question/option order. Later quiz edits cannot change
  an existing attempt.
- Editing a published quiz increments its version. New attempts use the new version; existing
  attempts keep their snapshot.
- Grading is server-side only. Never accept a score, points value, or pass/fail result from the
  client.
- Attempt states: `in_progress`, `submitted`, `pending_review`, `graded`.
- Answers autosave per question. Saves are idempotent and cannot create duplicate answers for
  the same question.
- Time limits are enforced with `started_at` and `expires_at` on the server. Allow a small,
  explicitly configured grace period for network latency; reject later submissions.
- Attempt limits count submitted and graded attempts, not abandoned in-progress attempts.
- Each quiz has an explicit passing score stored server-side; pass/fail is computed during
  grading.
- Multiple-choice scoring is all-or-nothing unless partial credit is explicitly configured for
  that question.
- Manual grading records `points_awarded`, `feedback`, `graded_by`, and `graded_at`. Points
  cannot be negative or exceed the question maximum.
- An attempt becomes `graded` only when all manual questions have been graded.
- Quiz settings define whether correct answers and explanations are visible after submission.
- Results show per-question feedback with an icon **and** text, never color alone.

---

## Supabase

- Auth, user sessions, Storage, and all relational data.
- RLS must be enabled on every table **and every bucket**. Disabling RLS for any reason is
  forbidden.
- Policies must be explicit; no implicit public access.
- All schema changes go through SQL migration files in `schemas/`. Never alter the schema via
  the dashboard without a corresponding migration file.
- Every table has `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`. Tables with mutable rows
  also have `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` and a trigger to maintain it.
- Backend access uses the service-role key. The frontend uses the anon key only for auth flows
  through `services/authService.ts`.
- Never expose the service-role key to client-side code.
- Never hardcode the Supabase URL or anon key in source files. Use environment variables.

### Core tables

`profiles`, `courses`, `lessons`, `lesson_blocks`, `files`, `quizzes`, `quiz_questions`,
`quiz_options`, `quiz_attempts`, `attempt_answers`, `enrollments`, `lesson_progress`,
`audit_logs`.

- `profiles.id` references `auth.users.id`.
- `profiles.role` is constrained to `student`, `instructor`, or `admin`. Only an admin may
  change a role.
- `enrollments` has a unique constraint on `(course_id, student_id)`.
- `lesson_progress` has a unique constraint on `(lesson_id, student_id)` and is idempotent.
- `quizzes` has a monotonically increasing `version`; editing a published quiz increments it.
- `quiz_attempts` references the quiz version and stores the immutable quiz snapshot.
- `attempt_answers` has a unique constraint on `(attempt_id, question_id)`.
- `audit_logs` is append-only and records admin actions, role changes, course publishing, and
  content removal.

### Storage

- Buckets: `course-files`, `course-thumbnails`, `avatars`. All are private.
- Files are served through short-lived signed URLs. No public-read buckets.
- The backend writes to course-scoped paths and records ownership in `files`.
- The backend reads files through the service role only within the owning course's scope.
- Derived previews are stored alongside the original under a `previews/` prefix.
- Storage policies mirror table policies: owners, enrolled students, and admins only.

### RLS expectations

- Published course metadata is publicly readable for the catalog. Draft and archived courses are
  visible only to the owner and admins.
- Students read and update their own profile, read lesson content and quizzes only for published
  courses they are enrolled in, read their own enrollments and attempts, and write their own
  in-progress answers.
- Instructors manage their own courses, lessons, blocks, quizzes, and files, and read the
  enrollments and attempts for their courses.
- Admins manage all rows and all storage objects.
- Policies use `auth.uid()` and a trusted role helper. Never trust a role claim supplied by the
  client or editable by the user.

---

## API Design

- All endpoints use `kebab-case` paths under `/api/`.
- Response envelope for list and action endpoints:

  ```json
  { "data": ..., "error": null }
  ```

- Errors:

  ```json
  { "data": null, "error": { "code": "NOT_FOUND", "message": "..." } }
  ```

- Error codes use `SCREAMING_SNAKE_CASE`. Validation failures may include an optional `details`
  array of field paths and messages.
- Paginated list responses include `total`, `page`, and `limit` alongside `data`.
- All timestamps in responses are UTC ISO 8601 (`2026-08-25T12:00:00Z`).
- HTTP status codes must be semantically correct. 200 is not a valid error response.
- Mutating endpoints that may be retried accept an `Idempotency-Key` header and are safe to
  retry.
- Core endpoints:

  ```
  GET    /api/courses
  POST   /api/courses
  GET    /api/courses/:courseId
  PATCH  /api/courses/:courseId
  POST   /api/courses/:courseId/publish
  POST   /api/courses/:courseId/archive

  GET    /api/courses/:courseId/lessons
  POST   /api/courses/:courseId/lessons
  PATCH  /api/lessons/:lessonId
  DELETE /api/lessons/:lessonId
  POST   /api/lessons/:lessonId/blocks
  PATCH  /api/blocks/:blockId
  DELETE /api/blocks/:blockId

  POST   /api/files
  GET    /api/files/:fileId/url
  DELETE /api/files/:fileId

  POST   /api/enrollments
  DELETE /api/enrollments/:enrollmentId
  GET    /api/enrollments/me
  POST   /api/lessons/:lessonId/complete

  POST   /api/quizzes
  GET    /api/quizzes/:quizId
  PATCH  /api/quizzes/:quizId
  POST   /api/quizzes/:quizId/publish
  POST   /api/quizzes/:quizId/questions
  PATCH  /api/questions/:questionId
  DELETE /api/questions/:questionId
  POST   /api/quizzes/:quizId/attempts
  GET    /api/attempts/:attemptId
  PATCH  /api/attempts/:attemptId/answers
  POST   /api/attempts/:attemptId/submit
  POST   /api/attempts/:attemptId/grade

  GET    /api/users/me
  GET    /api/admin/users
  PATCH  /api/admin/users/:userId/role
  ```

- File uploads use `multipart/form-data` with a single `file` field plus the target course or
  lesson ID. JSON bodies are limited to 1 MB; upload limits are applied per file type.
- `GET /api/files/:fileId/url` returns `{ "url": "...", "expiresAt": "..." }`. Signed URLs are
  never logged, cached, or included in analytics.
- In-progress attempt responses omit correct answers, correct option IDs, accepted answers,
  explanations, and scoring keys.

---

## Data Integrity

- All timestamps are stored and transmitted in UTC ISO 8601. No local time, no Unix epoch, no
  custom formats.
- Every table has `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at` where rows
  mutate.
- Use foreign keys for all relationships. Choose `ON DELETE RESTRICT` or `SET NULL` explicitly;
  never rely on implicit behavior.
- Course publishing, lesson reordering, quiz publishing, attempt submission, and manual grading
  run in transactions where multiple rows change.
- Quiz attempts and their answers are append-only after submission. Only in-progress attempts
  may update answers.
- `audit_logs` is append-only. Never update or delete an audit record.
- Soft-delete courses, lessons, files, and profiles (`deleted_at`). Never hard-delete critical
  records from application code.
- Disabling a user means disabling the Supabase auth user and soft-deleting the profile. Do not
  hard-delete auth records from application code.
- Unique constraints prevent duplicate enrollments, duplicate lesson progress, duplicate
  answers per question, and duplicate attempt numbers.
- Never leave orphaned file records or storage objects. Cleanup jobs are idempotent and
  auditable.

---

## Security

- No secrets in source code, logs, error responses, or client bundles.
- Supabase service-role key: backend only. Never in `website/`, never in a `VITE_*` variable.
- Server-side authentication and authorization on every protected route. No client-enforced
  security gates.
- Enforce authorization per resource (IDOR protection): ownership, enrollment, role, and course
  state are checked server-side.
- Sanitize all user-supplied input. Use parameterized Supabase queries and RPC calls; never
  concatenate user input into SQL, filters, or storage paths.
- Rich text and DOCX-to-HTML previews are sanitized with an allowlist. Strip scripts, event
  handlers, iframes, embedded objects, external URLs, and dangerous attributes.
- CORS on Express must whitelist specific origins from configuration. Wildcard `*` is forbidden
  in production.
- Use `helmet` and a Content-Security-Policy appropriate for the frontend. Do not weaken CSP to
  accommodate unsanitized content.
- CSRF: if cookies are used, set `SameSite` and require a CSRF token. Prefer Bearer tokens for
  API requests.
- File upload security: magic-byte validation, extension allowlist, size limits, path traversal
  prevention, ZIP-bomb limits for Office files, conversion timeouts, and no executable content.
  Never serve SVG or HTML uploads inline.
- Serve previewable files with the correct `Content-Type`. Serve everything else with
  `Content-Disposition: attachment`.
- Signed URLs are short-lived, scoped, and never logged. Do not expose storage paths in public
  API responses when a signed URL is sufficient.
- Rate-limit login-adjacent, upload, quiz-start, and quiz-submit endpoints per IP and per user.
- Enforce HTTPS for all outbound requests. No plaintext HTTP to external services.
- Never fetch user-supplied remote URLs server-side in v1. No SSRF surface.
- Log admin actions, role changes, publishes, unpublishes, and content removals to
  `audit_logs`.
- Run dependency audits in CI and keep Express, Supabase, Zod, Multer, and upload-processing
  libraries current.

---

## Definition of Done

A feature is complete only when all of the following are true:

- The database change exists as an ordered migration in `schemas/` with RLS policies and indexes.
- Request and response shapes are validated with Zod and typed end to end.
- The route is thin, the service owns the business logic, and authorization is enforced.
- The UI uses only `DESIGN.md` tokens and covers empty, loading, error, disabled, and success
  states.
- Accessibility requirements are met, including keyboard access and announced upload progress.
- Unit and integration tests cover the happy path, validation failures, permission failures,
  and retry or duplicate-submission behavior.
- `npm run lint`, `npm test`, and `npm run typecheck` pass in every affected app.
- No secrets, signed URLs, or user file contents appear in logs or commits.
