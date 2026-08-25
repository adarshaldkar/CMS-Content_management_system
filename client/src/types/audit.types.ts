export interface AuditLog {
  id: string;
  action: string;
  actorId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  resource?: string | null;
  resourceType?: string;
  resourceId?: string | null;
  ipAddress: string;
  userAgent: string;
  result?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  status?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  metadata: Record<string, any> | null;
  referenceId?: string | null;
  createdAt: string;
}
