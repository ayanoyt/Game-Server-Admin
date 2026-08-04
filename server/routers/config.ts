import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const configRouter = router({
  // Get server configuration
  getServerConfig: protectedProcedure
    .input(z.object({ serverId: z.number() }))
    .query(async ({ input }) => {
      return db.getServerConfigs(input.serverId);
    }),

  // Set server configuration (admin only)
  setServerConfig: adminProcedure
    .input(
      z.object({
        serverId: z.number(),
        key: z.string().min(1).max(255),
        value: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const server = await db.getGameServerById(input.serverId);
      if (!server) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
      }

      await db.setServerConfig(input.serverId, input.key, input.value, input.description);

      await db.createActivityLog({
        serverId: input.serverId,
        userId: ctx.user.id,
        action: "config_change",
        description: `Configuration ${input.key} updated`,
        newValue: { key: input.key, value: input.value },
      });

      return { success: true };
    }),

  // Get all system configurations (admin only)
  getSystemConfig: adminProcedure.query(async () => {
    return {
      maxBackupRetention: 30,
      autoBackupEnabled: true,
      backupFrequency: "daily",
      maintenanceWindow: "02:00-03:00",
      maxConcurrentServers: 100,
      sessionTimeout: 3600,
      logRetentionDays: 90,
    };
  }),

  // Update system configuration (admin only)
  updateSystemConfig: adminProcedure
    .input(
      z.object({
        maxBackupRetention: z.number().optional(),
        autoBackupEnabled: z.boolean().optional(),
        backupFrequency: z.string().optional(),
        maintenanceWindow: z.string().optional(),
        maxConcurrentServers: z.number().optional(),
        sessionTimeout: z.number().optional(),
        logRetentionDays: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.createActivityLog({
        serverId: 0,
        userId: ctx.user.id,
        action: "config_change",
        description: "System configuration updated",
        newValue: input,
      });

      return { success: true };
    }),
});
