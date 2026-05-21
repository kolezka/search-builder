import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),

  // Database — accept full DATABASE_URL OR composed POSTGRES_*
  DATABASE_URL: z.string().optional(),
  POSTGRES_HOST: z.string().default('postgres'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string().default('search_builder'),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DB: z.string().default('search_builder'),

  INITIAL_PASSWORD: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().default(30),
  COOKIE_SECURE: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  COOKIE_DOMAIN: z.string().optional(),
  ALLOWED_ORIGIN: z.string().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);

export function databaseUrl(): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (!env.POSTGRES_PASSWORD) {
    throw new Error('DATABASE_URL or POSTGRES_PASSWORD must be set');
  }
  const pwd = encodeURIComponent(env.POSTGRES_PASSWORD);
  return `postgres://${env.POSTGRES_USER}:${pwd}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;
}
