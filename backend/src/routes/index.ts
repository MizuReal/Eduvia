import { Router } from 'express'
import { authRouter } from './authRoutes.js'
import { courseRouter } from './courseRoutes.js'
import { usersRouter } from './usersRoutes.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/users', usersRouter)
apiRouter.use('/courses', courseRouter)
