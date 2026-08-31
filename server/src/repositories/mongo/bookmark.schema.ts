import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BookmarkDocument = HydratedDocument<BookmarkSchemaClass>;

@Schema({ collection: 'bookmarks', timestamps: true })
export class BookmarkSchemaClass {
  @Prop({ type: String })
  _id?: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  articleId!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const BookmarkSchema = SchemaFactory.createForClass(BookmarkSchemaClass);

BookmarkSchema.index({ userId: 1, articleId: 1 }, { unique: true });