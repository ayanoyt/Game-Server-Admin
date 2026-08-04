import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const usersRouter = router({
  // Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    const extended = await db.getUserExtended(ctx.user.id);
    return { ...user, ...extended };
  }),

  // List all users (admin only)
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return db.getAllUsers(input.limit, input.offset);
    }),

  // Get a specific user by ID (admin only)
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const user = await db.getUserById(input.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const extended = await db.getUserExtended(input.id);
      return { ...user, ...extended };
    }),

  // Update user role (admin only)
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["admin", "user"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await db.updateUserRole(input.userId, input.role);

      await db.createActivityLog({
        serverId: 0,
        userId: ctx.user.id,
        action: "edited",
        description: `User ${user.name} role changed to ${input.role}`,
      });

      return { success: true };
    }),

  // Disable a user account (admin only)
  disable: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await db.disableUser(input.userId);

      await db.createActivityLog({
        serverId: 0,
        userId: ctx.user.id,
        action: "edited",
        description: `User ${user.name} account disabled`,
      });

      return { success: true };
    }),

  // Enable a user account (admin only)
  enable: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await db.enableUser(input.userId);

      await db.createActivityLog({
        serverId: 0,
        userId: ctx.user.id,
        action: "edited",
        description: `User ${user.name} account enabled`,
      });

      return { success: true };
    }),

  // Update current user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  // Get user activity logs
  getActivityLogs: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const targetUserId = input.userId || ctx.user.id;

      if (ctx.user.role !== "admin" && targetUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own activity logs" });
      }

      return db.getActivityLogsByUser(targetUserId, input.limit);
    }),

  // Get user sessions (admin only)
  getSessions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getUserSessions(input.userId);
    }),

  // Terminate a user session (admin only)
  terminateSession: adminProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteUserSession(input.sessionId);

      await db.createActivityLog({
        serverId: 0,
        userId: ctx.user.id,
        action: "edited",
        description: `User session ${input.sessionId} terminated`,
      });

      return { success: true };
    }),
});
