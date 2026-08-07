import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose'

export interface IWorkspace {
  name: string
  owner: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export type WorkspaceDocument = HydratedDocument<IWorkspace>

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
)

workspaceSchema.index({ owner: 1, createdAt: -1 })

export const WorkspaceModel: Model<IWorkspace> = model<IWorkspace>('Workspace', workspaceSchema)
