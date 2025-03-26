import { blob, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

export const sessionTable = sqliteTable('session', {
    id: text('id', { length: 100 }).primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id', { length: 100 })
        .notNull()
        .references(() => userTable.id),
    expiresAt: integer('expires_at', {
        mode: 'timestamp',
    }).notNull(),
    twoFactorVerified: integer('two_factor_verified').notNull().default(0),
});

export const userTable = sqliteTable(
    'user',
    {
        id: text('id', { length: 100, mode: 'text' }).primaryKey().$defaultFn(() => nanoid()),
        username: text('username', { length: 100, mode: "text" }).notNull(),
        email: text('email', { length: 100, mode: 'text' }).unique().notNull(),
        password: text('password_hash', { mode: 'text', length: 255 }).notNull(),
        emailVerified: integer('email_verified', { mode: 'number' }).notNull().default(0),
        totpKey: blob('totp_key').$type<Uint8Array>(),
        recoveryCode: blob('recovery_code').$type<Uint8Array>().notNull(),
    },
    (table) => ({
        emailIdx: uniqueIndex('email_idx').on(table.email),
        username: uniqueIndex('username').on(table.username),
    })
);

export const passwordResetSessionTable = sqliteTable('password_reset_session', {
    id: text('id', { length: 100 }).primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id', { length: 100 })
        .notNull()
        .references(() => userTable.id),
    email: text('email', { length: 100 }).notNull().unique(),
    code: text('code').notNull(),
    expiresAt: integer('expires_at', {
        mode: 'timestamp',
    }).notNull(),
    twoFactorVerified: integer('two_factor_verified').notNull().default(0),
});