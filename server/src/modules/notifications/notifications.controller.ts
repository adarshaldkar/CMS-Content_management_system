import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable, Subject } from 'rxjs';
import { CurrentUser } from '../../common/decorators/security.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import {
  type AuthUser,
  type NotificationCursorResult,
  type NotificationItem,
  type NotificationPreferences,
} from '../../domain/models';
import { NotificationsService } from './notifications.service';
import { RedisService } from '../../redis/redis.service';

interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List user notifications with cursor-based pagination' })
  async getInbox(
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<NotificationCursorResult> {
    return this.notificationsService.getInbox(
      user.id,
      cursor,
      limit ? parseInt(limit, 10) : 20,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Fast Redis unread notification count for header badge' })
  async getUnreadCount(@CurrentUser() user: AuthUser): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationsService.getUnreadCount(user.id);
    return { unreadCount };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<NotificationItem | null> {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  async markAllAsRead(
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: boolean; markedCount: number }> {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user notification delivery preferences' })
  async getPreferences(@CurrentUser() user: AuthUser): Promise<NotificationPreferences> {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user notification delivery preferences' })
  async updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() body: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    return this.notificationsService.updatePreferences(user.id, body);
  }

  @Post('push-subscription')
  @ApiOperation({ summary: 'Register browser Web Push subscription' })
  async savePushSubscription(
    @CurrentUser() user: AuthUser,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
  ): Promise<{ success: boolean }> {
    await this.notificationsService.savePushSubscription({
      userId: user.id,
      endpoint: body.endpoint,
      keys: body.keys,
      userAgent: body.userAgent,
    });
    return { success: true };
  }

  @Delete('push-subscription')
  @ApiOperation({ summary: 'Unregister browser Web Push subscription' })
  async removePushSubscription(
    @CurrentUser() user: AuthUser,
    @Body() body: { endpoint: string },
  ): Promise<{ success: boolean }> {
    await this.notificationsService.removePushSubscription(user.id, body.endpoint);
    return { success: true };
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Server-Sent Events stream for instant in-app alerts' })
  streamNotifications(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    const channel = `cms:channel:notifications:${user.id}`;

    // Await subscription setup so the first event cannot race the stream start.
    // Errors here are non-fatal: the stream stays open and recovers on reconnect.
    this.redisService.subscribe(channel, (rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage);
        subject.next({
          data: payload,
          type: payload.event || 'NOTIFICATION_RECEIVED',
        });
      } catch (err) {
        this.logger.warn(`Failed to parse SSE payload on channel [${channel}]: ${String(err)}`);
      }
    }).then(
      (unsub) => {
        this.cleanupFns.set(channel, unsub);
      },
      (err) => {
        this.logger.warn(`Failed to subscribe to SSE channel [${channel}]: ${String(err)}`);
      },
    );

    const sub = subject.subscribe();

    return new Observable<MessageEvent>((observer) => {
      const innerSub = subject.subscribe(observer);
      return () => {
        innerSub.unsubscribe();
        const cleanup = this.cleanupFns.get(channel);
        if (typeof cleanup === 'function') {
          cleanup();
          this.cleanupFns.delete(channel);
        }
      };
    });
  }

  private readonly logger = new Logger(NotificationsController.name);
  private readonly cleanupFns = new Map<string, () => void>();
}
