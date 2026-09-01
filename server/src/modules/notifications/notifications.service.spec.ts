import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_REPOSITORY } from '../../repositories/interfaces/notification.repository.interface';
import { RedisService } from '../../redis/redis.service';
import { DeliveryStatus, NotificationType } from '../../domain/models';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockRepo: any;
  let mockRedisClient: any;
  let mockRedisService: any;

  const sampleNotification = {
    id: 'notif-1',
    userId: 'author-1',
    actorId: 'reader-2',
    actorName: 'Marcus Aurelius',
    actorAvatar: null,
    actorCount: 1,
    actorsSummary: [{ id: 'reader-2', name: 'Marcus Aurelius' }],
    type: NotificationType.ARTICLE_LIKED,
    title: 'Story Engagement',
    message: 'Marcus Aurelius liked your story.',
    resourceType: 'article',
    resourceId: 'art-1',
    resourceSlug: 'scaling-redis',
    isRead: false,
    readAt: null,
    deliveryStatus: DeliveryStatus.SENT,
    inAppDeliveredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const defaultPreferences = {
    userId: 'author-1',
    channels: { inApp: true, email: true, browserPush: false },
    events: {
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
    digestFrequency: 'instant',
    quietHours: { enabled: false },
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockRepo = {
      createOrAggregate: jest.fn().mockResolvedValue(sampleNotification),
      findByUserWithCursor: jest.fn().mockResolvedValue({
        items: [sampleNotification],
        nextCursor: null,
        hasMore: false,
      }),
      getUnreadCount: jest.fn().mockResolvedValue(1),
      markAsRead: jest.fn().mockResolvedValue({ ...sampleNotification, isRead: true }),
      markAllAsRead: jest.fn().mockResolvedValue(1),
      getPreferences: jest.fn().mockResolvedValue(defaultPreferences),
      updatePreferences: jest.fn().mockResolvedValue(defaultPreferences),
      savePushSubscription: jest.fn().mockResolvedValue(undefined),
      removePushSubscription: jest.fn().mockResolvedValue(undefined),
    };

    mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('1'),
      incr: jest.fn().mockResolvedValue(2),
      decr: jest.fn().mockResolvedValue(0),
    };

    mockRedisService = {
      isHealthy: jest.fn().mockReturnValue(true),
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      publish: jest.fn().mockResolvedValue(1),
      subscribe: jest.fn().mockReturnValue(() => {}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NOTIFICATION_REPOSITORY,
          useValue: mockRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notify', () => {
    it('should suppress self-notifications when actorId === userId', async () => {
      const result = await service.notify({
        userId: 'user-1',
        actorId: 'user-1',
        actorName: 'Self',
        type: NotificationType.ARTICLE_LIKED,
        title: 'Self Like',
        message: 'You liked your story',
        resourceType: 'article',
        resourceId: 'art-1',
      });

      expect(result).toBeNull();
      expect(mockRepo.createOrAggregate).not.toHaveBeenCalled();
    });

    it('should suppress notification if recipient preference has disabled in-app delivery', async () => {
      mockRepo.getPreferences.mockResolvedValueOnce({
        ...defaultPreferences,
        channels: { inApp: false, email: true, browserPush: false },
      });

      const result = await service.notify({
        userId: 'author-1',
        actorId: 'reader-2',
        actorName: 'Marcus Aurelius',
        type: NotificationType.ARTICLE_LIKED,
        title: 'Story Engagement',
        message: 'Marcus liked your story',
        resourceType: 'article',
        resourceId: 'art-1',
      });

      expect(result).toBeNull();
      expect(mockRepo.createOrAggregate).not.toHaveBeenCalled();
    });

    it('should suppress duplicate notification if Redis deduplication lease already exists', async () => {
      mockRedisClient.set.mockResolvedValueOnce(null); // Key already exists

      const result = await service.notify({
        userId: 'author-1',
        actorId: 'reader-2',
        actorName: 'Marcus Aurelius',
        type: NotificationType.ARTICLE_LIKED,
        title: 'Story Engagement',
        message: 'Marcus liked your story',
        resourceType: 'article',
        resourceId: 'art-1',
      });

      expect(result).toBeNull();
      expect(mockRepo.createOrAggregate).not.toHaveBeenCalled();
    });

    it('should persist notification, increment Redis counter, and publish SSE signal on success', async () => {
      const result = await service.notify({
        userId: 'author-1',
        actorId: 'reader-2',
        actorName: 'Marcus Aurelius',
        type: NotificationType.ARTICLE_LIKED,
        title: 'Story Engagement',
        message: 'Marcus liked your story',
        resourceType: 'article',
        resourceId: 'art-1',
      });

      expect(result).toEqual(sampleNotification);
      expect(mockRepo.createOrAggregate).toHaveBeenCalled();
      expect(mockRedisClient.incr).toHaveBeenCalledWith('notif:unread:author-1');
      expect(mockRedisService.publish).toHaveBeenCalledWith(
        'cms:channel:notifications:author-1',
        expect.objectContaining({
          event: 'NOTIFICATION_RECEIVED',
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return fast count from Redis when key exists in cache', async () => {
      mockRedisClient.get.mockResolvedValueOnce('5');

      const count = await service.getUnreadCount('author-1');
      expect(count).toBe(5);
      expect(mockRepo.getUnreadCount).not.toHaveBeenCalled();
    });

    it('should reconcile from database on cold cache miss and populate Redis', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);
      mockRepo.getUnreadCount.mockResolvedValueOnce(3);

      const count = await service.getUnreadCount('author-1');
      expect(count).toBe(3);
      expect(mockRepo.getUnreadCount).toHaveBeenCalledWith('author-1');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'notif:unread:author-1',
        '3',
        'EX',
        604800,
      );
    });
  });

  describe('markAsRead & markAllAsRead', () => {
    it('should mark single notification as read and decrement Redis counter', async () => {
      const result = await service.markAsRead('notif-1', 'author-1');
      expect(result?.isRead).toBe(true);
      expect(mockRepo.markAsRead).toHaveBeenCalledWith('notif-1', 'author-1');
      expect(mockRedisClient.decr).toHaveBeenCalledWith('notif:unread:author-1');
    });

    it('should mark all notifications as read and reset Redis counter to 0', async () => {
      const result = await service.markAllAsRead('author-1');
      expect(result.success).toBe(true);
      expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('author-1');
      expect(mockRedisClient.set).toHaveBeenCalledWith('notif:unread:author-1', '0', 'EX', 604800);
    });
  });
});
