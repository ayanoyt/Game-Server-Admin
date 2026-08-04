import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const logsRouter = router({
  // Get all activity logs with pagination
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return db.getActivityLogs(undefined, input.limit, input.offset);
    }),

  // Get activity logs for a specific server
  getByServer: protectedProcedure
    .input(
      z.object({
        serverId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return db.getActivityLogs(input.serverId, input.limit, input.offset);
    }),

  // Get activity logs for a specific user
  getByUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return db.getActivityLogsByUser(input.userId, input.limit);
    }),

  // Get activity logs by action type
  getByAction: protectedProcedure
    .input(
      z.object({
        action: z.enum(["start", "stop", "restart", "config_change", "player_update", "status_change", "created", "deleted", "edited"]),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return db.getActivityLogsByAction(input.action, input.limit);
    }),

  // Export logs as JSON
  exportJSON: adminProcedure
    .input(
      z.object({
        serverId: z.number().optional(),
        limit: z.number().min(1).max(1000).default(500),
      })
    )
    .query(async ({ input }) => {
      const logs = await db.getActivityLogs(input.serverId, input.limit);
      return {
        data: logs,
        exportedAt: new Date(),
        format: "json",
      };
    }),

  // Export logs as CSV
  exportCSV: adminProcedure
    .input(
      z.object({
        serverId: z.number().optional(),
        limit: z.number().min(1).max(1000).default(500),
      })
    )
    .query(async ({ input }) => {
      const logs = await db.getActivityLogs(input.serverId, input.limit);

      // Convert to CSV
      const headers = ["ID", "Server ID", "User ID", "Action", "Description", "Created At"];
      const rows = logs.map((log) => [
        log.id,
        log.serverId,
        log.userId,
        log.action,
        log.description || "",
        log.createdAt.toISOString(),
      ]);

      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

      return {
        data: csv,
        exportedAt: new Date(),
        format: "csv",
        filename: `activity-logs-${new Date().toISOString().split("T")[0]}.csv`,
      };
    }),
});
