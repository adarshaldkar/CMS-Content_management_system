import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ArticleDocument = HydratedDocument<ArticleSchemaClass>;

@Schema({ collection: 'articles', timestamps: true })
export class ArticleSchemaClass {
  @Prop({ type: String, default: () => randomUUID() })
  _id?: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: '' })
  content!: string;

  @Prop({ required: true, index: true })
  authorId!: string;

  @Prop({ type: String, default: null, index: true })
  categoryId!: string | null;

  @Prop({ type: [String], default: [] })
  tagIds!: string[];

  @Prop({ type: String, default: null })
  coverImage!: string | null;

  @Prop({ default: 'draft', index: true })
  status!: string;

  @Prop({ type: Number, default: 1 })
  version!: number;

  @Prop({ type: Number, default: 0 })
  wordCount!: number;

  @Prop({ type: Number, default: 1 })
  readingTimeMinutes!: number;

  @Prop({ type: String, default: null })
  seoTitle!: string | null;

  @Prop({ type: String, default: null })
  seoDescription!: string | null;

  @Prop({ type: String, default: null })
  reviewNote!: string | null;

  @Prop({ type: Date, default: null, index: true })
  scheduledAt!: Date | null;

  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;

  @Prop({ type: String, default: null, index: true })
  publishingSlotId?: string | null;

  @Prop({ type: Boolean, default: false })
  autoDispatched?: boolean;

  @Prop({ type: Date, default: null, index: true })
  deletedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ArticleSchema = SchemaFactory.createForClass(ArticleSchemaClass);
