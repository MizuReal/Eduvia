export type AuthMode = 'login' | 'register'

export type Faculty = 'BSIT' | 'BSEE' | 'BSME'

export type UserRole = 'student' | 'instructor' | 'admin'

export type RegistrationRole = 'student' | 'instructor'

export type AuthProfile = {
  id: string
  username: string
  firstName: string
  middleName: string
  lastName: string
  role: UserRole
  faculty: Faculty
}
