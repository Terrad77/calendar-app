import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

const client = connectionString
  ? postgres(connectionString, {
      max: 1,
    })
  : null;

export const db = client ? drizzle(client, { schema }) : null;

export const isDatabaseConfigured = Boolean(db);

export function getDb() {
  if (!db) {
    throw new Error('DATABASE_URL is not configured');
  }

  return db;
}
