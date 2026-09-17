import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../domain/models';

export type UserDocument = HydratedDocument<UserSchemaClass>;

@Schema({ collection: 'users', timestamps: true })
export class UserSchemaClass {
  @Prop({ type: String, default: () => randomUUID() })
  _id?: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, default: null })
  bio!: string | null;

  @Prop({ type: String, default: null })
  avatarUrl!: string | null;

  @Prop({ type: [String], default: [] })
  preferredTopics!: string[];

  @Prop({ type: String, enum: Object.values(UserRole), default: UserRole.USER })
  role!: UserRole;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isEmailVerified?: boolean;

  @Prop({ type: String, default: null })
  emailVerificationToken?: string | null;

  @Prop({ type: Date, default: null })
  emailVerificationExpiresAt?: Date | null;

  @Prop({ type: String, default: null })
  acceptedTermsVersion?: string | null;

  @Prop({ type: Date, default: null })
  acceptedTermsAt?: Date | null;

  @Prop({ type: Object, default: null })
  notificationPreferences?: any;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserSchemaClass);
