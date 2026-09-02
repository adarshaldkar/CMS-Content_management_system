export const QUEUE_NAMES = {
  SCHEDULED_PUBLISHING: 'scheduled-publishing',
  NOTIFICATION_OUTBOX: 'notification-outbox',
  MESH_RECONCILIATION: 'mesh-reconciliation',
  ANALYTICS_ROLLUP: 'analytics-rollup',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUES: QueueName[] = [
  QUEUE_NAMES.SCHEDULED_PUBLISHING,
  QUEUE_NAMES.NOTIFICATION_OUTBOX,
  QUEUE_NAMES.MESH_RECONCILIATION,
  QUEUE_NAMES.ANALYTICS_ROLLUP,
];

export const JOB_NAMES = {
  PUBLISH_SCHEDULED_ARTICLE: 'publish-scheduled-article',
  DISPATCH_NOTIFICATION: 'dispatch-notification',
  REPLAY_SECONDARY_WRITE: 'replay-secondary-write',
  ANALYTICS_HOURLY_ROLLUP: 'analytics-hourly-rollup',
} as const;
