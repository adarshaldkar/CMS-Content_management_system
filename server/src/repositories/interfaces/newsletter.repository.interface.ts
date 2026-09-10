import type {
  NewsletterSubscriber,
  NewsletterCampaign,
  SubscriberQueryFilters,
  NewsletterStats,
} from '../../domain/models';

export const NEWSLETTER_REPOSITORY = Symbol('NEWSLETTER_REPOSITORY');

export interface INewsletterRepository {
  findSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null>;
  findSubscriberById(id: string): Promise<NewsletterSubscriber | null>;
  findSubscriberByVerifyTokenHash(hash: string): Promise<NewsletterSubscriber | null>;
  findSubscriberByUnsubscribeTokenHash(hash: string): Promise<NewsletterSubscriber | null>;
  createSubscriber(
    subscriber: Omit<NewsletterSubscriber, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NewsletterSubscriber>;
  updateSubscriber(
    id: string,
    updates: Partial<NewsletterSubscriber>,
  ): Promise<NewsletterSubscriber | null>;
  findSubscribers(filters: SubscriberQueryFilters): Promise<{
    items: NewsletterSubscriber[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  findActiveSubscribersForBroadcast(topics?: string[]): Promise<NewsletterSubscriber[]>;
  getSubscriberStats(): Promise<NewsletterStats>;
  createCampaign(
    campaign: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NewsletterCampaign>;
  findCampaignById(id: string): Promise<NewsletterCampaign | null>;
  updateCampaign(
    id: string,
    updates: Partial<NewsletterCampaign>,
  ): Promise<NewsletterCampaign | null>;
  transitionCampaignStatus(
    id: string,
    fromStatus: NewsletterCampaign['status'],
    toStatus: NewsletterCampaign['status'],
    updates?: Partial<NewsletterCampaign>,
  ): Promise<NewsletterCampaign | null>;
  findCampaigns(
    limit?: number,
    page?: number,
  ): Promise<{
    items: NewsletterCampaign[];
    total: number;
    page: number;
    totalPages: number;
  }>;
}
