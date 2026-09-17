import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MediaDocument = HydratedDocument<MediaSchemaClass>;

@Schema({ collection: 'media', timestamps: { createdAt: true, updatedAt: false } })
export class MediaSchemaClass {
  @Prop({ type: String, default: () => randomUUID() })
  _id?: string;

  @Prop({ required: true })
  filename!: string;

  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true, type: Number })
  size!: number;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true, index: true })
  uploadedBy!: string;

  @Prop({ type: Array, default: [] })
  variants?: any[];

  @Prop({ type: Object, default: null })
  optimization?: any;

  @Prop({ type: String, default: 'READY' })
  processingStatus?: string;

  @Prop({ type: Number })
  aspectRatio?: number;

  @Prop({ type: String })
  usageProfile?: string;

  @Prop({ type: String })
  storageKey?: string;

  @Prop({ type: String })
  cdnUrl?: string;

  createdAt!: Date;
}

export const MediaSchema = SchemaFactory.createForClass(MediaSchemaClass);
