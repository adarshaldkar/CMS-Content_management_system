import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LikeDocument = HydratedDocument<LikeSchemaClass>;

@Schema({ collection: 'likes', timestamps: true })
export class LikeSchemaClass {
  @Prop({ type: String, default: () => randomUUID() })
  _id?: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  articleId!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const LikeSchema = SchemaFactory.createForClass(LikeSchemaClass);

LikeSchema.index({ userId: 1, articleId: 1 }, { unique: true });