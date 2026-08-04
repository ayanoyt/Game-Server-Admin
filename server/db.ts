import { eq, desc, and, or, like, gte, lte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  gameServers,
  activityLogs,
  serverConfigs,
  userSessions,
  databaseBackups,
  serverStatusHistory,
  usersExtended,
  GameServer,
  ActivityLog,
  ServerConfig,
  UserSession,
  DatabaseBackup,
  ServerStatusHistory,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= GAME SERVERS =============

export async function listGameServers(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameServers).limit(limit).offset(offset);
}

export async function getGameServerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gameServers).where(eq(gameServers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGameServer(data: {
  name: string;
  gameType: string;
  ipAddress: string;
  port: number;
  maxPlayers: number;
  region: string;
  description?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(gameServers).values(data);
  return result;
}

export async function updateGameServer(id: number, data: Partial<GameServer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(gameServers).set(data).where(eq(gameServers.id, id));
}

export async function deleteGameServer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gameServers).where(eq(gameServers.id, id));
}

export async function searchGameServers(query: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(gameServers)
    .where(
      or(
        like(gameServers.name, `%${query}%`),
        like(gameServers.gameType, `%${query}%`),
        like(gameServers.region, `%${query}%`)
      )
    )
    .limit(limit);
}

export async function getServersByStatus(status: "online" | "offline" | "maintenance" | "error", limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameServers).where(eq(gameServers.status, status)).limit(limit);
}

// ============= ACTIVITY LOGS =============

export async function createActivityLog(data: {
  serverId: number;
  userId: number;
  action: "start" | "stop" | "restart" | "config_change" | "player_update" | "status_change" | "created" | "deleted" | "edited";
  description?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(activityLogs).values(data);
}

export async function getActivityLogs(serverId?: number, limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  if (serverId) {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.serverId, serverId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
  return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit).offset(offset);
}

export async function getActivityLogsByUser(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

export async function getActivityLogsByAction(action: "start" | "stop" | "restart" | "config_change" | "player_update" | "status_change" | "created" | "deleted" | "edited", limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.action, action))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

// ============= SERVER CONFIGURATIONS =============

export async function getServerConfigs(serverId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serverConfigs).where(eq(serverConfigs.serverId, serverId));
}

export async function setServerConfig(serverId: number, key: string, value: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(serverConfigs)
    .where(and(eq(serverConfigs.serverId, serverId), eq(serverConfigs.configKey, key)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(serverConfigs)
      .set({ configValue: value, description })
      .where(and(eq(serverConfigs.serverId, serverId), eq(serverConfigs.configKey, key)));
  } else {
    await db.insert(serverConfigs).values({ serverId, configKey: key, configValue: value, description });
  }
}

// ============= USER SESSIONS =============

export async function createUserSession(data: {
  userId: number;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(userSessions).values(data);
}

export async function getUserSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userSessions).where(eq(userSessions.userId, userId));
}

export async function getSessionByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userSessions).where(eq(userSessions.sessionToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteUserSession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userSessions).where(eq(userSessions.id, sessionId));
}

export async function deleteExpiredSessions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userSessions).where(lte(userSessions.expiresAt, new Date()));
}

// ============= DATABASE BACKUPS =============

export async function createDatabaseBackup(data: {
  backupName: string;
  backupSize?: string | number;
  backupPath?: string;
  createdBy: number;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertData = {
    ...data,
    backupSize: data.backupSize ? String(data.backupSize) : undefined,
  };
  return db.insert(databaseBackups).values(insertData);
}

export async function getDatabaseBackups(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(databaseBackups).orderBy(desc(databaseBackups.createdAt)).limit(limit).offset(offset);
}

export async function getDatabaseBackupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(databaseBackups).where(eq(databaseBackups.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markBackupAsRestored(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(databaseBackups).set({ restoredAt: new Date() }).where(eq(databaseBackups.id, id));
}

// ============= SERVER STATUS HISTORY =============

export async function recordServerStatus(data: {
  serverId: number;
  status: "online" | "offline" | "maintenance" | "error";
  playersCount?: number;
  responseTime?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(serverStatusHistory).values(data);
}

export async function getServerStatusHistory(serverId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(serverStatusHistory)
    .where(eq(serverStatusHistory.serverId, serverId))
    .orderBy(desc(serverStatusHistory.createdAt))
    .limit(limit);
}

export async function getServerStatusHistoryRange(serverId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(serverStatusHistory)
    .where(
      and(
        eq(serverStatusHistory.serverId, serverId),
        gte(serverStatusHistory.createdAt, startDate),
        lte(serverStatusHistory.createdAt, endDate)
      )
    )
    .orderBy(desc(serverStatusHistory.createdAt));
}

// ============= USER MANAGEMENT =============

export async function getAllUsers(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).limit(limit).offset(offset);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function disableUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(usersExtended).values({ userId, isDisabled: true }).onDuplicateKeyUpdate({
    set: { isDisabled: true },
  });
}

export async function enableUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(usersExtended).values({ userId, isDisabled: false }).onDuplicateKeyUpdate({
    set: { isDisabled: false },
  });
}

export async function getUserExtended(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(usersExtended).where(eq(usersExtended.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= DASHBOARD STATISTICS =============

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const totalServers = await db.select().from(gameServers);
  const onlineServers = await db.select().from(gameServers).where(eq(gameServers.status, "online" as any));
  const totalUsers = await db.select().from(users);
  const recentLogs = await db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(10);

  return {
    totalServers: totalServers.length,
    onlineServers: onlineServers.length,
    totalUsers: totalUsers.length,
    recentActivity: recentLogs,
  };
}
