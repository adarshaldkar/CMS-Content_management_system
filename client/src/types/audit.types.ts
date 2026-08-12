export interface AuditLog {
  id: string;
  action: string;
  userId: string | null;
  userEmail: string | null;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  metadata: Record<string, any> | null;
  referenceId: string | null;
  createdAt: string;
}
