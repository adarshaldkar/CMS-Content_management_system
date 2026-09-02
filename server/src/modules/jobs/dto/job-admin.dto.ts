export interface QueueCounts {
  active: number;
  waiting: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: number;
}

export interface QueueMetrics {
  oldestWaitingJobAgeMs: number;
  p95ProcessingLatencyMs: number;
  throughputPerMinute: number;
  dlqSize: number;
}

export interface QueueSummaryDto {
  queueName: string;
  isPaused: boolean;
  counts: QueueCounts;
  metrics: QueueMetrics;
  workersCount: number;
}

export interface JobSummaryDto {
  id: string;
  name: string;
  state: string;
  progress: number;
  attemptsMade: number;
  failedReason?: string | null;
  timestamp: number;
  processedOn?: number | null;
  finishedOn?: number | null;
  delay?: number;
}

export interface JobDetailDto extends JobSummaryDto {
  data: Record<string, any>;
  opts: Record<string, any>;
  stacktrace: string[];
}

export interface PaginatedJobsDto {
  items: JobSummaryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CleanQueueDto {
  gracePeriodMs?: number;
  status?: 'completed' | 'failed' | 'wait' | 'delayed' | 'paused';
}
