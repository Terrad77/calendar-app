import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Перевірка для відладки: виводе в консоль значення DATABASE_URL перед запуском конфігурації
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is not defined in .env file');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Використовуємо стандартний process.env
  },
});
