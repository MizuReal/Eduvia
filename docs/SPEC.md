# Eduvia — Product Specification

The detailed product contract behind `AGENTS.md`. `AGENTS.md` holds the operating rules; this
file holds the shapes, limits, state machines, and policies. Where the two overlap, `AGENTS.md`
wins on process and this file wins on detail.

Scope note: the implemented surface today is auth, profiles, courses, course-outline
management (`course_topics`, lesson entries, reordering, moving, and restore), topic content
(a Tiptap slides editor, a Tiptap docs editor, an uploaded presentation, and embedded
image/file assets), instructor quiz authoring (native A–D questions, an uploaded quiz paper
with an A–D answer key, publish validation, and teacher-preview grading), and enrollment
(invite links, approval or auto-accept, rosters, read-only student subject pages, and inline
topic slide viewing), across migrations `001_profiles.sql` through `010_enrollment.sql`. Lesson
content blocks, enrollment progress, and the student quiz runner below are the target contract —
build them to this spec, not to an approximation of it.

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
GET    /api/courses/:courseId/trash                           ✓ instructor-only
PATCH  /api/courses/:courseId
POST   /api/courses/:courseId/publish
POST   /api/courses/:courseId/archive

GET    /api/courses/:courseId/lessons
PATCH  /api/courses/:courseId/topics/reorder                  ✓ instructor-only
POST   /api/courses/:courseId/topics                          ✓ instructor-only
POST   /api/courses/:courseId/lessons                         ✓ instructor-only
PATCH  /api/topics/:topicId                                   ✓ instructor-only
DELETE /api/topics/:topicId                                   ✓ instructor-only
PATCH  /api/topics/:topicId/lessons/reorder                   ✓ instructor-only
POST   /api/topics/:topicId/restore                           ✓ instructor-only
PATCH  /api/lessons/:lessonId                                 ✓ instructor-only
DELETE /api/lessons/:lessonId                                 ✓ instructor-only
POST   /api/lessons/:lessonId/restore                         ✓ instructor-only
POST   /api/lessons/:lessonId/blocks
PATCH  /api/blocks/:blockId
DELETE /api/blocks/:blockId

GET    /api/topics/:topicId/content                           ✓
PUT    /api/topics/:topicId/content/:kind                     ✓
POST   /api/topics/:topicId/presentations                     ✓
GET    /api/content/:contentId                                ✓
PATCH  /api/content/:contentId                                ✓
DELETE /api/content/:contentId                                ✓
POST   /api/content/:contentId/assets                         ✓

POST   /api/files
GET    /api/files/:fileId/url                                 ✓
DELETE /api/files/:fileId

GET    /api/enrollments/me                                   ✓ student-only
GET    /api/enrollments/join/:courseId                        ✓ student-only
POST   /api/enrollments                                       ✓ student-only
GET    /api/student/subjects/:courseId                        ✓ student-only
GET    /api/student/topics/:topicId/content                   ✓ student-only
GET    /api/courses/:courseId/enrollments                     ✓ instructor-only
PATCH  /api/courses/:courseId/enrollment-settings             ✓ instructor-only
POST   /api/enrollments/:enrollmentId/approve                 ✓ instructor-only
POST   /api/enrollments/:enrollmentId/reject                  ✓ instructor-only
DELETE /api/enrollments/:enrollmentId                         ✓ instructor-only
POST   /api/lessons/:lessonId/complete

GET    /api/topics/:topicId/quiz                              ✓ instructor-only
PUT    /api/topics/:topicId/quiz                              ✓ instructor-only
GET    /api/quizzes/:quizId                                   ✓ instructor-only
PUT    /api/quizzes/:quizId                                   ✓ instructor-only
DELETE /api/quizzes/:quizId                                   ✓ instructor-only
POST   /api/quizzes/:quizId/publish                           ✓ instructor-only
POST   /api/quizzes/:quizId/preview-grade                     ✓ instructor-only
POST   /api/quizzes/:quizId/paper                             ✓ instructor-only
DELETE /api/quizzes/:quizId/paper                             ✓ instructor-only

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
- `PATCH /api/topics/:topicId` accepts `{ "title": string }`.
- `PATCH /api/lessons/:lessonId` accepts `{ "title"?: string, "topicId"?: uuid }`; at least one
  field is required. Moving a lesson appends it to the target topic.
- `DELETE /api/topics/:topicId` and `DELETE /api/lessons/:lessonId` are soft deletes. Deleting a
  topic also soft-deletes its lessons as a batch.
- `PATCH /api/courses/:courseId/topics/reorder` accepts `{ "topicIds": uuid[] }`.
- `PATCH /api/topics/:topicId/lessons/reorder` accepts `{ "lessonIds": uuid[] }`. Arrays must
  contain every active item exactly once.
- `GET /api/courses/:courseId/trash` returns deleted topics and individually deleted lessons.
- `POST /api/topics/:topicId/restore` restores the topic and its batch-deleted lessons.
- `POST /api/lessons/:lessonId/restore` restores a lesson when its parent topic is active.
- Restored topics and lessons append to the end of their current list.
- `POST /api/courses/:courseId/topics` accepts `{ "title": string }`.
- `POST /api/courses/:courseId/lessons` accepts `{ "topicId": uuid, "title": string }`.
- `GET /api/topics/:topicId/content` returns the topic plus its singleton `slides`, `doc`, and
  `upload` entries. Presentation entries include file metadata but not storage paths.
- `PUT /api/topics/:topicId/content/:kind` is idempotent for `slides` and `doc`. It returns the
  existing singleton or creates a blank one (`Untitled slides` / `Untitled document`).
- `PATCH /api/content/:contentId` accepts `{ "title"?: string, "content"?: object,
  "summary"?: string }`. Slides and docs accept `content`; the uploaded presentation accepts
  `summary`. At least one field is required.
- `POST /api/topics/:topicId/presentations` is multipart with `file`, optional `title`, and
  required `summary` (20–1,000 characters). It accepts `.pptx` and `.pdf` up to 25 MB. Uploads
  are converted to per-slide WebP previews before they become visible. If an uploaded
  presentation already exists, it replaces it transactionally; the previous file is soft-deleted
  once the new file is ready.
- `POST /api/content/:contentId/assets` is multipart with `file` and `kind` (`image` or `file`).
  Images accept JPG, PNG, and WebP up to 10 MB; embedded files accept PDF, DOCX, PPTX, TXT, and
  MD up to 25 MB.
- `GET /api/content/:contentId` returns the full Tiptap JSON plus signed URLs for referenced
  assets. Asset URLs are short-lived and are never stored in the content JSON.
- Deleting topic content soft-deletes the item, its uploaded presentation file, or its embedded
  assets.
- Uploads are `multipart/form-data`: a single `file` field plus the target topic or content id and
  any route-specific fields (`title`, `summary`, or `kind`).
- JSON bodies are capped at 1 MB (`JSON_BODY_LIMIT`); Tiptap content is capped at 512 KB per item,
  and upload limits come from the per-type table in §2.
- `GET /api/files/:fileId/url` responds `{ "url": "...", "expiresAt": "...", "fileName": "...",
  "mimeType": "...", "sizeBytes": 123, "fileClass": "image" | "document", "width": number | null,
  "height": number | null }`. The URL is short-lived and never logged, cached, or sent to
  analytics. Storage paths are never returned.
- `GET /api/topics/:topicId/quiz` returns the topic plus its singleton `quiz` or `null`. The
  quiz includes its ordered questions, status, version, and paper metadata but never a storage
  path.
- `PUT /api/topics/:topicId/quiz` is idempotent and accepts `{ "mode": "native" | "document" }`.
  It creates a draft `Untitled quiz` when none exists. An existing quiz keeps its mode; a
  different mode returns `409 QUIZ_MODE_LOCKED`.
- `PUT /api/quizzes/:quizId` saves quiz settings and content in one transaction. Native quizzes
  accept `questions[]` with `prompt`, `optionA`–`optionD`, `correctOption` (`A`–`D`), and an
  optional `explanation`. Document quizzes accept `answers[]` of `A`–`D` for 10–20 numbered
  questions. Sending the wrong shape for the mode returns `400 QUIZ_MODE_MISMATCH`.
- `POST /api/quizzes/:quizId/publish` requires 10–20 questions with complete answers; a
  document quiz also requires its paper. It returns `400 QUIZ_NOT_READY` otherwise and
  increments `version` when republishing.
- `POST /api/quizzes/:quizId/preview-grade` grades a teacher preview attempt server-side and
  returns the score, percentage, pass/fail, and per-question results. It never stores an attempt.
- `POST /api/quizzes/:quizId/paper` is multipart with `file` and accepts PDF or DOCX up to
  25 MB. It replaces the paper transactionally; the previous file is soft-deleted once the new
  file is ready. DOCX uploads store a sanitized preview.
- `DELETE /api/quizzes/:quizId` soft-deletes the quiz, its questions, and its paper. Deleting a
  paper with `DELETE /api/quizzes/:quizId/paper` returns the quiz to draft.
- `GET /api/enrollments/me` returns the student's `active` subjects and `pending` requests.
- `GET /api/enrollments/join/:courseId` returns the subject preview, enrollment state, and
  whether enrollment is open. `POST /api/enrollments` accepts `{ "courseId": uuid }` and is
  idempotent. It creates an `active` enrollment in `auto` mode and a `pending` request in
  `approval` mode. A closed subject returns `409 ENROLLMENT_CLOSED`.
- `GET /api/student/subjects/:courseId` returns subject metadata plus the ordered topics and
  lesson titles. It returns 404 unless the student has an active enrollment.
- `GET /api/student/topics/:topicId/content` returns the topic's Tiptap slides and uploaded
  presentation previews with short-lived signed URLs. It returns 404 unless the student has an
  active enrollment in the topic's course. Docs are omitted.
- `GET /api/courses/:courseId/enrollments` returns enrollment settings, pending requests, and
  the active roster. `PATCH /api/courses/:courseId/enrollment-settings` accepts
  `{ "open": boolean, "mode": "approval" | "auto" }`.
- `POST /api/enrollments/:enrollmentId/approve` and `/reject` act on pending requests.
  `DELETE /api/enrollments/:enrollmentId` removes an active or pending student. A removed
  student may request again through the invite link.
- In-progress attempt payloads omit correct answers, correct option ids, accepted answers,
  explanations, and scoring keys.

---

## 2. Files, uploads, and topic content

### Topic content

Each topic has a singleton content workspace with four tabs: **PPTX**, **Docs**, **Upload**,
and **Quiz**. Clicking **Manage content** opens the workspace directly on the PPTX tab. There is
no separate content list and no separate slides entity.

- **PPTX** stores one versioned Tiptap slides document:
  `{ "version": 1, "slides": [{ "id": uuid, "content": <Tiptap doc> }] }`.
- **Docs** stores one Tiptap JSON document.
- **Upload** stores the original PPTX/PDF plus a required plain-text summary. The original file
  is never edited or round-tripped.
- **Quiz** stores one quiz per topic, either native questions or an uploaded quiz paper with an
  A–D answer key (see §3).
- The API creates a blank slides document or doc the first time its tab needs one. Each topic
  has at most one active `slides`, one active `doc`, and one active `presentation` row.
- Images and embedded files use custom Tiptap nodes and store only a `fileId`:
  `courseImage` with `{ fileId, alt }` and `courseFile` with `{ fileId }`.
- The content JSON never stores signed URLs, base64 data, or HTML.
- Limits: 512 KB per content item, 80 slides, 50 unique embedded assets, 20,000 nodes,
  depth 50, and 100,000 text characters.
- The server validates the Tiptap JSON against an allowlist of nodes and marks. Links accept
  only `http`, `https`, and `mailto`. Unknown nodes, marks, and attributes are rejected.
- Every referenced asset must belong to the same content item, topic, and course. Images must
  reference image assets; attachments must reference document assets.
- Saving slides or a doc restores referenced soft-deleted assets and soft-deletes assets that
  are no longer referenced. The storage object is not deleted immediately; storage cleanup
  remains a separate idempotent job.
- Replacing an uploaded presentation creates a new file record and soft-deletes the previous
  file after the new file is ready. Per-slide WebP previews are generated during upload and
  stored under the new file's `previews/` prefix.
- Deleting a content item soft-deletes it and all of its embedded assets or its uploaded
  presentation file, and writes an `audit_logs` entry.

### Accepted types and limits

| Class     | Extensions                          | Limit  |
| --------- | ----------------------------------- | ------ |
| Document  | `.docx`, `.pdf`, `.pptx`, `.txt`, `.md` | 25 MB each |
| Image     | `.jpg`, `.jpeg`, `.png`, `.webp`    | 10 MB each |
| Video     | `.mp4`, `.webm`                     | 100 MB each |

Reject legacy `.doc`, macro-enabled `.docm`, executables, scripts, standalone archives (`.zip`,
`.rar`, `.7z`), and SVG. Enforce a per-user storage quota in addition to per-file limits.
Every limit is a configuration value, never a literal in a handler. Quiz papers accept only
`.pdf` and `.docx` up to 25 MB.

### Validation order

1. Extension is on the allowlist.
2. Size is under the class limit — reject before transferring to permanent storage.
3. Magic bytes match the declared class, checked with `file-type`. The client-supplied
   `Content-Type` is advisory only and is never trusted.
4. The per-user quota still has room.
5. If a malware scanner is configured, it must pass before the file becomes `ready`.

Without a scanner, only the allowlisted types above are accepted and non-previewable files are
served as attachments.

Images are decoded and re-encoded with `sharp` before storage. Metadata and EXIF location data
are stripped; the server enforces a 10,000-pixel side limit and a 40-megapixel input limit;
animated images are rejected. `.txt` and `.md` attachments are validated as UTF-8 text. Embedded
files are download-only; images render inline through a signed URL.

### Storage layout

- Paths use UUIDs: `courses/{course_id}/{file_id}/{sanitized-name}`. User-controlled paths are
  forbidden and path traversal is rejected.
- Original filenames are sanitized and truncated for display. Embedded assets also carry the
  owning `content_id`; presentation files are linked from `topic_content_items.file_id`.
- A SHA-256 checksum is stored with every file record.
- Derived previews sit under a `previews/` prefix beside the original.

### Lifecycle

States: `uploading`, `processing`, `ready`, `failed`, `quarantined`.

- The current synchronous upload path validates, stores, and records the file as `ready` in one
  request. `processing` and `quarantined` are reserved for a future asynchronous scanner.
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
| `.pptx`         | Converted to per-slide WebP images with LibreOffice and Poppler        |
| `.mp4`, `.webm` | Native player via short-lived signed URL and storage range requests    |

`.docx` conversion enforces ZIP entry count, uncompressed size, and a conversion timeout before
parsing. Presentation previews require LibreOffice (`soffice`) and Poppler (`pdftoppm`) on the
backend host. Everything that is not previewable is served with `Content-Disposition: attachment`.
Storage paths are not exposed in public API responses when a signed URL is sufficient.

Uploaded presentations keep the original file and a required summary. At upload time, PPTX files
are converted to PDF with LibreOffice and both PPTX/PDF inputs are rasterized to per-slide WebP
images with `pdftoppm` and `sharp`. The original is never edited or round-tripped and remains
downloadable. Previews are stored beside the original under the file's `previews/` prefix and
are limited to 200 slides. The PPTX tab is a native Tiptap slides editor; uploaded PPTX files are
never edited. Embedded file attachments inside docs and slides open through a fresh signed URL;
images render inline.

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

Every topic has at most one active quiz. A quiz is authored in one of two modes, and its mode is
fixed once created:

- **Native** — 10–20 multiple-choice questions stored in Eduvia. Each question has a prompt, four
  options A–D, exactly one correct option, and an optional explanation. Questions can be added,
  edited, duplicated, deleted, and reordered freely.
- **Document** — the instructor uploads an existing PDF or DOCX quiz paper and enters an A–D
  answer key for 10–20 numbered questions. The paper is the question surface; Eduvia stores no
  parsed prompts. DOCX papers are converted to sanitized HTML for preview, and the original file
  remains downloadable. Legacy `.doc` is rejected.

Both modes require a title (2–160 characters), optional instructions (up to 5,000 characters),
and a passing score percentage (0–100, default 75). Every question is worth 1 point in v1.

### Publishing

- Drafts may be saved at any time, including incomplete ones.
- Publishing requires 10–20 questions, a correct option for every question, and, in document
  mode, a `ready` paper. Otherwise the API returns `400 QUIZ_NOT_READY`.
- Publishing a quiz that is already published increments `version`. Editing a draft does not.
- Only the course owner or an admin may author, publish, or delete a quiz.

### Preview grading

`POST /api/quizzes/:quizId/preview-grade` grades a teacher preview attempt entirely server-side.
The client sends only selected options; a client-supplied score, points value, or pass/fail is
rejected. The response includes the score, maximum score, percentage, pass/fail against the
quiz's passing score, and per-question correctness. Preview attempts are never persisted.

Correct options and explanations are teacher-authoring data. They are never included in any
student-facing response before submission; the student runner is deferred (see below).

### Paper previews

| Type    | Treatment                                                        |
| ------- | ---------------------------------------------------------------- |
| `.pdf`  | Inline preview through a short-lived signed URL                  |
| `.docx` | Converted to sanitized HTML with `mammoth`, shown in a sandboxed iframe |

DOCX conversion enforces ZIP entry count, uncompressed size, and a conversion timeout before
parsing. Stored preview HTML is capped at 2 MB. The original paper is always downloadable.

### Deferred student flow

The student runner is not part of this pass. When it lands it must add:

- Attempt snapshots: starting an attempt snapshots questions, options, points, correct answers,
  explanations, randomization seed, and question/option order. Later quiz edits cannot change an
  existing attempt. New attempts use the new version; existing attempts keep their snapshot.
- Attempt states: `in_progress`, `submitted`, `pending_review`, `graded`.
- Server-set `started_at` and `expires_at`, a small explicit grace period, and attempt limits
  that count submitted and graded attempts.
- Per-question autosave that is idempotent and can never create a duplicate answer.
- Server-side grading only; partial credit only when explicitly configured; manual grading
  records `points_awarded`, `feedback`, `graded_by`, and `graded_at`, and an attempt becomes
  `graded` only when every manual question is graded.
- Quiz settings that decide whether correct answers and explanations are visible after
  submission, with per-question feedback shown by icon **and** text — never color alone.

---

## 4. Enrollment

Every subject has one enrollment setting and at most one enrollment row per student.

- **Invite link** — teachers share `/student/enroll/{courseId}`. Students open the link, see
  the subject preview, and request or join. Course codes are not used for discovery because
  they are unique only within an instructor/trimester/year-level scope.
- **Open enrollment** — `courses.enrollment_open` defaults to `false`. Closing a subject blocks
  new requests but keeps active students enrolled.
- **Mode** — `courses.enrollment_mode` is `approval` (default) or `auto`. Approval creates a
  `pending` row; auto creates an `active` row immediately.
- **Statuses** — `pending`, `active`, `rejected`, `removed`. There is one row per
  `(course_id, student_id)`.
- **Re-requesting** — a `rejected` or `removed` student may request again. The existing row is
  reset according to the subject's current mode and decision timestamps are cleared.
- **Removal** — a teacher removes a student by setting the row to `removed`. Access to the
  subject and its table of contents ends immediately.
- **Student dashboard** — `/student` lists active subjects and pending requests.
  `/student/subjects/{courseId}` shows subject metadata, ordered topics, and lesson titles.
  `/student/subjects/{courseId}/topics/{topicId}` shows the topic's Tiptap slides or uploaded
  presentation previews. It does not expose docs, files, or quizzes.
- **Teacher roster** — `/teacher/subjects/{courseId}/students` shows the invite link, enrollment
  switch, mode, pending requests, and enrolled students. Approve, reject, and remove actions
  verify course ownership.

---

## 5. Database, storage, and RLS

### Core tables

`profiles`, `courses`, `course_topics`, `lessons`, `topic_content_items`, `files`,
`audit_logs`, `lesson_blocks`, `quizzes`, `quiz_questions`, `quiz_attempts`,
`attempt_answers`, `enrollments`, `lesson_progress`.

### Constraints

- `profiles.id` references `auth.users.id`; `profiles.role` is constrained to `student`,
  `instructor`, or `admin`. Only an admin may change a role.
- `courses` is unique on `(instructor_id, code, term, year_level)` where the course is not
  soft-deleted. Generated codes use this same scope; custom codes must satisfy it too.
- `courses.enrollment_open` defaults to `false`; `courses.enrollment_mode` is `approval` or
  `auto`.
- `enrollments` is unique on `(course_id, student_id)` and constrains `status` to `pending`,
  `active`, `rejected`, or `removed`.
- `course_topics` is unique on `(id, course_id)`; `lessons` references that pair with a composite
  `(topic_id, course_id)` foreign key.
- Topics and lessons use an `order_index`; the table of contents is their ordered projection.
  Reordering rewrites the indices as a contiguous `0..n-1` list in one transaction.
- `lessons.deleted_batch_id` links lessons soft-deleted with a topic to that topic. Restoring the
  topic restores only that batch; individually deleted lessons remain in the trash.
- Restored topics and lessons append to the end of their current list.
- `lesson_progress` is unique on `(lesson_id, student_id)`.
- `attempt_answers` is unique on `(attempt_id, question_id)`.
- `topic_content_items.kind` is `doc`, `slides`, or `presentation`. Slides and docs have no file
  or summary; the uploaded presentation has a `file_id`, a summary, and empty content. A file
  can back at most one upload (`file_id` is unique).
- Each topic has at most one active row per kind: `(topic_id, kind)` is unique where
  `deleted_at is null`. The singleton migration soft-deletes duplicate rows and their files
  before creating the unique index.
- `topic_content_items.slide_count` is generated from `content->'slides'`.
- `files.content_id` links embedded assets to their owning content item; files are soft-deleted,
  never hard-deleted by application code.
- `quizzes` is unique on `topic_id` where `deleted_at is null`; it references
  `(topic_id, course_id)` with a composite foreign key. `mode` is `native` or `document`,
  `status` is `draft` or `published`, and `file_id` is unique and required only for document
  quizzes.
- `quiz_questions` belongs to a quiz, orders with a contiguous `order_index`, and constrains
  `correct_option` to `A`, `B`, `C`, or `D`. Native questions carry prompt, four options, and an
  optional explanation; document questions carry only the answer key.
- `quizzes.version` increases monotonically; editing a published quiz increments it.
- `quiz_attempts` references the quiz version and stores the immutable snapshot.
- `audit_logs` is append-only and records admin actions, role changes, course publishing,
  quiz publishing, quiz paper replacement/removal, quiz deletion, and content removal.

### Buckets

`course-files`, `course-thumbnails`, `avatars`. All private, all RLS-enabled, all served only
through short-lived signed URLs. `course-files` holds uploaded presentations, quiz papers, and
embedded assets under `courses/{course_id}/{file_id}/{name}`. The backend writes course-scoped
paths and records ownership in `files`, and reads through the service role only within the
owning course's scope.

### RLS matrix

- **Anonymous** — reads published course metadata (catalog); writes nothing.
- **Student** — reads own profile, subjects they are actively enrolled in, their topics and
  lessons, own enrollments, own attempts and lesson progress; writes own profile, own
  in-progress answers and lesson progress. Enrollment requests are made through the API.
- **Instructor** — reads and writes own courses, course topics, lessons, topic content, files,
  blocks, quizzes; reads the enrollments for their courses; writes enrollment settings and
  approve/reject/remove decisions for courses they manage.
- **Admin** — reads and writes all rows and all storage objects.

Draft and archived courses are visible only to their owner and admins. Policies use `auth.uid()`
and a trusted role helper — never a role claim supplied or editable by the client. Storage
policies mirror table policies: owners, enrolled students, and admins only.

Shipped behavior is currently narrower than this matrix: the `/api/courses` surface, the outline
routes, and the topic-content/file routes sit behind `requireAuth` + `requireRole('instructor')`.
Enrollment routes use explicit `student` or `instructor` gates. The anonymous catalog rows above
remain target behavior, not current behavior.
