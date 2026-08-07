import type { UserDocument } from './User'

export interface UserResponse {
  id: string
  clerkId: string
  email: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  createdAt: string
}

export function toUserResponse(user: UserDocument): UserResponse {
  return {
    id: user._id.toString(),
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    imageUrl: user.imageUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  }
}
