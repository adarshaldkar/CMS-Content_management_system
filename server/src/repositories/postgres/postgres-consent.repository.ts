import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { QueryResultRow } from 'pg';
import type { ConsentRecord, CreateConsentRecordDto } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { IConsentRepository } from '../interfaces/consent.repository.interface';

interface ConsentRow extends QueryResultRow {
  id: string;
  user_id: string | null;
  consent_type: string;
  version: string;
  choice: string;
  timestamp: Date;
  ip_address: string | null;
  user_agent: string | null;
}

@Injectable()
export class PostgresConsentRepository implements IConsentRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE TABLE IF NOT EXISTS cms_consent_records (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text,
          consent_type text NOT NULL,
          version text NOT NULL,
          choice text NOT NULL,
          timestamp timestamptz NOT NULL DEFAULT now(),
          ip_address text,
          user_agent text
        );

        CREATE INDEX IF NOT EXISTS idx_cms_consent_user_id ON cms_consent_records(user_id);
        CREATE INDEX IF NOT EXISTS idx_cms_consent_timestamp ON cms_consent_records(timestamp DESC);
      `,
      )
      .then(() => undefined);

    await this.ready;
  }

  private toDomain(row: ConsentRow): ConsentRecord {
    return {
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type as any,
      version: row.version,
      choice: row.choice as any,
      timestamp: row.timestamp,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    };
  }

  async create(data: CreateConsentRecordDto): Promise<ConsentRecord> {
    await this.ensureSchema();
    const id = randomUUID();
    const result = await this.postgres.pool.query<ConsentRow>(
      `
      INSERT INTO cms_consent_records (
        id, user_id, consent_type, version, choice, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        id,
        data.userId ?? null,
        data.consentType,
        data.version,
        data.choice,
        data.ipAddress ?? null,
        data.userAgent ?? null,
      ],
    );
    return this.toDomain(result.rows[0]);
  }

  async findUserConsent(userId: string): Promise<ConsentRecord[]> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<ConsentRow>(
      'SELECT * FROM cms_consent_records WHERE user_id = $1 ORDER BY timestamp DESC',
      [userId],
    );
    return result.rows.map((row) => this.toDomain(row));
  }
}
