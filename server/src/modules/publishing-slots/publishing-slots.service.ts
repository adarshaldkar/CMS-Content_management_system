import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PUBLISHING_SLOT_REPOSITORY,
  type IPublishingSlotRepository,
} from '../../repositories/interfaces/publishing-slot.repository.interface';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../repositories/interfaces/user.repository.interface';
import { AuditService } from '../audit/audit.service';
import {
  AuditEventType,
  type PublishingSlot,
  type CreatePublishingSlotDto,
  type UpdatePublishingSlotDto,
  type AuthorSlotAssignment,
  type AssignAuthorSlotDto,
  type AuthorClearanceInfo,
  type AuthUser,
} from '../../domain/models';

@Injectable()
export class PublishingSlotsService {
  private readonly logger = new Logger(PublishingSlotsService.name);

  constructor(
    @Inject(PUBLISHING_SLOT_REPOSITORY)
    private readonly slotRepo: IPublishingSlotRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================
  // Slot Management
  // ==========================================

  async findAllSlots(): Promise<PublishingSlot[]> {
    return this.slotRepo.findAllSlots();
  }

  async findSlotById(id: string): Promise<PublishingSlot> {
    const slot = await this.slotRepo.findSlotById(id);
    if (!slot) {
      throw new NotFoundException(`Publishing slot with identifier '${id}' not found.`);
    }
    return slot;
  }

  async createSlot(dto: CreatePublishingSlotDto, actor?: AuthUser): Promise<PublishingSlot> {
    if (!dto.name || !dto.dispatchTime) {
      throw new BadRequestException('Slot name and dispatchTime (e.g., "16:30:00") are required.');
    }

    const created = await this.slotRepo.createSlot(dto);

    if (actor) {
      this.auditService.log({
        action: AuditEventType.SLOT_CREATED,
        actorId: actor.id,
        resource: `PublishingSlot:${created.id}`,
        result: 'SUCCESS',
        metadata: { slotName: created.name, dispatchTime: created.dispatchTime },
      }).catch((err) => this.logger.error(`Failed to audit slot creation: ${err.message}`));
    }

    return created;
  }

  async updateSlot(id: string, dto: UpdatePublishingSlotDto, actor?: AuthUser): Promise<PublishingSlot> {
    const updated = await this.slotRepo.updateSlot(id, dto);
    if (!updated) {
      throw new NotFoundException(`Publishing slot '${id}' not found.`);
    }

    if (actor) {
      this.auditService.log({
        action: AuditEventType.SLOT_UPDATED,
        actorId: actor.id,
        resource: `PublishingSlot:${updated.id}`,
        result: 'SUCCESS',
        metadata: { changes: dto },
      }).catch((err) => this.logger.error(`Failed to audit slot update: ${err.message}`));
    }

    return updated;
  }

  async deleteSlot(id: string, actor?: AuthUser): Promise<boolean> {
    const existing = await this.findSlotById(id);
    const success = await this.slotRepo.deleteSlot(existing.id);

    if (success && actor) {
      this.auditService.log({
        action: AuditEventType.SLOT_DELETED,
        actorId: actor.id,
        resource: `PublishingSlot:${existing.id}`,
        result: 'SUCCESS',
        metadata: { slotName: existing.name },
      }).catch((err) => this.logger.error(`Failed to audit slot deletion: ${err.message}`));
    }

    return success;
  }

  // ==========================================
  // Author Slot Assignments & Clearance
  // ==========================================

  async findAllAssignments(): Promise<AuthorSlotAssignment[]> {
    return this.slotRepo.findAllAssignments();
  }

  async assignAuthor(dto: AssignAuthorSlotDto, actor?: AuthUser): Promise<AuthorSlotAssignment> {
    const user = await this.userRepo.findById(dto.authorId);
    if (!user) {
      throw new NotFoundException(`Author user '${dto.authorId}' does not exist.`);
    }

    const slot = await this.slotRepo.findSlotById(dto.slotId);
    if (!slot) {
      throw new NotFoundException(`Publishing slot '${dto.slotId}' does not exist.`);
    }

    const assignment = await this.slotRepo.assignAuthorToSlot(dto, actor?.id);

    if (actor) {
      this.auditService.log({
        action: AuditEventType.AUTHOR_SLOT_ASSIGNED,
        actorId: actor.id,
        resource: `AuthorSlotAssignment:${assignment.id}`,
        result: 'SUCCESS',
        metadata: {
          authorId: dto.authorId,
          authorName: user.name,
          slotId: dto.slotId,
          slotName: slot.name,
        },
      }).catch((err) => this.logger.error(`Failed to audit author slot assignment: ${err.message}`));
    }

    return assignment;
  }

  async revokeAuthorAssignment(authorId: string, actor?: AuthUser): Promise<boolean> {
    const success = await this.slotRepo.revokeAuthorAssignment(authorId);

    if (success && actor) {
      this.auditService.log({
        action: AuditEventType.AUTHOR_SLOT_REVOKED,
        actorId: actor.id,
        resource: `AuthorSlotAssignment:${authorId}`,
        result: 'SUCCESS',
        metadata: { authorId },
      }).catch((err) => this.logger.error(`Failed to audit author slot revocation: ${err.message}`));
    }

    return success;
  }

  async getAuthorClearance(authorId: string): Promise<AuthorClearanceInfo> {
    const clearance = await this.slotRepo.getAuthorClearance(authorId);
    if (clearance.hasSlot && clearance.slot) {
      const queued = await this.slotRepo.getQueuedArticlesCount(clearance.slot.id);
      const nextTime = this.calculateNextSlotExecution(clearance.slot, queued);
      clearance.nextEstimatedPublishAt = nextTime.toISOString();
    }
    return clearance;
  }

  async getUpcomingQueue(limit = 15): Promise<any[]> {
    return this.slotRepo.getUpcomingScheduledArticles(limit);
  }

  // ==========================================
  // Slot Timing Calculation Engine
  // ==========================================

  /**
   * Calculates the exact scheduled timestamp for a new submission in a slot.
   * Takes into account slot dispatch time, timezone, and staggered queue spacing.
   */
  calculateNextSlotExecution(slot: PublishingSlot, queuedCount = 0): Date {
    const now = new Date();
    const parts = (slot.dispatchTime || '16:30:00').split(':').map((p) => parseInt(p, 10) || 0);
    const targetHour = parts[0] ?? 16;
    const targetMinute = parts[1] ?? 30;
    const targetSecond = parts[2] ?? 0;

    const scheduledDate = new Date(now.getTime());
    scheduledDate.setUTCHours(targetHour, targetMinute, targetSecond, 0);

    // If target time today has already elapsed (or within 2 minutes), roll over to tomorrow
    if (scheduledDate.getTime() <= now.getTime() + 2 * 60 * 1000) {
      scheduledDate.setUTCDate(scheduledDate.getUTCDate() + 1);
    }

    // Add staggered spacing offset (e.g. 0 min, 5 min, 10 min)
    const staggerOffsetMinutes = (slot.staggerMinutes || 5) * queuedCount;
    scheduledDate.setUTCMinutes(scheduledDate.getUTCMinutes() + staggerOffsetMinutes);

    return scheduledDate;
  }
}
