import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommentDocument = HydratedDocument<CommentSchemaClass>;

@Schema({ collection: 'comments', timestamps: true })
export class CommentSchemaClass {
  @Prop({ type: String, default: () => randomUUID() })
  _id?: string;

  @Prop({ required: true, index: true })
  articleId!: string;

  @Prop({ type: String, default: null })
  parentId!: string | null;

  @Prop({ required: true, index: true })
  authorId!: string;

  @Prop({ required: true })
  authorName!: string;

  @Prop({ type: String, default: null })
  authorAvatar!: string | null;

  @Prop({ required: true })
  body!: string;

  @Prop({ enum: ['visible', 'hidden', 'removed', 'reported'], default: 'visible' })
  status!: string;

  @Prop({ type: String, default: null })
  moderationNote!: string | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CommentSchema = SchemaFactory.createForClass(CommentSchemaClass);

CommentSchema.index({ articleId: 1, createdAt: 1 });