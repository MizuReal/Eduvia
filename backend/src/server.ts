import { createApp } from './app.js'
import { env } from './config/env.js'
import { supabaseAdmin } from './db/supabaseAdmin.js'
import { logger } from './logger.js'

const app = createApp()

async function verifyDatabase(): Promise<void> {
  try {
    const [profilesCheck, coursesCheck, courseTopicsCheck, lessonsCheck] =
      await Promise.all([
        supabaseAdmin.from('profiles').select('id').limit(1),
        supabaseAdmin.from('courses').select('id').limit(1),
        supabaseAdmin.from('course_topics').select('id').limit(1),
        supabaseAdmin.from('lessons').select('id, deleted_batch_id').limit(1),
      ])

    if (profilesCheck.error) {
      logger.error(
        { err: profilesCheck.error },
        'Database check failed. Apply schemas/001_profiles.sql to the Supabase project.',
      )
    }

    if (coursesCheck.error) {
      logger.error(
        { err: coursesCheck.error },
        'Database check failed. Apply schemas/002_courses.sql to the Supabase project.',
      )
    }

    if (courseTopicsCheck.error) {
      logger.error(
        { err: courseTopicsCheck.error },
        'Database check failed. Apply schemas/003_outline.sql to the Supabase project.',
      )
    }

    if (lessonsCheck.error) {
      logger.error(
        { err: lessonsCheck.error },
        'Database check failed. Apply schemas/003_outline.sql and schemas/004_outline_management.sql to the Supabase project.',
      )
    }

    if (
      !profilesCheck.error &&
      !coursesCheck.error &&
      !courseTopicsCheck.error &&
      !lessonsCheck.error
    ) {
      logger.info('Database connection verified')
    }
  } catch (error) {
    logger.error({ err: error }, 'Database check failed before startup')
  }
}

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Eduvia API listening')
  void verifyDatabase()
})

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Shutting down')

  server.close(() => {
    process.exit(0)
  })

  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
