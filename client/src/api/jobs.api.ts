import { apiClient } from './client';

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

export interface QueueSummary {
  queueName: string;
  isPaused: boolean;
  counts: QueueCounts;
  metrics: QueueMetrics;
  workersCount: number;
}

export interface JobSummary {
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

export interface JobDetail extends JobSummary {
  data: Record<string, any>;
  opts: Record<string, any>;
  stacktrace: string[];
}

export interface PaginatedJobs {
  items: JobSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const jobsApi = {
  async getQueues(): Promise<QueueSummary[]> {
    const { data } = await apiClient.get<QueueSummary[]>('/admin/queues');
    return data;
  },

  async getJobs(
    queueName: string,
    state: 'active' | 'waiting' | 'delayed' | 'failed' | 'completed' = 'failed',
    page = 1,
    limit = 20,
  ): Promise<PaginatedJobs> {
    const { data } = await apiClient.get<PaginatedJobs>(`/admin/queues/${queueName}/jobs`, {
      params: { state, page, limit },
    });
    return data;
  },

  async getJobDetail(queueName: string, jobId: string): Promise<JobDetail> {
    const { data } = await apiClient.get<JobDetail>(`/admin/queues/${queueName}/jobs/${jobId}`);
    return data;
  },

  async retryJob(queueName: string, jobId: string): Promise<{ success: boolean; jobId: string }> {
    const { data } = await apiClient.post<{ success: boolean; jobId: string }>(
      `/admin/queues/${queueName}/jobs/${jobId}/retry`,
    );
    return data;
  },

  async retryAllFailed(queueName: string): Promise<{ success: boolean; count: number }> {
    const { data } = await apiClient.post<{ success: boolean; count: number }>(
      `/admin/queues/${queueName}/retry-all-failed`,
    );
    return data;
  },

  async removeJob(queueName: string, jobId: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/admin/queues/${queueName}/jobs/${jobId}`,
    );
    return data;
  },

  async pauseQueue(queueName: string): Promise<{ paused: boolean }> {
    const { data } = await apiClient.post<{ paused: boolean }>(`/admin/queues/${queueName}/pause`);
    return data;
  },

  async resumeQueue(queueName: string): Promise<{ paused: boolean }> {
    const { data } = await apiClient.post<{ paused: boolean }>(`/admin/queues/${queueName}/resume`);
    return data;
  },

  async cleanQueue(
    queueName: string,
    params: { gracePeriodMs?: number; status?: 'completed' | 'failed' | 'wait' | 'delayed' | 'paused' },
  ): Promise<{ removedCount: number }> {
    const { data } = await apiClient.post<{ removedCount: number }>(
      `/admin/queues/${queueName}/clean`,
      params,
    );
    return data;
  },
};
