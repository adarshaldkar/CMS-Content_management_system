import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PublishingSlotDocument = HydratedDocument<PublishingSlotSchemaClass>;

@Schema({ collection: 'publishing_slots', timestamps: true })
export class PublishingSlotSchemaClass {
  @Prop({ type: String })
  _id?: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ required: true })
  dispatchTime!: string;

  @Prop({ default: 'UTC' })
  timezone!: string;

  @Prop({ default: 'ALL' })
  daysActive!: string;

  @Prop({ default: 5 })
  maxArticlesPerSlot!: number;

  @Prop({ default: 5 })
  staggerMinutes!: number;

  @Prop({ default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PublishingSlotSchema =
  SchemaFactory.createForClass(PublishingSlotSchemaClass);

@Schema({ collection: 'author_slot_assignments', timestamps: true })
export class AuthorSlotAssignmentSchemaClass {
  @Prop({ type: String })
  _id?: string;

  @Prop({ required: true, unique: true })
  authorId!: string;

  @Prop({ required: true })
  slotId!: string;

  @Prop({ default: true })
  autoPublishEnabled!: boolean;

  @Prop({ default: 2 })
  dailyQuota!: number;

  @Prop({ type: String, default: null })
  assignedBy!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AuthorSlotAssignmentSchema =
  SchemaFactory.createForClass(AuthorSlotAssignmentSchemaClass);