import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  SubscriberStatus,
  CampaignStatus,
  DigestFrequency,
} from '../../domain/models';

export type NewsletterSubscriberDocument = NewsletterSubscriberMongo & Document;

@Schema({ collection: 'newsletter_subscribers', timestamps: true })
export class NewsletterSubscriberMongo {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, enum: Object.values(SubscriberStatus), default: SubscriberStatus.PENDING_VERIFICATION })
  status: string;

  @Prop({ type: [String], default: [] })
  topics: string[];

  @Prop({ required: true, enum: Object.values(DigestFrequency), default: DigestFrequency.DAILY })
  frequency: string;

  @Prop({ type: String, default: null, index: true })
  verificationTokenHash: string | null;

  @Prop({ type: Date, default: null })
  verificationTokenExpiresAt: Date | null;

  @Prop({ required: true, index: true })
  unsubscribeTokenHash: string;

  @Prop({ type: Number, default: 0 })
  bounceCount: number;

  @Prop({ type: Date, default: null })
  verifiedAt: Date | null;

  @Prop({ type: Date, default: null })
  unsubscribedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastBouncedAt: Date | null;
}

export const NewsletterSubscriberSchema = SchemaFactory.createForClass(NewsletterSubscriberMongo);

export type NewsletterCampaignDocument = NewsletterCampaignMongo & Document;

@Schema({ collection: 'newsletter_campaigns', timestamps: true })
export class NewsletterCampaignMongo {
  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ type: String, default: '' })
  previewText: string;

  @Prop({ required: true })
  contentHtml: string;

  @Prop({ type: [String], default: [] })
  targetTopics: string[];

  @Prop({ required: true, enum: Object.values(CampaignStatus), default: CampaignStatus.DRAFT, index: true })
  status: string;

  @Prop({ type: Number, default: 0 })
  totalRecipients: number;

  @Prop({ type: Number, default: 0 })
  deliveredCount: number;

  @Prop({ type: Number, default: 0 })
  failedCount: number;

  @Prop({ type: Date, default: null })
  scheduledAt: Date | null;

  @Prop({ type: Date, default: null })
  sentAt: Date | null;

  @Prop({ type: String, default: null })
  authorId: string | null;
}

export const NewsletterCampaignSchema = SchemaFactory.createForClass(NewsletterCampaignMongo);
