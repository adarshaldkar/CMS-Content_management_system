import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum SubscriberStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  PARTIALLY_FAILED = 'PARTIALLY_FAILED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum DigestFrequency {
  INSTANT = 'INSTANT',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  topics: string[];
  frequency: DigestFrequency;
  verificationTokenHash: string | null;
  verificationTokenExpiresAt: Date | null;
  unsubscribeTokenHash: string;
  bounceCount: number;
  verifiedAt: Date | null;
  unsubscribedAt: Date | null;
  lastBouncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  previewText: string;
  contentHtml: string;
  targetTopics: string[];
  status: CampaignStatus;
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  scheduledAt: Date | null;
  sentAt: Date | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SubscribeDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @IsOptional()
  @IsEnum(DigestFrequency)
  frequency?: DigestFrequency;
}

export class UpdateSubscriberPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @IsOptional()
  @IsEnum(DigestFrequency)
  frequency?: DigestFrequency;

  @IsOptional()
  @IsBoolean()
  unsubscribeAll?: boolean;
}

export class CreateCampaignDto {
  @IsString()
  @MaxLength(255)
  subject!: string;

  @IsOptional()
  @IsString()
  previewText?: string;

  @IsString()
  contentHtml!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetTopics?: string[];

  @IsOptional()
  @IsString()
  scheduledAt?: string | null;
}

export class NewsletterWebhookDto {
  @IsString()
  type!: 'bounce' | 'complaint' | 'delivered';

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export interface SubscriberQueryFilters {
  status?: SubscriberStatus;
  search?: string;
  topic?: string;
  page?: number;
  limit?: number;
}

export interface NewsletterStats {
  totalSubscribers: number;
  activeSubscribers: number;
  pendingVerification: number;
  unsubscribed: number;
  bounced: number;
  totalCampaignsSent: number;
}
