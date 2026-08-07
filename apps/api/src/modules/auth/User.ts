import { model, Schema, type HydratedDocument, type Model } from 'mongoose'

export interface IUser {
  clerkId: string
  email: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  createdAt: Date
  updatedAt: Date
}

export type UserDocument = HydratedDocument<IUser>

const userSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, trim: true, maxlength: 50 },
    lastName: { type: String, trim: true, maxlength: 50 },
    imageUrl: { type: String },
  },
  { timestamps: true },
)

export const UserModel: Model<IUser> = model<IUser>('User', userSchema)
