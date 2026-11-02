import { z } from 'zod'
import { ENROLLMENT_MODES } from '../config/constants.js'

export const courseIdEnrollmentParamSchema = z.object({
  courseId: z.string().uuid('Select a valid subject.'),
})

export const enrollmentIdParamSchema = z.object({
  enrollmentId: z.string().uuid('Select a valid enrollment.'),
})

export const createEnrollmentSchema = z.strictObject({
  courseId: z.string().uuid('Select a valid subject.'),
})

export const updateEnrollmentSettingsSchema = z.strictObject({
  open: z.boolean(),
  mode: z.enum(ENROLLMENT_MODES, { message: 'Select an enrollment mode.' }),
})

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>
export type UpdateEnrollmentSettingsInput = z.infer<
  typeof updateEnrollmentSettingsSchema
>
