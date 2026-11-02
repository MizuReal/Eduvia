# Deploying Eduvia: Vercel + Google Cloud Run

Eduvia deploys as three pieces:

```text
Vercel (static React SPA)
        |
        | HTTPS / JWT
        v
Google Cloud Run (Dockerized Express API)
        |
        v
Supabase (Postgres + Auth + private Storage)
```

Cloud Run is used instead of Render Free because presentation previews need LibreOffice and Poppler, and Render Free only provides 512 MB RAM / 0.1 CPU. Cloud Run can run the same Docker image with 2 GiB RAM and scales to zero when idle.

> Complete [setup.md](./setup.md) first. This guide assumes the Supabase project is already migrated.

## Prerequisites

- GitHub repository containing this project
- Supabase project with migrations `001`–`014` applied
- Vercel account
- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- `Docker` is not required locally; Cloud Build builds the image

## Included deployment files

- `backend/Dockerfile` — Node 22 build, LibreOffice Impress, Poppler, non-root runtime
- `backend/.dockerignore`
- `frontend/vercel.json` — SPA deep-link rewrite

## 1. Prepare Supabase production credentials

From Supabase **Project Settings → API**, collect:

- Project URL, for example `https://abcdefgh.supabase.co`
- Publishable / anon key for Vercel
- Service-role / secret key for Cloud Run only

For a new Supabase project using JWT signing keys, leave `SUPABASE_JWT_SECRET` unset. Only legacy HS256 projects need it.

## 2. Set up Google Cloud

Set shell values for your project and nearest region:

```bash
export PROJECT_ID="your-google-cloud-project-id"
export REGION="asia-southeast1"
export REPO="eduvia"
export IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/api:latest"
```

Enable the required APIs:

```bash
gcloud config set project "$PROJECT_ID"

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

Create the Artifact Registry repository:

```bash
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Eduvia containers"
```

Create a dedicated runtime service account and allow it to read secrets:

```bash
gcloud iam service-accounts create eduvia-run \
  --display-name="Eduvia Cloud Run"

export RUN_SA="eduvia-run@$PROJECT_ID.iam.gserviceaccount.com"
```

## 3. Create Cloud Run secrets

Create the service-role secret. Replace the placeholder without committing the key; the Secret Manager console is also fine:

```bash
printf '%s' 'replace-with-supabase-service-role-key' \
  | gcloud secrets create supabase-service-role-key --data-file=-
```

Create the teacher registration code secret. It must be at least 16 characters:

```bash
printf '%s' 'replace-with-a-16-plus-character-code' \
  | gcloud secrets create teacher-registration-code --data-file=-
```

Allow the runtime account to read them:

```bash
for secret in supabase-service-role-key teacher-registration-code; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$RUN_SA" \
    --role="roles/secretmanager.secretAccessor"
done
```

If you use a legacy HS256 Supabase project, create `supabase-jwt-secret` the same way and add `--set-secrets "SUPABASE_JWT_SECRET=supabase-jwt-secret:latest"` to the deploy command.

## 4. Build and push the backend image

From the repository root:

```bash
gcloud builds submit --tag "$IMAGE" ./backend
```

The Docker build installs `libreoffice-impress` and `poppler-utils`; the image is large, so the first build takes a few minutes.

## 5. Deploy the backend to Cloud Run

Deploy with 2 GiB RAM and one request at a time so LibreOffice conversions do not compete for memory:

```bash
gcloud run deploy eduvia-api \
  --image "$IMAGE" \
  --region "$REGION" \
  --service-account "$RUN_SA" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 1 \
  --concurrency 1 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 2 \
  --set-env-vars "NODE_ENV=production,CORS_ALLOWED_ORIGINS=http://localhost:5173,SUPABASE_URL=https://your-project-ref.supabase.co,LOG_LEVEL=info" \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,TEACHER_REGISTRATION_CODE=teacher-registration-code:latest"
```

Notes:

- `--allow-unauthenticated` makes the API reachable; application routes still enforce Supabase JWTs and roles.
- `CORS_ALLOWED_ORIGINS` is temporary until the Vercel URL exists.
- Cloud Run supplies `PORT`; do not override it.
- `UPLOAD_TEMP_DIR` is set to `/tmp/eduvia-uploads` by the Dockerfile. Cloud Run storage is ephemeral; uploaded files are streamed to Supabase Storage.
- If you do not want teacher self-registration, omit the `TEACHER_REGISTRATION_CODE` entry from `--set-secrets`.

Get the API URL:

```bash
export API_URL="$(gcloud run services describe eduvia-api \
  --region "$REGION" \
  --format='value(status.url)')"

echo "$API_URL"
```

Verify the service is up:

```bash
curl -i "$API_URL/api/users/me"
```

An unauthenticated request should return `401 AUTH_REQUIRED`. A `500` or HTML page means the container did not start correctly; inspect Cloud Run logs.

## 6. Deploy the frontend to Vercel

1. Import the repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Use the **Vite** framework preset and Node.js **22.x**.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables for Production (and Preview if needed):

   ```text
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   VITE_API_URL=https://your-cloud-run-url
   ```

   `VITE_API_URL` must not end with a slash.

7. Deploy. `frontend/vercel.json` supplies the SPA rewrite so routes such as `/teacher/subjects/...` load correctly.

Get the production domain, for example `https://eduvia.vercel.app`.

## 7. Connect the frontend and backend

Update Cloud Run CORS to the exact Vercel origin:

```bash
gcloud run services update eduvia-api \
  --region "$REGION" \
  --update-env-vars "CORS_ALLOWED_ORIGINS=https://eduvia.vercel.app"
```

Use the actual Vercel production URL. Origins are exact: include `https://`, do not add a trailing slash, and never use `*`. For Vercel preview deployments, add each preview origin explicitly or use production deployments only.

In Supabase **Authentication → URL Configuration**:

- Set **Site URL** to the Vercel production URL.
- No email confirmation or password-reset flow is used by the current app, but this keeps auth configuration aligned.

## 8. Verify the deployment

- Open the Vercel URL.
- Register a student with a `TUPT-XX-XXXX` username.
- Sign out and back in.
- Register a teacher using the teacher access code.
- Create a subject and check its invite link and class code.
- Join with the class code from a student account.
- Upload a PDF or PPTX presentation; confirm previews generate.
- Open a quiz result summary and test CSV and Print/PDF.
- Check Cloud Run logs for errors:

  ```bash
  gcloud run services logs read eduvia-api --region "$REGION" --limit 100
  ```

## Free-tier notes

Cloud Run's monthly free allowance includes roughly 2 million requests, 180,000 vCPU-seconds, and 360,000 GiB-seconds. At 2 GiB memory and 1 vCPU, expect roughly 50 hours of active instance time per month, shared across requests. The service cold-starts after idle periods.

If presentation conversion is heavy:

- Keep `--memory 2Gi` and `--concurrency 1`.
- Watch Cloud Run memory and timeout logs.
- Increase the instance size or allow a paid tier for regular PPTX uploads.

Supabase Free has storage and bandwidth limits; monitor them if students upload many files.

The Cloud Run container image includes LibreOffice, so Artifact Registry storage can exceed its small free allowance and incur a minor monthly charge. Cloud Build also has a free build-minutes allowance; the first image build is the largest.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Frontend cannot reach API | `VITE_API_URL`, then redeploy Vercel because Vite env values are baked at build time. |
| Browser CORS error | Exact `CORS_ALLOWED_ORIGINS` value; update Cloud Run and confirm the new revision is serving. |
| `500` on upload | Cloud Run memory/time limits, LibreOffice/Poppler in the image, and Cloud Run logs. |
| `soffice` or `pdftoppm` not found | The Cloud Run image must be built from `backend/Dockerfile`, not a plain Node image. |
| Cloud Build cannot push the image | Grant the Cloud Build service account `roles/artifactregistry.writer` on the Artifact Registry repository. |
| `413 Payload Too Large` | Cloud Run limits HTTP request bodies to about 32 MB. Current upload limits are below that; video uploads would need a different path. |
| Backend starts but database checks fail | Supabase migrations and `SUPABASE_URL` / service-role secret. |
| Teacher registration disabled | `TEACHER_REGISTRATION_CODE` secret is missing or shorter than 16 characters. |
| `INVALID_TOKEN` | Legacy JWT secret configuration; newer JWT signing-key projects should leave `SUPABASE_JWT_SECRET` unset. |
| Cold start delays | Expected with `--min-instances 0`; set a minimum instance or accept the wake-up delay. |

## Render note

The same Docker image can run on Render, but Render Free is 512 MB RAM / 0.1 CPU. Core features may work, while PPTX preview generation may fail or time out. For reliable previews on Render, use a paid instance with at least 1 CPU and 2 GB RAM.
