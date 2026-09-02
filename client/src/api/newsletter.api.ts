import { apiClient } from './client';

export type SubscriberStatus =
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'UNSUBSCRIBED'
  | 'BOUNCED'
  | 'COMPLAINED';

export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT'
  | 'PARTIALLY_FAILED'
  | 'FAILED'
  | 'CANCELLED';

export type DigestFrequency = 'INSTANT' | 'DAILY' | 'WEEKLY';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  topics: string[];
  frequency: DigestFrequency;
  bounceCount: number;
  verifiedAt: string | null;
  unsubscribedAt: string | null;
  lastBouncedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  scheduledAt: string | null;
  sentAt: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterStats {
  totalSubscribers: number;
  activeSubscribers: number;
  pendingVerification: number;
  unsubscribed: number;
  bounced: number;
  totalCampaignsSent: number;
}

export interface SubscribeResponse {
  message: string;
  status: SubscriberStatus;
  email: string;
  isAlreadySubscribed: boolean;
  verificationToken?: string;
}

export interface VerifyResponse {
  message: string;
  subscriber: {
    email: string;
    topics: string[];
    frequency: DigestFrequency;
    status: SubscriberStatus;
    verifiedAt: string;
    unsubscribeTokenHash: string;
  };
}

export const newsletterApi = {
  // Public
  subscribe: async (data: { email: string; topics?: string[]; frequency?: DigestFrequency }): Promise<SubscribeResponse> => {
    const res = await apiClient.post<SubscribeResponse>('/newsletter/subscribe', data);
    return res.data;
  },

  verify: async (token: string): Promise<VerifyResponse> => {
    const res = await apiClient.get<VerifyResponse>(`/newsletter/verify/${token}`);
    return res.data;
  },

  getPreferences: async (token: string) => {
    const res = await apiClient.get<{
      email: string;
      status: SubscriberStatus;
      topics: string[];
      frequency: DigestFrequency;
      verifiedAt: string | null;
    }>(`/newsletter/preferences/${token}`);
    return res.data;
  },

  updatePreferences: async (
    token: string,
    data: { topics?: string[]; frequency?: DigestFrequency; unsubscribeAll?: boolean },
  ) => {
    const res = await apiClient.patch<{
      message: string;
      status: SubscriberStatus;
      topics: string[];
      frequency: DigestFrequency;
    }>(`/newsletter/preferences/${token}`, data);
    return res.data;
  },

  // Admin
  getStats: async (): Promise<NewsletterStats> => {
    const res = await apiClient.get<NewsletterStats>('/admin/newsletter/stats');
    return res.data;
  },

  getSubscribers: async (params?: {
    status?: SubscriberStatus;
    search?: string;
    topic?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      items: NewsletterSubscriber[];
      total: number;
      page: number;
      totalPages: number;
    }>('/admin/newsletter/subscribers', { params });
    return res.data;
  },

  getCampaigns: async (params?: { limit?: number; page?: number }) => {
    const res = await apiClient.get<{
      items: NewsletterCampaign[];
      total: number;
      page: number;
      totalPages: number;
    }>('/admin/newsletter/campaigns', { params });
    return res.data;
  },

  createCampaign: async (data: {
    subject: string;
    previewText?: string;
    contentHtml: string;
    targetTopics?: string[];
    scheduledAt?: string | null;
  }): Promise<NewsletterCampaign> => {
    const res = await apiClient.post<NewsletterCampaign>('/admin/newsletter/campaigns', data);
    return res.data;
  },

  sendCampaign: async (campaignId: string) => {
    const res = await apiClient.post<{
      message: string;
      campaignId: string;
      totalRecipients: number;
      batchesEnqueued: number;
    }>(`/admin/newsletter/campaigns/${campaignId}/send`);
    return res.data;
  },
};
