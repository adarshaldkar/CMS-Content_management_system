import type {
  PublishingSlot,
  CreatePublishingSlotDto,
  UpdatePublishingSlotDto,
  AuthorSlotAssignment,
  AssignAuthorSlotDto,
  AuthorClearanceInfo,
} from '../../domain/models';

export const PUBLISHING_SLOT_REPOSITORY = Symbol('PUBLISHING_SLOT_REPOSITORY');

export interface IPublishingSlotRepository {
  // Slots
  findAllSlots(): Promise<PublishingSlot[]>;
  findSlotById(id: string): Promise<PublishingSlot | null>;
  findSlotBySlug(slug: string): Promise<PublishingSlot | null>;
  createSlot(dto: CreatePublishingSlotDto): Promise<PublishingSlot>;
  updateSlot(id: string, dto: UpdatePublishingSlotDto): Promise<PublishingSlot | null>;
  deleteSlot(id: string): Promise<boolean>;

  // Author Slot Assignments
  findAllAssignments(): Promise<AuthorSlotAssignment[]>;
  findAssignmentByAuthorId(authorId: string): Promise<AuthorSlotAssignment | null>;
  assignAuthorToSlot(dto: AssignAuthorSlotDto, assignedBy?: string): Promise<AuthorSlotAssignment>;
  revokeAuthorAssignment(authorId: string): Promise<boolean>;
  getAuthorClearance(authorId: string): Promise<AuthorClearanceInfo>;

  // Queue Analytics
  getQueuedArticlesCount(slotId: string): Promise<number>;
  getUpcomingScheduledArticles(limit?: number): Promise<any[]>;
}
