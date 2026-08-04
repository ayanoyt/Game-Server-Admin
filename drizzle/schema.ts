import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Add isActive and isDisabled fields to users table
export const usersExtended = mysqlTable("users_extended", {
  userId: int("userId").primaryKey(),
  isDisabled: boolean("isDisabled").default(false).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  lastPasswordChange: timestamp("lastPasswordChange"),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserExtended = typeof usersExtended.$inferSelect;
export type InsertUserExtended = typeof usersExtended.$inferInsert;

// Game Servers Table
export const gameServers = mysqlTable("game_servers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  gameType: varchar("gameType", { length: 100 }).notNull(), // e.g., "CS:GO", "Minecraft", "Rust"
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(), // IPv4 or IPv6
  port: int("port").notNull(),
  status: mysqlEnum("status", ["online", "offline", "maintenance", "error"]).default("offline").notNull(),
  maxPlayers: int("maxPlayers").notNull(),
  currentPlayers: int("currentPlayers").default(0).notNull(),
  region: varchar("region", { length: 50 }).notNull(), // e.g., "US-East", "EU-West"
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastStatusCheck: timestamp("lastStatusCheck"),
});

export type GameServer = typeof gameServers.$inferSelect;
export type InsertGameServer = typeof gameServers.$inferInsert;

// Activity Logs Table
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  userId: int("userId").notNull(),
  action: mysqlEnum("action", ["start", "stop", "restart", "config_change", "player_update", "status_change", "created", "deleted", "edited"]).notNull(),
  description: text("description"),
  previousValue: json("previousValue"),
  newValue: json("newValue"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// Server Configuration Table
export const serverConfigs = mysqlTable("server_configs", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  configKey: varchar("configKey", { length: 255 }).notNull(),
  configValue: text("configValue"),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServerConfig = typeof serverConfigs.$inferSelect;
export type InsertServerConfig = typeof serverConfigs.$inferInsert;

// User Sessions Table
export const userSessions = mysqlTable("user_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().unique(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  lastActivity: timestamp("lastActivity").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

// Database Backups Table
export const databaseBackups = mysqlTable("database_backups", {
  id: int("id").autoincrement().primaryKey(),
  backupName: varchar("backupName", { length: 255 }).notNull(),
  backupSize: decimal("backupSize", { precision: 15, scale: 2 }),
  backupPath: text("backupPath"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  restoredAt: timestamp("restoredAt"),
  description: text("description"),
});

export type DatabaseBackup = typeof databaseBackups.$inferSelect;
export type InsertDatabaseBackup = typeof databaseBackups.$inferInsert;

// Server Status History Table
export const serverStatusHistory = mysqlTable("server_status_history", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  status: mysqlEnum("status", ["online", "offline", "maintenance", "error"]).notNull(),
  playersCount: int("playersCount").default(0),
  responseTime: int("responseTime"), // in milliseconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServerStatusHistory = typeof serverStatusHistory.$inferSelect;
export type InsertServerStatusHistory = typeof serverStatusHistory.$inferInsert;

// Relations
export const gameServersRelations = relations(gameServers, ({ many, one }) => ({
  activityLogs: many(activityLogs),
  configs: many(serverConfigs),
  statusHistory: many(serverStatusHistory),
  creator: one(users, {
    fields: [gameServers.createdBy],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  server: one(gameServers, {
    fields: [activityLogs.serverId],
    references: [gameServers.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const serverConfigsRelations = relations(serverConfigs, ({ one }) => ({
  server: one(gameServers, {
    fields: [serverConfigs.serverId],
    references: [gameServers.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const databaseBackupsRelations = relations(databaseBackups, ({ one }) => ({
  creator: one(users, {
    fields: [databaseBackups.createdBy],
    references: [users.id],
  }),
}));

export const serverStatusHistoryRelations = relations(serverStatusHistory, ({ one }) => ({
  server: one(gameServers, {
    fields: [serverStatusHistory.serverId],
    references: [gameServers.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdServers: many(gameServers),
  activityLogs: many(activityLogs),
  sessions: many(userSessions),
  backups: many(databaseBackups),
}));