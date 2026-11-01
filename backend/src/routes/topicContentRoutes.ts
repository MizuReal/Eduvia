import { Router } from 'express'
import {
  deleteContentHandler,
  ensureContentHandler,
  getContentHandler,
  getTopicWorkspaceHandler,
  updateContentHandler,
  uploadContentAssetHandler,
  uploadPresentationHandler,
} from '../controllers/topicContentController.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadRateLimiter } from '../middleware/rateLimit.js'
import { requireRole } from '../middleware/roles.js'
import { acceptSingleFile } from '../middleware/upload.js'

export const topicContentRouter = Router()

topicContentRouter.use(requireAuth, requireRole('instructor'))

topicContentRouter.get('/topics/:topicId/content', getTopicWorkspaceHandler)
topicContentRouter.put(
  '/topics/:topicId/content/:kind',
  ensureContentHandler,
)
topicContentRouter.post(
  '/topics/:topicId/presentations',
  uploadRateLimiter,
  acceptSingleFile,
  uploadPresentationHandler,
)

topicContentRouter.get('/content/:contentId', getContentHandler)
topicContentRouter.patch('/content/:contentId', updateContentHandler)
topicContentRouter.delete('/content/:contentId', deleteContentHandler)
topicContentRouter.post(
  '/content/:contentId/assets',
  uploadRateLimiter,
  acceptSingleFile,
  uploadContentAssetHandler,
)
