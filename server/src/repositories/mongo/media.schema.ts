import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MediaDocument = HydratedDocument<MediaSchemaClass>;

@Schema({ collection: 'media', timestamps: { createdAt: true, updatedAt: false } })
export class MediaSchemaClass {
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

  createdAt!: Date;
}

export const MediaSchema = SchemaFactory.createForClass(MediaSchemaClass);
