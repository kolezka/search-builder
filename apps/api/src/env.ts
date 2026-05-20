import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DB_PATH: z.string().default('./data/db.sqlite'),
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
