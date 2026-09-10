import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NewsletterSubscriber,
  NewsletterCampaign,
  SubscriberStatus,
  CampaignStatus,
  DigestFrequency,
  SubscriberQueryFilters,
  NewsletterStats,
} from '../../domain/models';
import { INewsletterRepository } from '../interfaces/newsletter.repository.interface';
import {
  NewsletterSubscriberDocument,
  NewsletterSubscriberMongo,
  NewsletterCampaignDocument,
  NewsletterCampaignMongo,
} from './newsletter.schema';

@Injectable()
export class MongoNewsletterRepository implements INewsletterRepository {
  constructor(
    @InjectModel(NewsletterSubscriberMongo.name)
    private readonly subscriberModel: Model<NewsletterSubscriberDocument>,
    @InjectModel(NewsletterCampaignMongo.name)
    private readonly campaignModel: Model<NewsletterCampaignDocument>,
  ) {}

  private mapSubscriber(doc: any): NewsletterSubscriber {
    return {
      id: doc._id.toString(),
      email: doc.email,
      status: doc.status as SubscriberStatus,
      topics: doc.topics || [],
      frequency: doc.frequency as DigestFrequency,
      verificationTokenHash: doc.verificationTokenHash || null,
      verificationTokenExpiresAt: doc.verificationTokenExpiresAt || null,
      unsubscribeTokenHash: doc.unsubscribeTokenHash,
      bounceCount: doc.bounceCount || 0,
      verifiedAt: doc.verifiedAt || null,
      unsubscribedAt: doc.unsubscribedAt || null,
      lastBouncedAt: doc.lastBouncedAt || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapCampaign(doc: any): NewsletterCampaign {
    return {
      id: doc._id.toString(),
      subject: doc.subject,
      previewText: doc.previewText || '',
      contentHtml: doc.contentHtml,
      targetTopics: doc.targetTopics || [],
      status: doc.status as CampaignStatus,
      totalRecipients: doc.totalRecipients || 0,
      deliveredCount: doc.deliveredCount || 0,
      failedCount: doc.failedCount || 0,
      scheduledAt: doc.scheduledAt || null,
      sentAt: doc.sentAt || null,
      authorId: doc.authorId || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
    const doc = await this.subscriberModel.findOne({ email: email.toLowerCase().trim() }).exec();
    return doc ? this.mapSubscriber(doc) : null;
  }

  async findSubscriberById(id: string): Promise<NewsletterSubscriber | null> {
    const doc = await this.subscriberModel.findById(id).exec();
    return doc ? this.mapSubscriber(doc) : null;
  }

  async findSubscriberByVerifyTokenHash(hash: string): Promise<NewsletterSubscriber | null> {
    const doc = await this.subscriberModel.findOne({ verificationTokenHash: hash }).exec();
    return doc ? this.mapSubscriber(doc) : null;
  }

  async findSubscriberByUnsubscribeTokenHash(hash: string): Promise<NewsletterSubscriber | null> {
    const doc = await this.subscriberModel.findOne({ unsubscribeTokenHash: hash }).exec();
    return doc ? this.mapSubscriber(doc) : null;
  }

  async createSubscriber(
    sub: Omit<NewsletterSubscriber, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NewsletterSubscriber> {
    const created = await this.subscriberModel.create({
      email: sub.email.toLowerCase().trim(),
      status: sub.status,
      topics: sub.topics || [],
      frequency: sub.frequency || DigestFrequency.DAILY,
      verificationTokenHash: sub.verificationTokenHash,
      verificationTokenExpiresAt: sub.verificationTokenExpiresAt,
      unsubscribeTokenHash: sub.unsubscribeTokenHash,
      bounceCount: sub.bounceCount || 0,
      verifiedAt: sub.verifiedAt,
      unsubscribedAt: sub.unsubscribedAt,
      lastBouncedAt: sub.lastBouncedAt,
    });
    return this.mapSubscriber(created);
  }

  async updateSubscriber(
    id: string,
    updates: Partial<NewsletterSubscriber>,
  ): Promise<NewsletterSubscriber | null> {
    const updated = await this.subscriberModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).exec();
    return updated ? this.mapSubscriber(updated) : null;
  }

  async findSubscribers(filters: SubscriberQueryFilters): Promise<{
    items: NewsletterSubscriber[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.search) {
      // Escape regex metacharacters to prevent ReDoS and regex injection
      const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.email = { $regex: escaped, $options: 'i' };
    }
    if (filters.topic) {
      query.topics = filters.topic;
    }

    const [docs, total] = await Promise.all([
      this.subscriberModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.subscriberModel.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((d) => this.mapSubscriber(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findActiveSubscribersForBroadcast(topics?: string[]): Promise<NewsletterSubscriber[]> {
    const query: any = { status: SubscriberStatus.ACTIVE };
    if (topics && topics.length > 0) {
      query.$or = [{ topics: { $in: topics } }, { topics: { $size: 0 } }];
    }
    const docs = await this.subscriberModel.find(query).sort({ createdAt: 1 }).exec();
    return docs.map((d) => this.mapSubscriber(d));
  }

  async getSubscriberStats(): Promise<NewsletterStats> {
    const [total, active, pending, unsubscribed, bounced, sentCampaigns] = await Promise.all([
      this.subscriberModel.countDocuments().exec(),
      this.subscriberModel.countDocuments({ status: SubscriberStatus.ACTIVE }).exec(),
      this.subscriberModel.countDocuments({ status: SubscriberStatus.PENDING_VERIFICATION }).exec(),
      this.subscriberModel.countDocuments({ status: SubscriberStatus.UNSUBSCRIBED }).exec(),
      this.subscriberModel.countDocuments({ status: { $in: [SubscriberStatus.BOUNCED, SubscriberStatus.COMPLAINED] } }).exec(),
      this.campaignModel.countDocuments({ status: CampaignStatus.SENT }).exec(),
    ]);

    return {
      totalSubscribers: total,
      activeSubscribers: active,
      pendingVerification: pending,
      unsubscribed,
      bounced,
      totalCampaignsSent: sentCampaigns,
    };
  }

  async createCampaign(
    c: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NewsletterCampaign> {
    const created = await this.campaignModel.create({
      subject: c.subject,
      previewText: c.previewText || '',
      contentHtml: c.contentHtml,
      targetTopics: c.targetTopics || [],
      status: c.status || CampaignStatus.DRAFT,
      totalRecipients: c.totalRecipients || 0,
      deliveredCount: c.deliveredCount || 0,
      failedCount: c.failedCount || 0,
      scheduledAt: c.scheduledAt,
      sentAt: c.sentAt,
      authorId: c.authorId || null,
    });
    return this.mapCampaign(created);
  }

  async findCampaignById(id: string): Promise<NewsletterCampaign | null> {
    const doc = await this.campaignModel.findById(id).exec();
    return doc ? this.mapCampaign(doc) : null;
  }

  async updateCampaign(
    id: string,
    updates: Partial<NewsletterCampaign>,
  ): Promise<NewsletterCampaign | null> {
    const updated = await this.campaignModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).exec();
    return updated ? this.mapCampaign(updated) : null;
  }

  async transitionCampaignStatus(
    id: string,
    fromStatus: NewsletterCampaign['status'],
    toStatus: NewsletterCampaign['status'],
    updates: Partial<NewsletterCampaign> = {},
  ): Promise<NewsletterCampaign | null> {
    const updated = await this.campaignModel
      .findOneAndUpdate(
        { _id: id, status: fromStatus },
        { $set: { ...updates, status: toStatus } },
        { new: true },
      )
      .exec();
    return updated ? this.mapCampaign(updated) : null;
  }

  async findCampaigns(
    limit = 20,
    page = 1,
  ): Promise<{
    items: NewsletterCampaign[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const skip = (safePage - 1) * safeLimit;

    const [docs, total] = await Promise.all([
      this.campaignModel.find().sort({ createdAt: -1 }).skip(skip).limit(safeLimit).exec(),
      this.campaignModel.countDocuments().exec(),
    ]);

    return {
      items: docs.map((d) => this.mapCampaign(d)),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }
}
