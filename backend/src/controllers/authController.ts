import type { Request, Response } from 'express'
import { AppError } from '../errors/AppError.js'
import { registerSchema } from '../schemas/auth.js'
import { registerUser } from '../services/authService.js'
import { formatZodError } from '../utils/validation.js'

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body)

  if (!parsed.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please check the highlighted fields.',
      formatZodError(parsed.error),
    )
  }

  const user = await registerUser(parsed.data)

  res.status(201).json({ data: user, error: null })
}
