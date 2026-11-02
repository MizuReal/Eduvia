import { env } from '../config/env.js'
import { sumActiveFileBytesForUser } from '../db/files.js'
import { AppError } from '../errors/AppError.js'

export async function assertStorageQuota(
  userId: string,
  incomingBytes: number,
): Promise<void> {
  const usedBytes = await sumActiveFileBytesForUser(userId)

  if (usedBytes + incomingBytes > env.USER_STORAGE_QUOTA_BYTES) {
    throw new AppError(
      413,
      'STORAGE_QUOTA_EXCEEDED',
      'Your storage quota is full. Delete a file and try again.',
    )
  }
}
