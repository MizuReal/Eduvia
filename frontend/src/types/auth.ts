export type AuthMode = 'login' | 'register'

export type Faculty = 'BSIT' | 'BSEE' | 'BSME'

export type UserRole = 'student' | 'instructor' | 'admin'

export type AuthProfile = {
  id: string
  username: string
  role: UserRole
  faculty: Faculty
}
