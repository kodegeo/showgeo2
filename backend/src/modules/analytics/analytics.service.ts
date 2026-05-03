import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { EntityMetricsDto, EventPerformanceDto, EventAnalyticsDto, UserEngagementDto, PlatformOverviewDto, RecommendationsResponseDto, RecommendationDto } from "./dto";
import { AnalyticsSummaryType, Prisma } from "@prisma/client";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Scheduled job to update analytics daily at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleAnalyticsUpdate() {
    console.log("Running scheduled analytics update...");
    await this.updateAnalytics();
  }

  async aggregateMetrics(entityId: string): Promise<EntityMetricsDto> {
    // Validate entity exists
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    const entityEventIds = await (this.prisma as any).events
      .findMany({ where: { entityId }, select: { id: true } })
      .then((rows: { id: string }[]) => rows.map((r) => r.id));

    // Aggregate metrics from multiple modules
    const [
      eventsCount,
      followersCount,
      storeSales,
      storeRevenue,
      averageViewers,
      notificationsSent,
      ticketsSold,
      ticketRevenue,
      totalRegistrations,
      topEventsRaw,
      ordersForRevenue,
    ] = await Promise.all([
      (this.prisma as any).events.count({ where: { entityId } }),
      (this.prisma as any).follows.count({
        where: { target_id: entityId, target_type: "ENTITY" },
      }),
      (this.prisma as any).products.count({
        where: {
          stores: { entityId, status: "ACTIVE" },
          isAvailable: true,
        },
      }),
      (this.prisma as any).products
        .aggregate({
          where: {
            stores: { entityId, status: "ACTIVE" },
            isAvailable: true,
          },
          _sum: { price: true },
        })
        .then((r: { _sum: { price: number | null } }) => Number(r._sum?.price ?? 0)),
      (this.prisma as any).streaming_sessions
        .aggregate({
          where: { entityId, active: false },
          _avg: { viewers: true },
        })
        .then((r: { _avg: { viewers: number | null } }) => Math.round(r._avg?.viewers ?? 0)),
      (this.prisma as any).notifications.count({ where: { entityId } }),
      (this.prisma as any).tickets.count({
        where: { events: { entityId } },
      }),
      entityEventIds.length > 0
        ? (this.prisma as any).order_items
            .aggregate({
              where: { orders: { eventId: { in: entityEventIds } } },
              _sum: { totalPrice: true },
            })
            .then((r: { _sum: { totalPrice: unknown } }) => Number(r._sum?.totalPrice ?? 0))
        : 0,
      entityEventIds.length > 0
        ? (this.prisma as any).event_registrations.count({
            where: { eventId: { in: entityEventIds }, status: "REGISTERED" },
          })
        : 0,
      (this.prisma as any).events.findMany({
        where: { entityId },
        select: {
          id: true,
          name: true,
          _count: { select: { tickets: true } },
        },
        take: 20,
      }).then((rows: Array<{ id: string; name: string; _count: { tickets: number } }>) =>
        rows.sort((a, b) => (b._count?.tickets ?? 0) - (a._count?.tickets ?? 0)).slice(0, 5),
      ),
      entityEventIds.length > 0
        ? (this.prisma as any).orders.findMany({
            where: { eventId: { in: entityEventIds } },
            select: { eventId: true, order_items: { select: { totalPrice: true } } },
          })
        : [],
    ]);

    const revenueByEventId = new Map<string, number>();
    for (const o of ordersForRevenue as Array<{ eventId: string | null; order_items: Array<{ totalPrice: unknown }> }>) {
      if (!o.eventId) continue;
      const sum = (o.order_items || []).reduce((s: number, i) => s + Number(i.totalPrice ?? 0), 0);
      revenueByEventId.set(o.eventId, (revenueByEventId.get(o.eventId) ?? 0) + sum);
    }
    const topPerformingEvents = (topEventsRaw as Array<{ id: string; name: string; _count: { tickets: number } }>).map(
      (e) => ({
        eventId: e.id,
        name: e.name,
        ticketSales: e._count?.tickets ?? 0,
        revenue: revenueByEventId.get(e.id) ?? 0,
      }),
    );

    // Calculate engagement score (weighted formula)
    const engagementScore = this.calculateEngagementScore({
      eventsCount,
      followersCount,
      storeSales,
      averageViewers,
      notificationsSent,
      ticketsSold,
    });

    // Store or update analytics summary
    await this.upsertAnalyticsSummary({
      entityId,
      type: AnalyticsSummaryType.ENTITY,
      metrics: {
        eventsCount,
        activeFollowers: followersCount,
        storeSales,
        storeRevenue,
        averageViewers,
        notificationsSent,
        ticketsSold,
        ticketRevenue,
        totalRegistrations,
      },
      engagementScore,
    });

    return {
      eventsCount,
      activeFollowers: followersCount,
      storeSales,
      storeRevenue,
      averageViewers,
      notificationsSent,
      engagementScore,
      totalTicketsSold: ticketsSold,
      totalTicketRevenue: ticketRevenue,
      totalRegistrations,
      topPerformingEvents,
    };
  }

  async getEventAnalytics(eventId: string): Promise<EventAnalyticsDto> {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Attendance: event_registrations (REGISTERED) is canonical; tickets are derived access artifacts
    // order_items has no relation to orders in Prisma client; filter by orderId from orders for this event
    const orderIds = await this.prisma.orders.findMany({
      where: { eventId },
      select: { id: true },
    }).then((rows) => rows.map((r) => r.id));

    const [attendanceCount, ticketCount, revenueResult, sessions] = await Promise.all([
      (this.prisma as any).event_registrations.count({
        where: { eventId, status: "REGISTERED" },
      }),
      this.prisma.tickets.count({ where: { eventId } }),
      orderIds.length > 0
        ? this.prisma.order_items.aggregate({
            where: { orderId: { in: orderIds } },
            _sum: { totalPrice: true },
          })
        : Promise.resolve({ _sum: { totalPrice: null } }),
      this.prisma.streaming_sessions.findMany({
        where: { eventId },
        select: { viewers: true },
      }),
    ]);

    const revenue = Number(revenueResult._sum.totalPrice ?? 0);
    const viewers = sessions.length > 0 ? Math.max(...sessions.map((s) => s.viewers)) : 0;

    return {
      ticketSales: ticketCount,
      revenue,
      registrations: attendanceCount,
      viewers,
    };
  }

  async getEventPerformance(eventId: string): Promise<EventPerformanceDto> {
    // Validate event exists; events has no streaming_sessions relation in Prisma client, fetch separately
    const [event, sessions] = await Promise.all([
      (this.prisma as any).events.findUnique({
        where: { id: eventId },
        include: { tickets: true },
      }),
      this.prisma.streaming_sessions.findMany({
        where: { eventId },
      }),
    ]);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Get streaming metrics
    const activeSession = sessions.find((s) => s.active);

    const totalViewers = sessions.reduce((sum, s) => sum + s.viewers, 0);
    const averageViewers = sessions.length > 0 ? totalViewers / sessions.length : 0;
    const peakViewers = Math.max(...sessions.map((s) => s.viewers), 0);

    // Extract metrics from streaming sessions
    let messages = 0;
    let reactions = 0;
    let participants = 0;

    sessions.forEach((session) => {
      const metrics = (session.metrics as any) || {};
      messages += metrics.messages || 0;
      reactions += metrics.reactions || 0;
      participants += metrics.participants || 0;
    });

    // Calculate duration
    const totalDuration = sessions.reduce((sum, s) => {
      if (s.endTime) {
        return sum + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000);
      }
      return sum;
    }, 0);

    const avgDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

    // Ticket metrics
    const ticketsSold = event.tickets?.length || 0;
    // TODO: Calculate ticket revenue from orders

    // Get trend data (daily aggregations for last 7 days)
    const trend = await this.getEventTrend(eventId, 7);

    return {
      viewers: Math.round(averageViewers),
      participants: Math.round(participants),
      messages,
      reactions,
      ticketsSold,
      ticketRevenue: 0, // TODO: Calculate from orders
      duration: Math.round(avgDuration),
      peakViewers,
      trend,
    };
  }

  async getUserEngagement(userId: string): Promise<UserEngagementDto> {
    // Validate user exists
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Aggregate user engagement metrics
    const [
      eventsAttended,
      streamsWatched,
      productsPurchased,
      entitiesFollowed,
      totalSpent,
    ] = await Promise.all([
      // Events attended (has ticket)
      (this.prisma as any).tickets.count({
        where: { userId },
      }),

      // Streams watched (participated in streaming session)
      (this.prisma as any).streaming_sessions.count({
        where: {
          events: {
            tickets: {
              some: {
                userId,
              },
            },
          },
        },
      }),

      // Products purchased (placeholder - needs Order model)
      0, // TODO: Count from orders

      // Entities followed (follows: user_id = userId, target_type = ENTITY)
      (this.prisma as any).follows.count({
        where: { user_id: userId, target_type: "ENTITY" },
      }),

      // Total spent (placeholder - needs Order model)
      0, // TODO: Sum from orders
    ]);

    // Get favorite categories (from followed entities)
    const followedEntities = await (this.prisma as any).follows.findMany({
      where: { user_id: userId, target_type: "ENTITY" },
      include: {
        entities: {
          select: {
            type: true,
          },
        },
      },
    });

    const categoryCounts: Record<string, number> = {};
    followedEntities.forEach((follow) => {
      const category = follow.entities.type || "UNKNOWN";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const favoriteCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    // Get most engaged entities (by notifications received)
      const entityNotifications = await (this.prisma as any).notifications.groupBy({
      by: ["entityId"],
      where: {
        userId,
        entityId: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    const mostEngagedEntities = await Promise.all(
      entityNotifications.map(async (notif) => {
        if (!notif.entityId) return null;

        const entity = await (this.prisma as any).entities.findUnique({
          where: { id: notif.entityId },
          select: {
            id: true,
            name: true,
          },
        });

        if (!entity) return null;

        return {
          entityId: entity.id,
          entityName: entity.name,
          interactions: notif._count.id,
        };
      }),
    );

    const filteredEntities = mostEngagedEntities.filter((e) => e !== null) as {
      entityId: string;
      entityName: string;
      interactions: number;
    }[];

    // Calculate engagement score
    const engagementScore = this.calculateUserEngagementScore({
      eventsAttended,
      streamsWatched,
      productsPurchased,
      entitiesFollowed,
    });

    return {
      eventsAttended,
      streamsWatched,
      productsPurchased,
      entitiesFollowed,
      totalSpent,
      engagementScore,
      favoriteCategories,
      mostEngagedEntities: filteredEntities,
    };
  }

  async getPlatformOverview(): Promise<PlatformOverviewDto> {
    const [
      totalUsers,
      totalEntities,
      totalEvents,
      activeSessions,
      topEntities,
      recentActivity,
    ] = await Promise.all([
      (this.prisma as any).app_users.count(),
      (this.prisma as any).entities.count(),
      (this.prisma as any).events.count(),
      (this.prisma as any).streaming_sessions.count({
        where: { active: true },
      }),
      this.getTopPerformingEntities(10),
      this.getRecentActivity(),
    ]);

    // Calculate total revenue (placeholder)
    const totalRevenue = 0; // TODO: Sum from orders

    return {
      totalUsers,
      totalEntities,
      totalEvents,
      activeSessions,
      totalRevenue,
      topPerformingEntities: topEntities,
      recentActivity,
    };
  }

  async getRecommendations(userId: string): Promise<RecommendationsResponseDto> {
    // Get user interaction vector
    const userVector = await this.getUserInteractionVector(userId);

    // Get all entities with their interaction vectors
    const entities = await (this.prisma as any).entities.findMany({
      where: {
        isPublic: true,
      },
      include: {
        events: {
          select: {
            id: true,
          },
        },
        followers: {
          select: {
            userId: true,
          },
        },
      },
    });

    // Calculate cosine similarity for each entity
    const entityScores: Array<{
      entity: any;
      score: number;
      reasons: string[];
    }> = [];

    for (const entity of entities) {
      // Skip if user already follows
      const isFollowing = entity.followers.some((f) => f.userId === userId);
      if (isFollowing) continue;

      const entityVector = await this.getEntityInteractionVector(entity.id);

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(userVector, entityVector);

      if (similarity > 0.1) {
        // Only recommend if similarity > 0.1
        const reasons = this.generateRecommendationReasons(userVector, entityVector);

        entityScores.push({
          entity,
          score: similarity,
          reasons,
        });
      }
    }

    // Sort by score and take top recommendations
    entityScores.sort((a, b) => b.score - a.score);
    const topEntities = entityScores.slice(0, 10).map((item) => ({
      entityId: item.entity.id,
      entityName: item.entity.name,
      entitySlug: item.entity.slug,
      entityType: item.entity.type,
      score: item.score,
      reasons: item.reasons,
      thumbnail: item.entity.thumbnail || undefined,
    }));

    // Get recommended events (from recommended entities)
    const recommendedEventIds = new Set(
      topEntities.map((e) => e.entityId),
    );

    const events = await (this.prisma as any).events.findMany({
      where: {
        entityId: { in: Array.from(recommendedEventIds) },
        status: { in: ["SCHEDULED", "LIVE"] },
      },
      include: {
        entity: {
          select: {
            name: true,
            slug: true,
            thumbnail: true,
            type: true,
          },
        },
      },
      take: 10,
      orderBy: { startTime: "asc" },
    });

    const recommendedEvents = events.map((event) => ({
      entityId: event.entityId,
      entityName: event.entity?.name || "Unknown",
      entitySlug: event.entity?.slug || "",
      entityType: event.entity?.type || "ENTITY",
      score: 0.8, // Base score for upcoming events
      reasons: [`Upcoming event: ${event.name}`, `From ${event.entity?.name || "Unknown"}`],
      thumbnail: event.thumbnail || event.entity?.thumbnail || undefined,
    }));

    return {
      entities: topEntities,
      events: recommendedEvents,
    };
  }

  async updateAnalytics(): Promise<void> {
    // This is called by scheduler to update all analytics summaries
    console.log("Updating analytics summaries...");

    // Update entity analytics
    const entities = await (this.prisma as any).entities.findMany({
      select: { id: true },
    });

    for (const entity of entities) {
      await this.aggregateMetrics(entity.id);
    }

    // Update event analytics
    const events = await (this.prisma as any).events.findMany({
      select: { id: true },
    });

    for (const event of events) {
      await this.getEventPerformance(event.id);
    }

    // Update user analytics
    const users = await (this.prisma as any).app_users.findMany({
      select: { id: true },
    });

    for (const user of users) {
      await this.getUserEngagement(user.id);
    }

    console.log("Analytics summaries updated");
  }

  // Helper methods

  private async upsertAnalyticsSummary(data: {
    entityId?: string;
    eventId?: string;
    userId?: string;
    type: AnalyticsSummaryType;
    metrics: any;
    engagementScore?: number;
  }) {
    const where: any = { type: data.type };
    if (data.entityId) where.entityId = data.entityId;
    if (data.eventId) where.eventId = data.eventId;
    if (data.userId) where.userId = data.userId;

    await (this.prisma as any).analytics_summaries.upsert({
      where: where as any,
      update: {
        metrics: data.metrics as Prisma.InputJsonValue,
        engagementScore: data.engagementScore,
      },
      create: {
        ...data,
        metrics: data.metrics as Prisma.InputJsonValue,
      },
    });
  }

  private calculateEngagementScore(metrics: {
    eventsCount: number;
    followersCount: number;
    storeSales: number;
    averageViewers: number;
    notificationsSent: number;
    ticketsSold: number;
  }): number {
    // Weighted formula for engagement score (0-100)
    const weights = {
      events: 20,
      followers: 25,
      sales: 15,
      viewers: 20,
      notifications: 10,
      tickets: 10,
    };

    const scores = {
      events: Math.min(metrics.eventsCount * 5, 100),
      followers: Math.min(metrics.followersCount * 2, 100),
      sales: Math.min(metrics.storeSales * 10, 100),
      viewers: Math.min(metrics.averageViewers / 10, 100),
      notifications: Math.min(metrics.notificationsSent / 10, 100),
      tickets: Math.min(metrics.ticketsSold * 5, 100),
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedScore =
      (scores.events * weights.events +
        scores.followers * weights.followers +
        scores.sales * weights.sales +
        scores.viewers * weights.viewers +
        scores.notifications * weights.notifications +
        scores.tickets * weights.tickets) /
      totalWeight;

    return Math.round(weightedScore * 100) / 100;
  }

  private calculateUserEngagementScore(metrics: {
    eventsAttended: number;
    streamsWatched: number;
    productsPurchased: number;
    entitiesFollowed: number;
  }): number {
    const weights = {
      events: 30,
      streams: 25,
      purchases: 25,
      follows: 20,
    };

    const scores = {
      events: Math.min(metrics.eventsAttended * 10, 100),
      streams: Math.min(metrics.streamsWatched * 15, 100),
      purchases: Math.min(metrics.productsPurchased * 20, 100),
      follows: Math.min(metrics.entitiesFollowed * 5, 100),
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedScore =
      (scores.events * weights.events +
        scores.streams * weights.streams +
        scores.purchases * weights.purchases +
        scores.follows * weights.follows) /
      totalWeight;

    return Math.round(weightedScore * 100) / 100;
  }

  private async getEventTrend(eventId: string, days: number): Promise<
    Array<{
      date: string;
      viewers: number;
      messages: number;
      reactions: number;
    }>
  > {
    // Get streaming sessions for this event in the last N days
    const sessions = await (this.prisma as any).streaming_sessions.findMany({
      where: {
        eventId,
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const trendMap: Record<
      string,
      { viewers: number; messages: number; reactions: number; count: number }
    > = {};

    sessions.forEach((session) => {
      const date = session.createdAt.toISOString().split("T")[0];
      if (!trendMap[date]) {
        trendMap[date] = { viewers: 0, messages: 0, reactions: 0, count: 0 };
      }

      const metrics = (session.metrics as any) || {};
      trendMap[date].viewers += session.viewers;
      trendMap[date].messages += metrics.messages || 0;
      trendMap[date].reactions += metrics.reactions || 0;
      trendMap[date].count += 1;
    });

    // Convert to array and average
    return Object.entries(trendMap).map(([date, data]) => ({
      date,
      viewers: Math.round(data.viewers / data.count),
      messages: Math.round(data.messages / data.count),
      reactions: Math.round(data.reactions / data.count),
    }));
  }

  private async getTopPerformingEntities(limit: number): Promise<
    Array<{
      entityId: string;
      entityName: string;
      engagementScore: number;
      followers: number;
      events: number;
      revenue: number;
    }>
  > {
    const summaries = await (this.prisma as any).analytics_summaries.findMany({
      where: {
        type: AnalyticsSummaryType.ENTITY,
      },
      include: {
        entities: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        engagementScore: "desc",
      },
      take: limit,
    });

    return summaries
      .filter((s) => s.entities)
      .map((summary) => {
        const metrics = (summary.metrics as any) || {};
        return {
          entityId: summary.entityId!,
          entityName: summary.entities?.name || "Unknown",
          engagementScore: summary.engagementScore || 0,
          followers: metrics.activeFollowers || 0,
          events: metrics.eventsCount || 0,
          revenue: metrics.storeRevenue || 0,
        };
      });
  }

  private async getRecentActivity(): Promise<{
    newUsers: number;
    newEvents: number;
    newProducts: number;
    streamingHours: number;
  }> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [newUsers, newEvents, newProducts, sessions] = await Promise.all([
      (this.prisma as any).app_users.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
      (this.prisma as any).events.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
      (this.prisma as any).products.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
      (this.prisma as any).streaming_sessions.findMany({
        where: {
          createdAt: { gte: last24Hours },
          active: false,
        },
      }),
    ]);

    const streamingHours = sessions.reduce((hours, session) => {
      if (session.endTime) {
        const duration = (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
        return hours + duration;
      }
      return hours;
    }, 0);

    return {
      newUsers,
      newEvents,
      newProducts,
      streamingHours: Math.round(streamingHours * 100) / 100,
    };
  }

  private async getUserInteractionVector(userId: string): Promise<number[]> {
    // Build interaction vector: [follows_count, events_attended, streams_watched, products_purchased, notifications_received]
    const [follows, events, streams, purchases, notifications] = await Promise.all([
      (this.prisma as any).follows.count({ where: { user_id: userId, target_type: "ENTITY" } }),
      (this.prisma as any).tickets.count({ where: { userId } }),
      (this.prisma as any).streaming_sessions.count({
        where: {
          events: {
            tickets: {
              some: { userId },
            },
          },
        },
      }),
      0, // TODO: Count from orders
      (this.prisma as any).notifications.count({ where: { userId } }),
    ]);

    // Normalize values (simple min-max normalization)
    const maxValues = [100, 50, 30, 20, 200]; // Estimated max values
    return [
      Math.min(follows / maxValues[0], 1),
      Math.min(events / maxValues[1], 1),
      Math.min(streams / maxValues[2], 1),
      Math.min(purchases / maxValues[3], 1),
      Math.min(notifications / maxValues[4], 1),
    ];
  }

  private async getEntityInteractionVector(entityId: string): Promise<number[]> {
    // Build entity interaction vector: [followers, events, products, avg_viewers, notifications_sent]
    const [followers, events, products, avgViewers, notifications] = await Promise.all([
      (this.prisma as any).follows.count({ where: { target_id: entityId, target_type: "ENTITY" } }),
      (this.prisma as any).events.count({ where: { entityId } }),
      (this.prisma as any).products.count({
        where: {
          stores: { entityId },
        },
      }),
      (this.prisma as any).streaming_sessions.aggregate({
        where: { entityId },
        _avg: { viewers: true },
      }).then((r) => Math.round(r._avg.viewers || 0)),
      (this.prisma as any).notifications.count({ where: { entityId } }),
    ]);

    // Normalize values
    const maxValues = [1000, 100, 500, 10000, 500];
    return [
      Math.min(followers / maxValues[0], 1),
      Math.min(events / maxValues[1], 1),
      Math.min(products / maxValues[2], 1),
      Math.min(avgViewers / maxValues[3], 1),
      Math.min(notifications / maxValues[4], 1),
    ];
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private generateRecommendationReasons(
    userVector: number[],
    entityVector: number[],
  ): string[] {
    const reasons: string[] = [];
    const labels = ["follows", "events", "streams", "purchases", "notifications"];

    for (let i = 0; i < Math.min(userVector.length, entityVector.length); i++) {
      if (userVector[i] > 0 && entityVector[i] > 0.3) {
        reasons.push(`Matches your ${labels[i]} preferences`);
      }
    }

    if (reasons.length === 0) {
      reasons.push("Similar to your interests");
    }

    return reasons;
  }

  async validateEntityAccess(entityId: string, userId: string): Promise<void> {
    // Check if user owns the entity
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        entity_roles: {
          where: {
            userId,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    // Check if user is owner
    if (entity.ownerId === userId) {
      return;
    }

    // Check if user is a manager with ADMIN or MANAGER role
    const entityRole = (entity.entity_roles || []).find((r: { userId: string; role: string }) => r.userId === userId);
    if (entityRole && (entityRole.role === "ADMIN" || entityRole.role === "MANAGER")) {
      return;
    }

    throw new ForbiddenException("You do not have permission to view analytics for this entity");
  }
}

