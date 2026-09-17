import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConsentDocument = HydratedDocument<ConsentSchemaClass>;

@Schema({ collection: 'consent_records', timestamps: { createdAt: 'timestamp', updatedAt: false } })
export class ConsentSchemaClass {
  @Prop({ type: String, default: () => randomUUID() })
  _id?: string;

  @Prop({ type: String, index: true, default: null })
  userId?: string | null;

  @Prop({ required: true, type: String })
  consentType!: string;

  @Prop({ required: true, type: String })
  version!: string;

  @Prop({ required: true, type: String })
  choice!: string;

  @Prop({ type: String, default: null })
  ipAddress?: string | null;

  @Prop({ type: String, default: null })
  userAgent?: string | null;

  timestamp!: Date;
}

export const ConsentSchema = SchemaFactory.createForClass(ConsentSchemaClass);
