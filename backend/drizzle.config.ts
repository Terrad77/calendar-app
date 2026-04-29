import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Перевірка для відладки (ви побачите це в консолі при запуску)
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
