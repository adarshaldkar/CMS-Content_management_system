import { apiClient } from './client';

export interface PublishingSlot {
  id: string;
  name: string;
  slug: string;
  dispatchTime: string;
  timezone: string;
  daysActive: string;
  maxArticlesPerSlot: number;
  staggerMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  queuedCount?: number;
  assignedAuthorCount?: number;
}

export interface AuthorSlotAssignment {
  id: string;
  authorId: string;
  slotId: string;
  autoPublishEnabled: boolean;
  dailyQuota: number;
  assignedBy?: string | null;
  createdAt: string;
  authorName?: string;
  authorEmail?: string;
  authorAvatar?: string | null;
  slotName?: string;
  slotDispatchTime?: string;
}

export interface CreatePublishingSlotDto {
  name: string;
  slug?: string;
  dispatchTime: string;
  timezone?: string;
  daysActive?: string;
  maxArticlesPerSlot?: number;
  staggerMinutes?: number;
  isActive?: boolean;
}

export interface UpdatePublishingSlotDto {
  name?: string;
  dispatchTime?: string;
  timezone?: string;
  daysActive?: string;
  maxArticlesPerSlot?: number;
  staggerMinutes?: number;
  isActive?: boolean;
}

export interface AssignAuthorSlotDto {
  authorId: string;
  slotId: string;
  autoPublishEnabled?: boolean;
  dailyQuota?: number;
}

export interface AuthorClearanceInfo {
  hasSlot: boolean;
  slot?: PublishingSlot | null;
  assignment?: AuthorSlotAssignment | null;
  nextEstimatedPublishAt?: string | null;
}

export interface QueuedSlotArticle {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduled_at: string;
  cover_image?: string | null;
  author_id: string;
  author_name: string;
  author_avatar?: string | null;
  slot_name?: string;
  slot_dispatch_time?: string;
}

export const publishingSlotsApi = {
  // Admin Endpoints
  async getSlots(): Promise<PublishingSlot[]> {
    const res = await apiClient.get<PublishingSlot[]>('/admin/slots');
    return res.data;
  },

  async createSlot(dto: CreatePublishingSlotDto): Promise<PublishingSlot> {
    const res = await apiClient.post<PublishingSlot>('/admin/slots', dto);
    return res.data;
  },

  async updateSlot(id: string, dto: UpdatePublishingSlotDto): Promise<PublishingSlot> {
    const res = await apiClient.patch<PublishingSlot>(`/admin/slots/${id}`, dto);
    return res.data;
  },

  async deleteSlot(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/admin/slots/${id}`);
    return res.data;
  },

  async getAssignments(): Promise<AuthorSlotAssignment[]> {
    const res = await apiClient.get<AuthorSlotAssignment[]>('/admin/slots/assignments');
    return res.data;
  },

  async assignAuthor(dto: AssignAuthorSlotDto): Promise<AuthorSlotAssignment> {
    const res = await apiClient.post<AuthorSlotAssignment>('/admin/slots/assignments', dto);
    return res.data;
  },

  async revokeAuthor(authorId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/admin/slots/assignments/${authorId}`);
    return res.data;
  },

  async getUpcomingQueue(limit = 20): Promise<QueuedSlotArticle[]> {
    const res = await apiClient.get<QueuedSlotArticle[]>(`/admin/slots/queue?limit=${limit}`);
    return res.data;
  },

  // Author Endpoints
  async getMyClearance(): Promise<AuthorClearanceInfo> {
    const res = await apiClient.get<AuthorClearanceInfo>('/slots/my-clearance');
    return res.data;
  },
};
