import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { randomUUID } from 'node:crypto'
import { pinoHttp } from 'pino-http'
import { JSON_BODY_LIMIT } from './config/constants.js'
import { env } from './config/env.js'
import { logger } from './logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { apiRouter } from './routes/index.js'

export function createApp() {
  const app = express()

  if (env.TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', env.TRUST_PROXY_HOPS)
  }

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ALLOWED_ORIGINS }))
  app.use(express.json({ limit: JSON_BODY_LIMIT }))
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => {
        const requestId = req.headers['x-request-id']
        return typeof requestId === 'string' && requestId.length > 0
          ? requestId
          : randomUUID()
      },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    }),
  )
  app.use('/api', apiRouter)
  app.use(notFound)
  app.use(errorHandler)

  return app
}
