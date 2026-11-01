import { Router } from 'express'
import { getFileUrlHandler } from '../controllers/fileController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'

export const fileRouter = Router()

fileRouter.use(requireAuth, requireRole('instructor'))
fileRouter.get('/files/:fileId/url', getFileUrlHandler)
