# Eduvia — Product Specification

The detailed product contract behind `AGENTS.md`. `AGENTS.md` holds the operating rules; this
file holds the shapes, limits, state machines, and policies. Where the two overlap, `AGENTS.md`
wins on process and this file wins on detail.

Scope note: the implemented surface today is auth, profiles, courses, and the course outline
(`course_topics` plus lesson entries), across migrations `001_profiles.sql`,
`002_courses.sql`, and `003_outline.sql`. Lesson content blocks, files, and quizzes below are
the target contract — build them to this spec, not to an approximation of it.

---

## 1. API surface

Every route lives under `/api/`, uses `kebab-case`, and returns the envelope defined in
`AGENTS.md` §API. Routes marked **✓** are shipped today; the rest are the target contract.

```
POST   /api/auth/register                                    ✓
GET    /api/users/me                                         ✓
GET    /api/courses                                          ✓ instructor-only
POST   /api/courses                                          ✓ instructor-only
GET    /api/courses/:courseId                                 ✓ instructor-only
PATCH  /api/courses/:courseId
POST   /api/courses/:courseId/publish
POST   /api/courses/:courseId/archive

GET    /api/courses/:courseId/lessons
POST   /api/courses/:courseId/topics                          ✓ instructor-only
POST   /api/courses/:courseId/lessons                         ✓ instructor-only
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

GET    /api/admin/users
PATCH  /api/admin/users/:userId/role
```

- `POST /api/courses` accepts an optional `code`. When it is omitted, the server generates one
  from the subject name and appends `-2`, `-3`, etc. if that code is already used in the same
  instructor/trimester/year-level scope. If a custom code is supplied, it is used as-is and a
  collision returns `409 COURSE_CODE_TAKEN`.
- `GET /api/courses/:courseId` returns the subject plus its ordered `topics`, each containing its
  ordered `lessons`. The table of contents is derived from those orders.
- `POST /api/courses/:courseId/topics` accepts `{ "title": string }`.
- `POST /api/courses/:courseId/lessons` accepts `{ "topicId": uuid, "title": string }`.
- Uploads are `multipart/form-data`: a single `file` field plus the target course or lesson id.
- JSON bodies are capped at 1 MB (`JSON_BODY_LIMIT`); upload limits come from the per-type table
  in §2.
- `GET /api/files/:fileId/url` responds `{ "url": "...", "expiresAt": "..." }`. The URL is
  short-lived and never logged, cached, or sent to analytics.
- In-progress attempt payloads omit correct answers, correct option ids, accepted answers,
  explanations, and scoring keys.

---

## 2. Files and uploads

### Accepted types and limits

| Class     | Extensions                          | Limit  |
| --------- | ----------------------------------- | ------ |
| Document  | `.docx`, `.pdf`, `.pptx`, `.txt`, `.md` | 25 MB each |
| Image     | `.jpg`, `.jpeg`, `.png`, `.webp`    | 10 MB each |
| Video     | `.mp4`, `.webm`                     | 100 MB each |

Reject legacy `.doc`, macro-enabled `.docm`, executables, scripts, standalone archives (`.zip`,
`.rar`, `.7z`), and SVG. Enforce a per-user storage quota in addition to per-file limits.
Every limit is a configuration value, never a literal in a handler.

### Validation order

1. Extension is on the allowlist.
2. Size is under the class limit — reject before transferring to permanent storage.
3. Magic bytes match the declared class, checked with `file-type`. The client-supplied
   `Content-Type` is advisory only and is never trusted.
4. The per-user quota still has room.
5. If a malware scanner is configured, it must pass before the file becomes `ready`.

Without a scanner, only the allowlisted types above are accepted and non-previewable files are
served as attachments.

### Storage layout

- Paths use UUIDs: `courses/{course_id}/{file_id}/{sanitized-name}`. User-controlled paths are
  forbidden and path traversal is rejected.
- Original filenames are sanitized and truncated for display.
- A SHA-256 checksum is stored with every file record.
- Derived previews sit under a `previews/` prefix beside the original.

### Lifecycle

States: `uploading`, `processing`, `ready`, `failed`, `quarantined`.

- Nothing is visible to students before `ready`.
- The client supports cancel, retry, and a clear failure reason; an upload is never
  fire-and-forget.
- Temporary files are deleted on success, failure, and cancellation.
- A cancelled upload leaves no file record in a visible state.

### Preview matrix

| Type            | Treatment                                                              |
| --------------- | ---------------------------------------------------------------------- |
| `.pdf`          | Inline preview through a short-lived signed URL                        |
| `.jpg/.jpeg/.png/.webp` | Inline preview                                                 |
| `.txt`, `.md`   | Rendered as plain text                                                 |
| `.docx`         | Converted to sanitized HTML with `mammoth`                             |
| `.pptx`         | Download only in v1                                                    |
| `.mp4`, `.webm` | Native player via short-lived signed URL and storage range requests    |

`.docx` conversion enforces ZIP entry count, uncompressed size, and a conversion timeout before
parsing. Everything that is not previewable is served with `Content-Disposition: attachment`.
Storage paths are not exposed in public API responses when a signed URL is sufficient.

### Video

Video is stored as uploaded. No transcoding, no HLS, no adaptive streaming, no frame extraction,
and no server-side duration probing. Playback uses a short-lived signed URL with the storage
provider's range requests; video is never proxied through Express. The size limit is enforced,
not a duration limit.

### Deletion and replacement

- Deleting a course, lesson, or file is a soft delete (`deleted_at`).
- Storage cleanup and derived-preview cleanup are separate, auditable, idempotent jobs.
- A replacement creates a new file record; the old one is soft-deleted only after the new file is
  `ready`. Files are never overwritten in place.

---

## 3. Quizzes

### Question types

`single_choice`, `multiple_choice`, `true_false`, `short_answer`, `essay`.

- Objective types (`single_choice`, `multiple_choice`, `true_false`) auto-grade server-side.
- `short_answer` either auto-grades by normalized exact match or is manually graded — the quiz
  setting must be explicit, never inferred.
- `essay` is always manually graded.

Correct answers, accepted answers, and explanations live server-side and are never sent to a
student before submission.

### Attempt snapshots

Starting an attempt snapshots the quiz: questions, options, points, correct answers,
explanations, randomization seed, and question/option order. Later quiz edits cannot change an
existing attempt.

Editing a published quiz increments its `version`. New attempts use the new version; existing
attempts keep their snapshot.

### Attempt states

`in_progress`, `submitted`, `pending_review`, `graded`.

### Timing

- `started_at` and `expires_at` are set on the server at attempt start.
- A small, explicitly configured grace period absorbs network latency. Submissions after the
  grace window are rejected.
- Attempt limits count submitted and graded attempts, not abandoned in-progress ones.

### Saving answers

Answers autosave per question. Saves are idempotent and can never create a duplicate answer for
the same question.

### Scoring

- Grading is server-side only. A score, points value, or pass/fail supplied by the client is
  rejected.
- Each quiz stores an explicit passing score; pass/fail is computed during grading.
- Multiple-choice scoring is all-or-nothing unless partial credit is explicitly configured on
  that question.
- Manual grading records `points_awarded`, `feedback`, `graded_by`, and `graded_at`. Points
  cannot be negative or exceed the question maximum.
- An attempt becomes `graded` only when every manual question has been graded.

### Visibility

Quiz settings decide whether correct answers and explanations are visible after submission.
Results show per-question feedback with an icon **and** text — never color alone.

---

## 4. Database, storage, and RLS

### Core tables

`profiles`, `courses`, `course_topics`, `lessons`, `lesson_blocks`, `files`, `quizzes`,
`quiz_questions`, `quiz_options`, `quiz_attempts`, `attempt_answers`, `enrollments`,
`lesson_progress`, `audit_logs`.

### Constraints

- `profiles.id` references `auth.users.id`; `profiles.role` is constrained to `student`,
  `instructor`, or `admin`. Only an admin may change a role.
- `courses` is unique on `(instructor_id, code, term, year_level)` where the course is not
  soft-deleted. Generated codes use this same scope; custom codes must satisfy it too.
- `enrollments` is unique on `(course_id, student_id)`.
- `course_topics` is unique on `(id, course_id)`; `lessons` references that pair with a composite
  `(topic_id, course_id)` foreign key.
- Topics and lessons use an `order_index`; the table of contents is their ordered projection.
- `lesson_progress` is unique on `(lesson_id, student_id)`.
- `attempt_answers` is unique on `(attempt_id, question_id)`.
- `quizzes.version` increases monotonically; editing a published quiz increments it.
- `quiz_attempts` references the quiz version and stores the immutable snapshot.
- `audit_logs` is append-only and records admin actions, role changes, course publishing, and
  content removal.

### Buckets

`course-files`, `course-thumbnails`, `avatars`. All private, all RLS-enabled, all served only
through short-lived signed URLs. The backend writes course-scoped paths and records ownership in
`files`, and reads through the service role only within the owning course's scope.

### RLS matrix

- **Anonymous** — reads published course metadata (catalog); writes nothing.
- **Student** — reads own profile, content and quizzes of published courses they are enrolled in,
  own enrollments, own attempts and lesson progress; writes own profile, own in-progress answers,
  own enrollments and lesson progress.
- **Instructor** — reads and writes own courses, course topics, lessons, blocks, quizzes, files;
  reads the enrollments and attempts for their courses; writes enrollment for courses they
  manage.
- **Admin** — reads and writes all rows and all storage objects.

Draft and archived courses are visible only to their owner and admins. Policies use `auth.uid()`
and a trusted role helper — never a role claim supplied or editable by the client. Storage
policies mirror table policies: owners, enrolled students, and admins only.

Shipped behavior is currently narrower than this matrix: the entire `/api/courses` surface,
including the outline routes, sits behind `requireAuth` + `requireRole('instructor')`. The
student and anonymous catalog rows above are target behavior, not current behavior.
