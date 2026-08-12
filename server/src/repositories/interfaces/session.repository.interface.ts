import type { CreateSessionDto, RefreshTokenSession } from '../../domain/models';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface RotationResult {
  success: boolean;
  session?: RefreshTokenSession;
  familyId?: string;
  reuseDetected?: boolean;
}

export interface ISessionRepository {
  create(data: CreateSessionDto): Promise<RefreshTokenSession>;
  findById(id: string): Promise<RefreshTokenSession | null>;
  rotateAtomic(
    oldSessionId: string,
    tokenHash: string,
    newSessionData: CreateSessionDto,
  ): Promise<RotationResult>;
  revokeFamily(familyId: string): Promise<number>;
  revokeAllUserSessions(userId: string): Promise<number>;
}
