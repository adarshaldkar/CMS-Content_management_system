import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  MONGO_URI: z.string().min(1),
  MARIADB_URL: z.string().default('mysql://cms:cms_dev_password@localhost:3307/cms_platform'),
  MYSQL_URL: z.string().default('mysql://cms:cms_dev_password@localhost:3308/cms_platform'),
  COCKROACH_URL: z.string().default('postgresql://root@localhost:26257/cms_platform?sslmode=disable'),
  CLICKHOUSE_URL: z.string().default('http://localhost:8123'),
  CLICKHOUSE_USER: z.string().default('default'),
  CLICKHOUSE_PASSWORD: z.string().default('cms_dev_password'),
  CLICKHOUSE_DB: z.string().default('cms_platform'),
  ACTIVE_DATABASE: z
    .enum(['postgres', 'mongodb', 'mariadb', 'mysql', 'cockroach', 'clickhouse'])
    .default('postgres'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  NEWSLETTER_WEBHOOK_SECRET: z.string().default(''),
  NEWSLETTER_EMAIL_SIMULATED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}
