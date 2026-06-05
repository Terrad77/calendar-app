import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import 'dotenv/config';

// cheking for DATABASE_URL presence at startup for better error handling
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in environment variables');
}

// Initialize the database client and Drizzle ORM instance
const client = postgres(process.env.DATABASE_URL);

export const db = drizzle(client, { schema });

export const isDatabaseConfigured = Boolean(db);

export function getDb() {
  //defensive programming: check if db is configured before returning
  if (!db) {
    throw new Error('DATABASE_URL is not configured');
  }

  return db;
}

export async function closeDb() {
  if (!client) {
    return;
  }

  await client.end({ timeout: 5 });
}
