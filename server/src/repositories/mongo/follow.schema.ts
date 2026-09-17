import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FollowDocument = HydratedDocument<FollowSchemaClass>;

@Schema({ collection: 'follows', timestamps: true })
export class FollowSchemaClass {
  @Prop({ type: String, default: () => randomUUID() })
  _id?: string;

  @Prop({ required: true, index: true })
  followerId!: string;

  @Prop({ enum: ['user', 'category'], required: true })
  targetType!: string;

  @Prop({ required: true, index: true })
  targetId!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const FollowSchema = SchemaFactory.createForClass(FollowSchemaClass);

FollowSchema.index(
  { followerId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);