# Deploying Eduvia: Vercel + Render

Eduvia deploys as three pieces:

```text
Vercel (static React SPA)
        |
        | HTTPS / JWT
        v
Render (Dockerized Express API)
        |
        v
Supabase (Postgres + Auth + private Storage)
```

The backend runs from `backend/Dockerfile`, which installs LibreOffice Impress and Poppler for presentation previews.

> Complete [setup.md](./setup.md) first. This guide assumes the Supabase project is already migrated.

## Prerequisites

- GitHub repository containing this project
- Supabase project with migrations `001`–`014` applied
- Vercel account
- Render account
- A Render plan chosen:
  - **Free** — 512 MB RAM / 0.1 CPU; core flows work, but PPTX preview generation may fail
  - **Paid 2 GB plan** — 1 CPU / 2 GB RAM; recommended for reliable presentation previews

## Included deployment files

- `backend/Dockerfile` — Node 22 build, LibreOffice Impress, Poppler, non-root runtime
- `backend/.dockerignore`
- `frontend/vercel.json` — SPA deep-link rewrite

## 1. Prepare Supabase production credentials

From Supabase **Project Settings → API**, collect:

- Project URL, for example `https://abcdefgh.supabase.co`
- Publishable / anon key for Vercel
- Service-role / secret key for Render only

For a new Supabase project using JWT signing keys, leave `SUPABASE_JWT_SECRET` unset. Only legacy HS256 projects need it.

## 2. Create the Render web service

1. Sign in to Render and choose **New → Web Service**.
2. Connect the GitHub repository.
3. Set:
   - **Name:** `eduvia-api`
   - **Region:** the closest region to your Supabase project and users, for example Singapore
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Language:** Docker
   - **Dockerfile Path:** `Dockerfile`
   - **Auto-Deploy:** Yes
4. Choose a compute plan:
   - **Free** for a demo or for testing core flows.
   - The paid **`1c-2g`** plan (1 CPU / 2 GB RAM) for reliable LibreOffice conversion.
5. Add the environment variables below.
6. Leave the health check path blank unless you add a dedicated health endpoint.
7. Create the service.

Render builds `backend/Dockerfile` and starts `node dist/server.js` from the image. Do not set a start command or build command; the Dockerfile supplies them.

## 3. Render environment variables

Add these under **Environment**:

```text
NODE_ENV=production
CORS_ALLOWED_ORIGINS=http://localhost:5173
TRUST_PROXY_HOPS=3
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-or-secret-key
TEACHER_REGISTRATION_CODE=use-at-least-16-characters
LOG_LEVEL=info
```

Optional values:

```text
# Legacy HS256 Supabase projects only.
# SUPABASE_JWT_SECRET=your-legacy-jwt-secret

# Override upload/storage defaults only if needed.
# UPLOAD_TEMP_DIR=/tmp/eduvia-uploads
# DOCUMENT_MAX_BYTES=26214400
# IMAGE_MAX_BYTES=10485760
# USER_STORAGE_QUOTA_BYTES=262144000
# SIGNED_URL_TTL_SECONDS=300
# UPLOAD_RATE_LIMIT_WINDOW_MS=900000
# UPLOAD_RATE_LIMIT_MAX=30
```

Store `SUPABASE_SERVICE_ROLE_KEY` and `TEACHER_REGISTRATION_CODE` only in Render's environment settings. Never commit them or paste them into logs. If you do not want teacher self-registration, omit `TEACHER_REGISTRATION_CODE`.

Do not add a `PORT` variable in Render. Render injects it (10000 by default) and the API reads it at startup; the Dockerfile's `8080` value is only a container default and is overridden.

Notes:

- `CORS_ALLOWED_ORIGINS` is temporary until the Vercel URL exists.
- `TRUST_PROXY_HOPS=3` accounts for Render's current Cloudflare + Render proxy chain, so rate limits use the client IP. If Render changes its edge and limits still group users, inspect `X-Forwarded-For` and adjust the value.
- Uploaded files are streamed to Supabase Storage; no persistent Render disk is required.
- The Docker container sets `UPLOAD_TEMP_DIR=/tmp/eduvia-uploads`.
- Render’s filesystem is ephemeral, so temporary processing files disappear on restart.

## 4. Verify the backend

Render shows the public service URL after the first successful deploy, for example:

```text
https://eduvia-api.onrender.com
```

Check that the API is reachable:

```bash
curl -i https://eduvia-api.onrender.com/api/users/me
```

The response should be `401 AUTH_REQUIRED`. A persistent `502` or `503`, or repeated restarts, means the container is not starting; inspect Render logs.

Free instances sleep after inactivity. The first request after a sleep can take roughly a minute and may return a Render loading page or a transient error. Wait for the service to wake, then retry the request.

## 5. Deploy the frontend to Vercel

1. Import the repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Use the **Vite** framework preset and Node.js **22.x**.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables for Production (and Preview if needed):

   ```text
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   VITE_API_URL=https://eduvia-api.onrender.com
   ```

   `VITE_API_URL` must not end with a slash.

7. Deploy. `frontend/vercel.json` supplies the SPA rewrite so routes such as `/teacher/subjects/...` load correctly.

Get the production domain, for example `https://eduvia.vercel.app`.

## 6. Connect the frontend and backend

Update Render’s CORS setting to the exact Vercel origin:

```text
CORS_ALLOWED_ORIGINS=https://eduvia.vercel.app
```

Use the actual Vercel production URL. Origins are exact: include `https://`, do not add a trailing slash, and never use `*`. For Vercel preview deployments, add each preview origin explicitly or use production deployments only.

Saving environment variables with **Save and deploy** triggers a new Render deploy. Wait for it to finish before testing.

In Supabase **Authentication → URL Configuration**:

- Set **Site URL** to the Vercel production URL.
- No email confirmation or password-reset flow is used by the current app, but this keeps auth configuration aligned.

## 7. Verify the deployment

- Open the Vercel URL.
- Register a student with a `TUPT-XX-XXXX` username.
- Sign out and back in.
- Register a teacher using the teacher access code.
- Create a subject and check its invite link and class code.
- Join with the class code from a student account, then approve the request if the subject uses approval.
- Upload a PDF presentation and confirm its previews generate.
- On the paid 2 GB plan, upload a PPTX and confirm conversion completes. On Render Free, test only a small deck.
- Open a quiz result summary and test CSV and Print/PDF.
- Check Render logs for startup, memory, and conversion errors.

## Render plan guidance

| Render plan | Memory / CPU | Expected behavior |
| --- | --- | --- |
| Free | 512 MB / 0.1 CPU | Core app works; LibreOffice conversion may be killed for memory or take a long time |
| Paid `0.5c-512mb` | 512 MB / 0.5 CPU | Same memory risk, but faster |
| Paid `1c-2g` | 2 GB / 1 CPU | Recommended for presentation previews |

Render Free is intended for demos and personal projects, not production classes. If previews are not essential, it is enough for the rest of the application. PDF presentations skip LibreOffice and are much lighter than PPTX, though very large decks can still be slow. If PPTX previews are required, use the `1c-2g` plan (about $25/month at the time of writing) or convert presentations to PDF before uploading.

Supabase Free also has storage and bandwidth limits; monitor them if students upload many files. Free projects pause after a period of inactivity, so restore the project from the Supabase dashboard before class if it has been idle.

### Render free-tier limits

- 750 free instance hours per workspace per month. A service kept awake around the clock consumes about 720.
- Free web services spin down after 15 minutes without traffic and take about a minute to wake.
- 500 build pipeline minutes per month. Docker builds that install LibreOffice consume more than a native Node build.
- 5 GB outbound bandwidth per month, shared by the workspace. Backend uploads to Supabase Storage count toward this.
- A free instance can be restarted by Render at any time; the filesystem is ephemeral.
- Free services cannot attach a persistent disk or scale beyond one instance.

Vercel Hobby is free for non-commercial personal projects and includes 100 GB of fast data transfer per month. Review Vercel's fair-use terms before using it for an institutional deployment.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Render deploy fails during install | `backend/Dockerfile`, Render logs, and `backend/package-lock.json` |
| Service restarts with memory errors or exit code 137 | Upgrade the Render instance; LibreOffice is exceeding the 512 MB free limit |
| PPTX upload fails or the service restarts | LibreOffice ran out of memory; use the 2 GB instance, a smaller deck, or PDF-only uploads |
| Browser CORS error | Set the exact Vercel origin in Render and confirm the new deploy finished |
| Many users get `429` at once | `TRUST_PROXY_HOPS` is missing or does not match Render's current proxy chain (3 at the time of writing) |
| Frontend cannot reach API | `VITE_API_URL`, then redeploy Vercel because Vite env values are baked at build time |
| Backend starts but database checks fail | Re-run Supabase migrations and verify `SUPABASE_URL` / service-role secret |
| Teacher registration disabled | `TEACHER_REGISTRATION_CODE` is missing or shorter than 16 characters |
| `INVALID_TOKEN` | Legacy JWT secret configuration; newer JWT signing-key projects should leave `SUPABASE_JWT_SECRET` unset |
| First request is very slow | Render Free cold start; use a paid always-on instance if this is a problem |

The same Docker image also runs on Google Cloud Run if you later want to try its monthly free allowance.
