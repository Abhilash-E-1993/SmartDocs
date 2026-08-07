import { clerkClient } from '@clerk/express'

import { ApiError, isDuplicateKeyError } from '../../utils/api-error'
import { UserModel, type UserDocument } from './User'

async function findOrCreateByClerkId(clerkId: string): Promise<UserDocument> {
  const existing = await UserModel.findOne({ clerkId })
  if (existing) {
    return existing
  }

  const clerkUser = await clerkClient.users.getUser(clerkId).catch(() => {
    throw ApiError.serviceUnavailable('Authentication provider is unavailable')
  })

  const email =
    clerkUser.emailAddresses.find((address) => address.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress

  if (!email) {
    throw ApiError.badRequest('No email address is associated with this account')
  }

  try {
    return await UserModel.create({
      clerkId,
      email,
      firstName: clerkUser.firstName ?? undefined,
      lastName: clerkUser.lastName ?? undefined,
      imageUrl: clerkUser.imageUrl,
    })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const created = await UserModel.findOne({ clerkId })
      if (created) {
        return created
      }
    }

    throw error
  }
}

export const authService = { findOrCreateByClerkId }
