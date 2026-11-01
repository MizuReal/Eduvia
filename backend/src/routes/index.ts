import { Router } from 'express'
import { authRouter } from './authRoutes.js'
import { courseRouter } from './courseRoutes.js'
import { fileRouter } from './fileRoutes.js'
import { outlineRouter } from './outlineRoutes.js'
import { topicContentRouter } from './topicContentRoutes.js'
import { usersRouter } from './usersRoutes.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/users', usersRouter)
apiRouter.use('/courses', courseRouter)
apiRouter.use(outlineRouter)
apiRouter.use(topicContentRouter)
apiRouter.use(fileRouter)
