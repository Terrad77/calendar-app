import { relations } from 'drizzle-orm';
import {
  boolean,
  bigint,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  jsonb,
} from 'drizzle-orm/pg-core';

export const eventTypeEnum = pgEnum('event_type', ['task', 'holiday', 'meeting', 'reminder']);
export const colorEnum = pgEnum('color_type', ['default', 'red', 'yellow', 'green']);
export const priorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    password: text('password').notNull(),
    googleId: text('google_id'),
    isVerified: boolean('is_verified').notNull().default(false),
    verificationToken: text('verification_token'),
    verificationTokenExpiry: bigint('verification_token_expiry', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
    googleIdUnique: uniqueIndex('users_google_id_unique').on(table.googleId),
    verificationTokenUnique: uniqueIndex('users_verification_token_unique').on(
      table.verificationToken
    ),
  })
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenUnique: uniqueIndex('refresh_tokens_token_unique').on(table.token),
    userIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  })
);

export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventType: eventTypeEnum('event_type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    startTime: text('start_time'),
    endTime: text('end_time'),
    location: text('location'),
    countryCode: text('country_code'),
    reminderTime: text('reminder_time'),
    isRecurring: boolean('is_recurring').notNull().default(false),
    isPublic: boolean('is_public').notNull().default(false),
    completed: boolean('completed').notNull().default(false),
    priority: priorityEnum('priority'),
    colors: jsonb('colors')
      .$type<Array<'default' | 'red' | 'yellow' | 'green'>>()
      .notNull()
      .default([]),
    participants: jsonb('participants').$type<string[]>().notNull().default([]),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('calendar_events_user_id_idx').on(table.userId),
    startDateIdx: index('calendar_events_start_date_idx').on(table.startDate),
    endDateIdx: index('calendar_events_end_date_idx').on(table.endDate),
    typeIdx: index('calendar_events_event_type_idx').on(table.eventType),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  events: many(calendarEvents),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
}));
