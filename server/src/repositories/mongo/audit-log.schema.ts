import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { AuditEventType } from '../../domain/models';

export type AuditLogDocument = HydratedDocument<AuditLogSchemaClass>;

@Schema({ collection: 'audit_logs', timestamps: { createdAt: true, updatedAt: false } })
export class AuditLogSchemaClass {
  @Prop({ type: String, default: null, index: true })
  actorId!: string | null;

  @Prop({ type: String, enum: Object.values(AuditEventType), required: true, index: true })
  action!: AuditEventType;

  @Prop({ required: true })
  resource!: string;

  @Prop({ required: true, enum: ['SUCCESS', 'FAILURE', 'BLOCKED'] })
  result!: 'SUCCESS' | 'FAILURE' | 'BLOCKED';

  @Prop({ type: String, default: null })
  ipAddress!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: String, default: null })
  referenceId!: string | null;

  @Prop({ type: Object, default: null })
  metadata!: Record<string, unknown> | null;

  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLogSchemaClass);
