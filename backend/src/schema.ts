import { relations, sql } from 'drizzle-orm';
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
    jobTitle: text('job_title'),
    googleId: text('google_id'),
    isVerified: boolean('is_verified').notNull().default(false),
    verificationToken: text('verification_token'),
    verificationTokenExpiry: bigint('verification_token_expiry', { mode: 'number' }),
    theme: text('theme').default('light'),
    language: text('language').default('en'),
    preferredCountry: text('preferred_country'),
    startOfWeek: text('start_of_week').default('Monday'),
    timeZone: text('time_zone').default('Europe/Kyiv'),
    workingHours: text('working_hours').default('08:30 - 18:00'),
    compactDensity: boolean('compact_density').notNull().default(false),
    emailDigest: boolean('email_digest').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
    emailLowerIdx: index('users_email_lower_idx').on(sql`lower(${table.email})`),
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
    id: uuid('id').primaryKey().defaultRandom(),
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
    isPrivate: boolean('is_private').notNull().default(false),
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

// 1. Enums for participation status and permission levels
export const participationStatusEnum = pgEnum('participation_status', [
  'pending', // Awaiting response
  'accepted', // Accepted (event displayed in guest's calendar)
  'declined', // Declined
  'tentative', // Tentative
]);

export const permissionLevelEnum = pgEnum('permission_level', [
  'read', // Read-only
  'write', // Create and edit events in a shared calendar
]);

// 2. Table for event participants
export const eventParticipants = pgTable(
  'event_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => calendarEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: participationStatusEnum('status').default('pending').notNull(),
    invitedAt: timestamp('invited_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    eventUserUnique: uniqueIndex('event_participants_event_user_unique').on(
      table.eventId,
      table.userId
    ),
    userIdx: index('event_participants_user_id_idx').on(table.userId),
    eventIdx: index('event_participants_event_id_idx').on(table.eventId),
  })
);

// 3. Table for calendar shares
export const calendarShares = pgTable(
  'calendar_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sharedWithId: uuid('shared_with_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permission: permissionLevelEnum('permission').default('read').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    ownerIdx: index('calendar_shares_owner_id_idx').on(table.ownerId),
    sharedWithIdx: index('calendar_shares_shared_with_id_idx').on(table.sharedWithId),
  })
);

// 4. Relations for new tables
export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(calendarEvents, {
    fields: [eventParticipants.eventId],
    references: [calendarEvents.id],
  }),
  user: one(users, {
    fields: [eventParticipants.userId],
    references: [users.id],
  }),
}));

export const calendarSharesRelations = relations(calendarShares, ({ one }) => ({
  owner: one(users, {
    fields: [calendarShares.ownerId],
    references: [users.id],
  }),
  sharedWith: one(users, {
    fields: [calendarShares.sharedWithId],
    references: [users.id],
  }),
}));

// 5. Notification system
export const notificationTypeEnum = pgEnum('notification_type', [
  'INVITATION',
  'REMINDER',
  'SYSTEM',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    // referenceId links back to the source record (e.g. eventParticipants.id for INVITATION)
    referenceId: uuid('reference_id'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('notifications_user_id_idx').on(table.userId),
    isReadIdx: index('notifications_is_read_idx').on(table.isRead),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
