export interface PublishingSlot {
  id: string;
  name: string;
  slug: string;
  dispatchTime: string; // HH:mm:ss format e.g. "16:30:00"
  timezone: string; // e.g. "UTC" or "Asia/Kolkata"
  daysActive: string; // "ALL" or "MON,TUE,WED,THU,FRI"
  maxArticlesPerSlot: number;
  staggerMinutes: number; // e.g. 5 minutes spacing between queued articles
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Computed runtime fields
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
  createdAt: Date;
  authorName?: string;
  authorEmail?: string;
  authorAvatar?: string | null;
  slotName?: string;
  slotDispatchTime?: string;
}

export interface CreatePublishingSlotDto {
  name: string;
  slug?: string;
  dispatchTime: string; // "16:30" or "16:30:00"
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
