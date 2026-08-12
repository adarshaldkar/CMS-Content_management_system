import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SessionDocument = HydratedDocument<SessionSchemaClass>;

@Schema({ collection: 'refresh_sessions', timestamps: true })
export class SessionSchemaClass {
  @Prop({ type: String })
  _id?: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  familyId!: string;

  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ default: false, index: true })
  isRevoked!: boolean;

  @Prop({ required: true, index: { expires: 0 } })
  expiresAt!: Date;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: String, default: null })
  ipAddress!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const SessionSchema = SchemaFactory.createForClass(SessionSchemaClass);
