import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// check for debugging: outputs the value of DATABASE_URL to the console before starting the configuration
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is not defined in .env file');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
