import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<CategorySchemaClass>;

@Schema({ collection: 'categories', timestamps: true })
export class CategorySchemaClass {
  @Prop({ type: String, default: () => randomUUID() })
  _id?: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true })
  slug!: string;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status!: 'active' | 'inactive';

  createdAt!: Date;
  updatedAt!: Date;
}

export const CategorySchema = SchemaFactory.createForClass(CategorySchemaClass);
