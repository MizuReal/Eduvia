# Eduvia Setup

Eduvia is a web-only learning management system with two apps:

- `frontend/` — React + Vite SPA
- `backend/` — Express API

Supabase provides Postgres, Auth, and Storage. The backend is the only application gateway to that data.

> Deploying to production? See [deployment.md](./deployment.md).

## Prerequisites

- **Node.js 22+** and npm 10+ — verify with `node --version` and `npm --version`
- **Git**
- A **Supabase project**
- **LibreOffice** and **Poppler** for presentation previews:
  - Ubuntu / Debian:
    ```bash
    sudo apt update
    sudo apt install -y libreoffice-impress poppler-utils fonts-liberation
    ```
  - macOS:
    ```bash
    brew install --cask libreoffice
    brew install poppler
    ```
  - Windows: install LibreOffice and Poppler, then add `soffice` and `pdftoppm` to `PATH`.
- Verify the binaries:
  ```bash
  soffice --version
  pdftoppm -v
  ```

Presentation previews convert PPTX to PDF with LibreOffice, then render pages to WebP with Poppler and `sharp`. Other features work without them, but presentation previews will fail.

## 1. Install dependencies

From the repository root:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## 2. Create and migrate Supabase

1. Create a project at [supabase.com](https://supabase.com). Use a fresh project for the initial setup; the migrations are ordered and assumed to run once.
2. Open **SQL Editor**.
3. Run every file in `schemas/` **in filename order**:

   ```text
   001_profiles.sql
   002_courses.sql
   003_outline.sql
   004_outline_management.sql
   005_files.sql
   006_audit_logs.sql
   007_topic_content.sql
   008_singleton_topic_content.sql
   009_quizzes.sql
   010_enrollment.sql
   011_student_learning.sql
   012_quiz_results_index.sql
   013_profiles_registration.sql
   014_class_join_code.sql
   ```

   `005_files.sql` creates the private `course-files` storage bucket and its policies.

4. From **Project Settings → API**, copy:
   - Project URL
   - Publishable / anon key — safe for the browser
   - Service-role / secret key — **backend only**
   - `SUPABASE_JWT_SECRET` only for legacy HS256 projects; leave unset for JWT signing keys

Never put the service-role key in a `VITE_*` variable or commit it.

## 3. Configure the backend

Create `backend/.env` from `backend/.env.example`:

```env
NODE_ENV=development
PORT=4000
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
LOG_LEVEL=info

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-or-secret-key

# Optional: required only for teacher self-registration.
TEACHER_REGISTRATION_CODE=use-at-least-16-characters

# Optional: legacy HS256 projects only.
# SUPABASE_JWT_SECRET=your-legacy-jwt-secret
```

Other optional upload and storage settings are documented in `backend/.env.example`.

## 4. Configure the frontend

Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
VITE_API_URL=http://localhost:4000
```

`VITE_*` values are bundled into the browser. Never put secrets there.

## 5. Run locally

Open two terminals.

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. The backend should log `Database connection verified`. If schema errors appear, recheck the migration order in step 2.

## 6. Create accounts

- **Student:** use **Create account**, choose Student, and register with a `TUPT-XX-XXXX` username.
- **Teacher:** set `TEACHER_REGISTRATION_CODE` in `backend/.env`, then choose Teacher during registration and enter that code.
- **Admin:** there is no admin self-registration. For initial bootstrap only, promote an existing profile in Supabase; use the application/API path for later role changes so they are audited:

  ```sql
  update public.profiles
  set role = 'admin'
  where username = 'tupt-25-1234';
  ```

After signing in as a teacher, create a subject and open **Students** to find the invite link and class code.

## 7. Verify the project

Run the existing gates for both apps:

```bash
cd backend
npm run lint
npm test
npm run typecheck

cd ../frontend
npm run lint
npm test
npm run typecheck
```

Tests use the committed `.env.test` files and do not require a real Supabase project.

Optional production builds:

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `VITE_API_URL is missing` | Create `frontend/.env` and restart Vite. |
| Backend refuses to start with env errors | Fill every required value in `backend/.env`. |
| Browser CORS error | `CORS_ALLOWED_ORIGINS` must exactly match the frontend origin, including scheme and port, with no trailing slash. |
| `soffice` or `pdftoppm` not found | Install LibreOffice Impress and Poppler and confirm both commands are on `PATH`. |
| Presentation preview generation fails | Check the backend logs and verify `soffice` / `pdftoppm` work as the same user running the backend. |
| Database check errors at startup | Re-run the migrations in order, especially `003`, `004`, and `005`. |
| Upload or signed URL failures | Confirm `005_files.sql` ran and the service-role key belongs to the same Supabase project. |
| Teacher registration disabled | Set `TEACHER_REGISTRATION_CODE` to at least 16 characters and restart the backend. |
| `INVALID_TOKEN` after sign-in | Leave `SUPABASE_JWT_SECRET` unset for newer JWT signing-key projects; use the correct legacy secret only for HS256 projects. |
