import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RevisionDocument = HydratedDocument<RevisionSchemaClass>;

@Schema({ collection: 'article_revisions', timestamps: { createdAt: true, updatedAt: false } })
export class RevisionSchemaClass {
  @Prop({ required: true, index: true })
  articleId!: string;

  @Prop({ required: true, type: Number })
  version!: number;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: '' })
  content!: string;

  @Prop({ required: true, index: true })
  authorId!: string;

  @Prop({ type: String, default: null })
  changeSummary!: string | null;

  createdAt!: Date;
}

export const RevisionSchema = SchemaFactory.createForClass(RevisionSchemaClass);
