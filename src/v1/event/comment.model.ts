// comment.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IComment {
    text: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date
    updatedAt: Date
}

export interface CommentDocument extends IComment, Document { }

const commentSchema = new Schema<CommentDocument>({
  text: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, required: true },
}, {
  timestamps: true,
});

// const Comment = mongoose.model<CommentDocument>('Comment', commentSchema);

export default commentSchema;
