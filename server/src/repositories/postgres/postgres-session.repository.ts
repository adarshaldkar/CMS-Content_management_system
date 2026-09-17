import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { CreateSessionDto, RefreshTokenSession } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type {
  ISessionRepository,
  RotationResult,
} from '../interfaces/session.repository.interface';

interface SessionRow extends QueryResultRow {
  id: string;
  user_id: string;
  family_id: string;
  token_hash: string;
  is_revoked: boolean;
  expires_at: Date;
  created_at: Date;
  user_agent: string | null;
  ip_address: string | null;
}

@Injectable()
export class PostgresSessionRepository implements ISessionRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS cms_refresh_sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text NOT NULL,
          family_id uuid NOT NULL,
          token_hash text NOT NULL,
          is_revoked boolean NOT NULL DEFAULT false,
          expires_at timestamptz NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          user_agent text,
          ip_address text
        );

        CREATE INDEX IF NOT EXISTS idx_cms_refresh_sessions_user_id ON cms_refresh_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_cms_refresh_sessions_family_id ON cms_refresh_sessions(family_id);
        CREATE INDEX IF NOT EXISTS idx_cms_refresh_sessions_expires ON cms_refresh_sessions(expires_at);
      `,
      )
      .then(() => undefined);

    await this.ready;
  }

  private toDomain(row: SessionRow): RefreshTokenSession {
    return {
      id: row.id,
      userId: row.user_id,
      familyId: row.family_id,
      tokenHash: row.token_hash,
      isRevoked: row.is_revoked,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
    };
  }

  async create(data: CreateSessionDto): Promise<RefreshTokenSession> {
    await this.ensureSchema();
    const id = data.id ?? crypto.randomUUID();
    const result = await this.postgres.pool.query<SessionRow>(
      `
      INSERT INTO cms_refresh_sessions (
        id, user_id, family_id, token_hash, expires_at, user_agent, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        id,
        data.userId,
        data.familyId,
        data.tokenHash,
        data.expiresAt,
        data.userAgent ?? null,
        data.ipAddress ?? null,
      ],
    );
    return this.toDomain(result.rows[0]);
  }

  async findById(id: string): Promise<RefreshTokenSession | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<SessionRow>(
      'SELECT * FROM cms_refresh_sessions WHERE id = $1',
      [id],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async rotateAtomic(
    oldSessionId: string,
    tokenHash: string,
    newSessionData: CreateSessionDto,
  ): Promise<RotationResult> {
    await this.ensureSchema();
    const client = await this.postgres.pool.connect();

    try {
      await client.query('BEGIN');

      // Lock the session row for update
      const res = await client.query<SessionRow>(
        'SELECT * FROM cms_refresh_sessions WHERE id = $1 FOR UPDATE',
        [oldSessionId],
      );

      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false };
      }

      const current = res.rows[0];

      // Check if session has already been revoked or hash mismatch -> REUSE DETECTED
      if (current.is_revoked || current.token_hash !== tokenHash) {
        // Invalidate entire family
        await client.query(
          'UPDATE cms_refresh_sessions SET is_revoked = true WHERE family_id = $1',
          [current.family_id],
        );
        await client.query('COMMIT');
        return {
          success: false,
          reuseDetected: true,
          familyId: current.family_id,
        };
      }

      // Mark old session as revoked
      await client.query(
        'UPDATE cms_refresh_sessions SET is_revoked = true WHERE id = $1',
        [oldSessionId],
      );

      // Insert new session in same family
      const newId = newSessionData.id ?? crypto.randomUUID();
      const insertRes = await client.query<SessionRow>(
        `
        INSERT INTO cms_refresh_sessions (
          id, user_id, family_id, token_hash, expires_at, user_agent, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
          newId,
          newSessionData.userId,
          current.family_id,
          newSessionData.tokenHash,
          newSessionData.expiresAt,
          newSessionData.userAgent ?? null,
          newSessionData.ipAddress ?? null,
        ],
      );

      await client.query('COMMIT');

      return {
        success: true,
        session: this.toDomain(insertRes.rows[0]),
        familyId: current.family_id,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async revokeFamily(familyId: string): Promise<number> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query(
      'UPDATE cms_refresh_sessions SET is_revoked = true WHERE family_id = $1 AND is_revoked = false',
      [familyId],
    );
    return result.rowCount ?? 0;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query(
      'UPDATE cms_refresh_sessions SET is_revoked = true WHERE user_id = $1 AND is_revoked = false',
      [userId],
    );
    return result.rowCount ?? 0;
  }

  async findUserSessions(userId: string): Promise<RefreshTokenSession[]> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<SessionRow>(
      'SELECT * FROM cms_refresh_sessions WHERE user_id = $1 AND is_revoked = false AND expires_at > now() ORDER BY created_at DESC',
      [userId],
    );
    return result.rows.map((row) => this.toDomain(row));
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query(
      'UPDATE cms_refresh_sessions SET is_revoked = true WHERE id = $1 AND user_id = $2',
      [sessionId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
