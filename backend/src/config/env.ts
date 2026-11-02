import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { config } from 'dotenv'
import { z } from 'zod'

config({ quiet: true })

const httpOrigin = z
  .url()
  .refine(
    (value) => value.startsWith('http://') || value.startsWith('https://'),
    'CORS origins must use http or https.',
  )

const corsOriginsSchema = z
  .string()
  .min(1, 'CORS_ALLOWED_ORIGINS is required.')
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(httpOrigin)
      .min(1, 'At least one CORS origin is required.')
      .refine((origins) => origins.every((origin) => origin !== '*'), 'Wildcard CORS origins are forbidden.'),
  )

const optionalJwtSecret = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(32, 'SUPABASE_JWT_SECRET must be at least 32 characters when set.').optional(),
)

const optionalTeacherRegistrationCode = z.preprocess(
  (value) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  z
    .string()
    .min(
      16,
      'TEACHER_REGISTRATION_CODE must be at least 16 characters when set.',
    )
    .optional(),
)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  CORS_ALLOWED_ORIGINS: corsOriginsSchema,
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),
  SUPABASE_URL: z
    .url()
    .transform((value) => value.replace(/\/+$/, '')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required.'),
  SUPABASE_JWT_SECRET: optionalJwtSecret,
  TEACHER_REGISTRATION_CODE: optionalTeacherRegistrationCode,
  UPLOAD_TEMP_DIR: z.string().min(1).default(join(tmpdir(), 'eduvia-uploads')),
  DOCUMENT_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024)
    .default(25 * 1024 * 1024),
  IMAGE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024)
    .default(10 * 1024 * 1024),
  IMAGE_MAX_PIXELS: z.coerce
    .number()
    .int()
    .positive()
    .max(100_000_000)
    .default(40_000_000),
  USER_STORAGE_QUOTA_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(250 * 1024 * 1024),
  SIGNED_URL_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(3600)
    .default(300),
  UPLOAD_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  UPLOAD_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(30),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')
  throw new Error(`Invalid environment configuration: ${details}`)
}

export const env = parsed.data
export type Env = typeof env
