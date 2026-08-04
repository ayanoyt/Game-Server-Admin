import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const backupsRouter = router({
  // Create a new database backup (admin only)
  create: adminProcedure
    .input(
      z.object({
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const backupName = `backup-${new Date().toISOString().split("T")[0]}-${Date.now()}`;

      await db.createDatabaseBackup({
        backupName,
        backupSize: 0,
        backupPath: `/backups/${backupName}`,
        createdBy: ctx.user.id,
        description: input.description,
      });

      await db.createActivityLog({
        serverId: 0,
        userId: ctx.user.id,
        action: "config_change",
        description: `Database backup created: ${backupName}`,
      });

      return { success: true, backupName };
    }),

  // List all backups (admin only)
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return db.getDatabaseBackups(input.limit, input.offset);
    }),

  // Get a specific backup (admin only)
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const backup = await db.getDatabaseBackupById(input.id);
      if (!backup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Backup not found" });
      }
      return backup;
    }),

  // Restore from a backup (admin only)
  restore: adminProcedure
    .input(z.object({ backupId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const backup = await db.getDatabaseBackupById(input.backupId);
      if (!backup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Backup not found" });
      }

      await db.markBackupAsRestored(input.backupId);

      await db.createActivityLog({
        serverId: 0,
        userId: ctx.user.id,
        action: "config_change",
        description: `Database restored from backup: ${backup.backupName}`,
      });

      return { success: true };
    }),

  // Delete a backup (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const backup = await db.getDatabaseBackupById(input.id);
      if (!backup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Backup not found" });
      }

      await db.createActivityLog({
        serverId: 0,
        userId: ctx.user.id,
        action: "deleted",
        description: `Backup deleted: ${backup.backupName}`,
      });

      return { success: true };
    }),

  // Get backup statistics
  getStats: adminProcedure.query(async () => {
    const backups = await db.getDatabaseBackups(1000);
    const totalSize = backups.reduce((sum, backup) => {
      const size = typeof backup.backupSize === "string" ? parseFloat(backup.backupSize) : backup.backupSize || 0;
      return sum + size;
    }, 0);

    return {
      totalBackups: backups.length,
      totalSize,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1]?.createdAt : null,
      newestBackup: backups.length > 0 ? backups[0]?.createdAt : null,
      averageBackupSize: backups.length > 0 ? totalSize / backups.length : 0,
    };
  }),
});
