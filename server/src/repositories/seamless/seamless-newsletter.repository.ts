import { Injectable } from '@nestjs/common';
import {
  NewsletterSubscriber,
  NewsletterCampaign,
  SubscriberQueryFilters,
  NewsletterStats,
} from '../../domain/models';
import { INewsletterRepository } from '../interfaces/newsletter.repository.interface';
import { PostgresNewsletterRepository } from '../postgres/postgres-newsletter.repository';
import { MongoNewsletterRepository } from '../mongo/mongo-newsletter.repository';
import {
  type IRuntimeSwitchableRepository,
  type SupportedDbName,
} from '../repository-proxy';

@Injectable()
export class SeamlessNewsletterRepository
  implements INewsletterRepository, IRuntimeSwitchableRepository
{
  private activeRepo: INewsletterRepository;
  private fallbackRepo: INewsletterRepository;
  private activeEngine: SupportedDbName;

  constructor(
    private readonly postgresRepo: PostgresNewsletterRepository,
    private readonly mongoRepo: MongoNewsletterRepository,
    activeEngine: SupportedDbName = 'postgres',
  ) {
    this.activeEngine = activeEngine;
    this.activeRepo = activeEngine === 'mongodb' ? mongoRepo : postgresRepo;
    this.fallbackRepo = activeEngine === 'mongodb' ? postgresRepo : mongoRepo;
  }

  __switchActive(engine: SupportedDbName): void {
    this.activeEngine = engine;
    this.activeRepo = engine === 'mongodb' ? this.mongoRepo : this.postgresRepo;
    this.fallbackRepo = engine === 'mongodb' ? this.postgresRepo : this.mongoRepo;
  }

  __activeDb(): SupportedDbName {
    return this.activeEngine;
  }

  async findSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
    try {
      return await this.activeRepo.findSubscriberByEmail(email);
    } catch {
      return await this.fallbackRepo.findSubscriberByEmail(email);
    }
  }

  async findSubscriberById(id: string): Promise<NewsletterSubscriber | null> {
    try {
      return await this.activeRepo.findSubscriberById(id);
    } catch {
      return await this.fallbackRepo.findSubscriberById(id);
    }
  }

  async findSubscriberByVerifyTokenHash(hash: string): Promise<NewsletterSubscriber | null> {
    try {
      return await this.activeRepo.findSubscriberByVerifyTokenHash(hash);
    } catch {
      return await this.fallbackRepo.findSubscriberByVerifyTokenHash(hash);
    }
  }

  async findSubscriberByUnsubscribeTokenHash(hash: string): Promise<NewsletterSubscriber | null> {
    try {
      return await this.activeRepo.findSubscriberByUnsubscribeTokenHash(hash);
    } catch {
      return await this.fallbackRepo.findSubscriberByUnsubscribeTokenHash(hash);
    }
  }

  async createSubscriber(
    sub: Omit<NewsletterSubscriber, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NewsletterSubscriber> {
    try {
      return await this.activeRepo.createSubscriber(sub);
    } catch {
      return await this.fallbackRepo.createSubscriber(sub);
    }
  }

  async updateSubscriber(
    id: string,
    updates: Partial<NewsletterSubscriber>,
  ): Promise<NewsletterSubscriber | null> {
    try {
      return await this.activeRepo.updateSubscriber(id, updates);
    } catch {
      return await this.fallbackRepo.updateSubscriber(id, updates);
    }
  }

  async findSubscribers(filters: SubscriberQueryFilters): Promise<{
    items: NewsletterSubscriber[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      return await this.activeRepo.findSubscribers(filters);
    } catch {
      return await this.fallbackRepo.findSubscribers(filters);
    }
  }

  async findActiveSubscribersForBroadcast(topics?: string[]): Promise<NewsletterSubscriber[]> {
    try {
      return await this.activeRepo.findActiveSubscribersForBroadcast(topics);
    } catch {
      return await this.fallbackRepo.findActiveSubscribersForBroadcast(topics);
    }
  }

  async getSubscriberStats(): Promise<NewsletterStats> {
    try {
      return await this.activeRepo.getSubscriberStats();
    } catch {
      return await this.fallbackRepo.getSubscriberStats();
    }
  }

  async createCampaign(
    campaign: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NewsletterCampaign> {
    try {
      return await this.activeRepo.createCampaign(campaign);
    } catch {
      return await this.fallbackRepo.createCampaign(campaign);
    }
  }

  async findCampaignById(id: string): Promise<NewsletterCampaign | null> {
    try {
      return await this.activeRepo.findCampaignById(id);
    } catch {
      return await this.fallbackRepo.findCampaignById(id);
    }
  }

  async updateCampaign(
    id: string,
    updates: Partial<NewsletterCampaign>,
  ): Promise<NewsletterCampaign | null> {
    try {
      return await this.activeRepo.updateCampaign(id, updates);
    } catch {
      return await this.fallbackRepo.updateCampaign(id, updates);
    }
  }

  async transitionCampaignStatus(
    id: string,
    fromStatus: NewsletterCampaign['status'],
    toStatus: NewsletterCampaign['status'],
    updates: Partial<NewsletterCampaign> = {},
  ): Promise<NewsletterCampaign | null> {
    try {
      return await this.activeRepo.transitionCampaignStatus(id, fromStatus, toStatus, updates);
    } catch {
      return await this.fallbackRepo.transitionCampaignStatus(id, fromStatus, toStatus, updates);
    }
  }

  async findCampaigns(
    limit?: number,
    page?: number,
  ): Promise<{
    items: NewsletterCampaign[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      return await this.activeRepo.findCampaigns(limit, page);
    } catch {
      return await this.fallbackRepo.findCampaigns(limit, page);
    }
  }
}
