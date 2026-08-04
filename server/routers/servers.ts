import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const serversRouter = router({
  // List all game servers with pagination
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const servers = await db.listGameServers(input.limit, input.offset);
      return servers;
    }),

  // Get a specific server by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const server = await db.getGameServerById(input.id);
      if (!server) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
      }
      return server;
    }),

  // Search servers by name, game type, or region
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return db.searchGameServers(input.query, input.limit);
    }),

  // Get servers by status
  getByStatus: protectedProcedure
    .input(
      z.object({
        status: z.enum(["online", "offline", "maintenance", "error"]),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return db.getServersByStatus(input.status, input.limit);
    }),

  // Create a new game server (admin only)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        gameType: z.string().min(1).max(100),
        ipAddress: z.string().min(1),
        port: z.number().int().min(1).max(65535),
        maxPlayers: z.number().int().min(1),
        region: z.string().min(1).max(50),
        description: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.createGameServer({
        ...input,
        createdBy: ctx.user.id,
      });

      // Log the action
      await db.createActivityLog({
        serverId: 0, // Will be updated after server creation
        userId: ctx.user.id,
        action: "created",
        description: `Server ${input.name} created`,
      });

      return { success: true };
    }),

  // Update a game server (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        gameType: z.string().min(1).max(100).optional(),
        ipAddress: z.string().min(1).optional(),
        port: z.number().int().min(1).max(65535).optional(),
        maxPlayers: z.number().int().min(1).optional(),
        region: z.string().min(1).max(50).optional(),
        description: z.string().max(1000).optional(),
        status: z.enum(["online", "offline", "maintenance", "error"]).optional(),
        currentPlayers: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      const server = await db.getGameServerById(id);

      if (!server) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
      }

      await db.updateGameServer(id, updateData);

      // Log the action
      await db.createActivityLog({
        serverId: id,
        userId: ctx.user.id,
        action: "edited",
        description: `Server ${server.name} updated`,
        previousValue: server,
        newValue: { ...server, ...updateData },
      });

      return { success: true };
    }),

  // Delete a game server (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const server = await db.getGameServerById(input.id);

      if (!server) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
      }

      await db.deleteGameServer(input.id);

      // Log the action
      await db.createActivityLog({
        serverId: input.id,
        userId: ctx.user.id,
        action: "deleted",
        description: `Server ${server.name} deleted`,
      });

      return { success: true };
    }),

  // Start a server
  start: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const server = await db.getGameServerById(input.id);

      if (!server) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
      }

      // Simulate starting the server
      await db.updateGameServer(input.id, { status: "online" });

      // Record status history
      await db.recordServerStatus({
        serverId: input.id,
        status: "online",
        playersCount: 0,
      });

      // Log the action
      await db.createActivityLog({
        serverId: input.id,
        userId: ctx.user.id,
        action: "start",
        description: `Server ${server.name} started`,
      });

      return { success: true };
    }),

  // Stop a server
  stop: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const server = await db.getGameServerById(input.id);

      if (!server) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
      }

      // Simulate stopping the server
      await db.updateGameServer(input.id, { status: "offline", currentPlayers: 0 });

      // Record status history
      await db.recordServerStatus({
        serverId: input.id,
        status: "offline",
        playersCount: 0,
      });

      // Log the action
      await db.createActivityLog({
        serverId: input.id,
        userId: ctx.user.id,
        action: "stop",
        description: `Server ${server.name} stopped`,
      });

      return { success: true };
    }),

  // Restart a server
  restart: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const server = await db.getGameServerById(input.id);

      if (!server) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
      }

      // Simulate restarting the server
      await db.updateGameServer(input.id, { status: "maintenance" });

      // Simulate restart delay and come back online
      setTimeout(async () => {
        await db.updateGameServer(input.id, { status: "online" });
        await db.recordServerStatus({
          serverId: input.id,
          status: "online",
          playersCount: 0,
        });
      }, 3000);

      // Record status history
      await db.recordServerStatus({
        serverId: input.id,
        status: "maintenance",
      });

      // Log the action
      await db.createActivityLog({
        serverId: input.id,
        userId: ctx.user.id,
        action: "restart",
        description: `Server ${server.name} restarted`,
      });

      return { success: true };
    }),

  // Get server status history
  getStatusHistory: protectedProcedure
    .input(
      z.object({
        serverId: z.number(),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ input }) => {
      return db.getServerStatusHistory(input.serverId, input.limit);
    }),

  // Get server status history in a date range
  getStatusHistoryRange: protectedProcedure
    .input(
      z.object({
        serverId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return db.getServerStatusHistoryRange(input.serverId, input.startDate, input.endDate);
    }),
});
