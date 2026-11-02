import { z } from 'zod'

export const studentQuizResultsParamSchema = z.object({
  courseId: z.string().uuid('Select a valid subject.'),
  studentId: z.string().uuid('Select a valid student.'),
})
