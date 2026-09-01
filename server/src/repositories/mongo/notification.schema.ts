import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DeliveryStatus, NotificationType } from '../../domain/models';

@Schema({ collection: 'notifications', timestamps: true })
export class NotificationSchemaClass extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  actorId?: string;

  @Prop({ required: true })
  actorName: string;

  @Prop()
  actorAvatar?: string;

  @Prop({ default: 1 })
  actorCount: number;

  @Prop({ type: Array, default: [] })
  actorsSummary: Array<{ id: string; name: string; avatar?: string | null }>;

  @Prop({ index: true })
  groupKey?: string;

  @Prop({ required: true, enum: NotificationType })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  resourceType: string;

  @Prop({ required: true })
  resourceId: string;

  @Prop()
  resourceSlug?: string;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: DeliveryStatus.SENT })
  deliveryStatus: string;

  @Prop({ default: Date.now })
  inAppDeliveredAt: Date;

  @Prop()
  emailDeliveredAt?: Date;

  @Prop()
  pushDeliveredAt?: Date;

  @Prop({ type: Array, default: [] })
  deliveryErrors: Array<{ channel: string; error: string; timestamp: string }>;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationSchemaClass);
export type NotificationDocument = NotificationSchemaClass;

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index(
  { userId: 1, groupKey: 1, isRead: 1 },
  { unique: true, partialFilterExpression: { isRead: false, groupKey: { $exists: true, $type: 'string' } } },
);

@Schema({ collection: 'notification_preferences', timestamps: true })
export class NotificationPreferencesSchemaClass extends Document {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({
    type: Object,
    default: { inApp: true, email: true, browserPush: false },
  })
  channels: {
    inApp: boolean;
    email: boolean;
    browserPush: boolean;
  };

  @Prop({
    type: Object,
    default: {
      onArticlePublished: true,
      onArticleFeedback: true,
      onArticleLiked: true,
      onArticleReposted: true,
      onCommentReceived: true,
      onCommentReply: true,
      onCommentLiked: true,
      onNewFollower: true,
      onUserMentioned: true,
      onSystemAnnouncement: true,
    },
  })
  events: Record<string, boolean>;

  @Prop({ default: 'instant' })
  digestFrequency: string;

  @Prop({ type: Object, default: { enabled: false } })
  quietHours: { enabled: boolean; startUtc?: string; endUtc?: string };

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(NotificationPreferencesSchemaClass);

@Schema({ collection: 'push_subscriptions', timestamps: true })
export class PushSubscriptionSchemaClass extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ type: Object, required: true })
  keys: {
    p256dh: string;
    auth: string;
  };

  @Prop()
  userAgent?: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscriptionSchemaClass);
PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });
