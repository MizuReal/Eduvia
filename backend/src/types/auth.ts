export type Faculty = 'BSIT' | 'BSEE' | 'BSME'

export type UserRole = 'student' | 'instructor' | 'admin'

export type AuthenticatedUser = {
  id: string
  username: string
  firstName: string
  middleName: string
  lastName: string
  role: UserRole
  faculty: Faculty
}
