export const QUEUE_NAMES = {
  SCHEDULED_PUBLISHING: 'scheduled-publishing',
  NOTIFICATION_OUTBOX: 'notification-outbox',
  NEWSLETTER_BROADCAST: 'newsletter-broadcast',
  MESH_RECONCILIATION: 'mesh-reconciliation',
  ANALYTICS_ROLLUP: 'analytics-rollup',
  IMAGE_PROCESSING: 'image-processing',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUES: QueueName[] = [
  QUEUE_NAMES.SCHEDULED_PUBLISHING,
  QUEUE_NAMES.NOTIFICATION_OUTBOX,
  QUEUE_NAMES.NEWSLETTER_BROADCAST,
  QUEUE_NAMES.MESH_RECONCILIATION,
  QUEUE_NAMES.ANALYTICS_ROLLUP,
  QUEUE_NAMES.IMAGE_PROCESSING,
];

export const JOB_NAMES = {
  PUBLISH_SCHEDULED_ARTICLE: 'publish-scheduled-article',
  RECONCILE_SCHEDULED_PUBLISHERS: 'reconcile-scheduled-publishers',
  DISPATCH_NOTIFICATION: 'dispatch-notification',
  DISPATCH_NEWSLETTER_VERIFICATION: 'dispatch-newsletter-verification',
  DISPATCH_NEWSLETTER_BATCH: 'dispatch-newsletter-batch',
  REPLAY_SECONDARY_WRITE: 'replay-secondary-write',
  ANALYTICS_HOURLY_ROLLUP: 'analytics-hourly-rollup',
  PROCESS_IMAGE_OPTIMIZATION: 'process-image-optimization',
} as const;
