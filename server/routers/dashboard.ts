import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const dashboardRouter = router({
  // Get dashboard statistics
  getStats: protectedProcedure.query(async () => {
    return db.getDashboardStats();
  }),

  // Get server statistics by status
  getServerStats: protectedProcedure.query(async () => {
    const online = await db.getServersByStatus("online");
    const offline = await db.getServersByStatus("offline");
    const maintenance = await db.getServersByStatus("maintenance");
    const error = await db.getServersByStatus("error");

    return {
      online: online.length,
      offline: offline.length,
      maintenance: maintenance.length,
      error: error.length,
      total: online.length + offline.length + maintenance.length + error.length,
    };
  }),

  // Get recent activity
  getRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      return db.getActivityLogs(undefined, input.limit);
    }),

  // Get player statistics
  getPlayerStats: protectedProcedure.query(async () => {
    const servers = await db.listGameServers(1000);
    const totalPlayers = servers.reduce((sum, server) => sum + (server.currentPlayers || 0), 0);
    const totalCapacity = servers.reduce((sum, server) => sum + server.maxPlayers, 0);
    const utilizationPercentage = totalCapacity > 0 ? (totalPlayers / totalCapacity) * 100 : 0;

    return {
      totalPlayers,
      totalCapacity,
      utilizationPercentage: Math.round(utilizationPercentage),
      serverCount: servers.length,
    };
  }),

  // Get system health
  getSystemHealth: protectedProcedure.query(async () => {
    const stats = await db.getDashboardStats();
    const serverStats = await db.listGameServers(1000);

    const healthScore = {
      totalServers: stats?.totalServers || 0,
      onlineServers: stats?.onlineServers || 0,
      offlineServers: (stats?.totalServers || 0) - (stats?.onlineServers || 0),
      totalUsers: stats?.totalUsers || 0,
      recentActivityCount: stats?.recentActivity?.length || 0,
      averageResponseTime: 0,
      uptime: 99.9,
    };

    return healthScore;
  }),

  // Export dashboard data
  exportDashboardData: adminProcedure.query(async () => {
    const stats = await db.getDashboardStats();
    const serverStats = await db.listGameServers(1000);
    const recentLogs = await db.getActivityLogs(undefined, 100);

    return {
      exportedAt: new Date(),
      stats,
      servers: serverStats,
      recentLogs,
      format: "json",
    };
  }),
});
