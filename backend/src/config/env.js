const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  DATABASE_URL:    z.string().min(1),
  REDIS_URL:       z.string().default('redis://localhost:6379'),
  JWT_SECRET:      z.string().min(32),
  JWT_EXPIRES_IN:  z.string().default('8h'),
  PORT:            z.coerce.number().default(3001),
  NODE_ENV:        z.enum(['development', 'production', 'test']).default('development'),
  APP_URL:         z.string().url().default('http://localhost:3001'),
  FRONTEND_URL:    z.string().url().default('http://localhost:5173'),

  CLINIC_NAME:      z.string().default('Minha Clínica'),
  CLINIC_WHATSAPP:  z.string().default('5551995595300'),
  CLINIC_TIMEZONE:  z.string().default('America/Sao_Paulo'),

  OPENAI_API_KEY:  z.string().optional(),
  OPENAI_MODEL:    z.string().default('gpt-4o-mini'),

  WHATSAPP_PROVIDER: z.enum(['mock', 'baileys']).default('mock'),

  GOOGLE_SERVICE_ACCOUNT_KEY_FILE: z.string().optional(),
  GOOGLE_CALENDAR_ID:              z.string().default('primary'),
  GOOGLE_ENABLED:                  z.string().transform(v => v === 'true').default('false'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = result.data;
