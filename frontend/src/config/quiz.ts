export const MIN_QUIZ_QUESTIONS = 10
export const MAX_QUIZ_QUESTIONS = 20
export const QUIZ_TITLE_MAX_LENGTH = 160
export const QUIZ_INSTRUCTIONS_MAX_LENGTH = 5000
export const QUIZ_PROMPT_MIN_LENGTH = 2
export const QUIZ_PROMPT_MAX_LENGTH = 2000
export const QUIZ_OPTION_MAX_LENGTH = 500
export const QUIZ_EXPLANATION_MAX_LENGTH = 2000
export const QUIZ_PAPER_MAX_BYTES = 25 * 1024 * 1024

export const QUIZ_PAPER_ACCEPT: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
}

export const QUIZ_PAPER_ACCEPT_LABEL = 'PDF or DOCX'

export const CORRECT_OPTIONS = ['A', 'B', 'C', 'D'] as const
