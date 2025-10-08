import pino from 'pino';
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  LLM_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  FEATURE_PATCH_AUTO: z.string().transform(v => v === 'true').default('false' as unknown as any).optional(),
});

export function loadConfig(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error('Invalid environment: ' + JSON.stringify(parsed.error.flatten().fieldErrors));
  }
  return parsed.data;
}

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export type Role = 'admin' | 'technician' | 'viewer';

export function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

