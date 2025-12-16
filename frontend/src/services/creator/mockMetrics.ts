/**
 * Mock data functions for Creator Dashboard metrics
 * These will be replaced with real API calls when backend endpoints are ready
 */

export interface MetricWidget {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    period: string;
  };
  icon?: string;
  color?: string;
}

export interface DashboardMetrics {
  overview: {
    totalEvents: number;
    totalRevenue: number;
    averageViewers: number;
    activeFollowers: number;
    storeSales: number;
    engagementScore: number;
    totalStreams: number;
    totalPosts: number;
  };
  events: {
    upcoming: number;
    live: number;
    completed: number;
    totalViews: number;
    totalRevenue: number;
  };
  store: {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
    conversionRate: number;
  };
  engagement: {
    followers: number;
    following: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  };
  streaming: {
    totalSessions: number;
    totalWatchTime: number;
    averageViewers: number;
    peakViewers: number;
    totalRevenue: number;
  };
  timeRange: "all" | "week" | "month" | "quarter" | "year";
}

/**
 * Generate mock metrics data based on entity and time range
 */
export function generateMockMetrics(
  entityId: string,
  timeRange: "all" | "week" | "month" | "quarter" | "year" = "all",
): DashboardMetrics {
  // Base values that vary by time range
  const timeMultipliers = {
    all: 1,
    week: 0.1,
    month: 0.3,
    quarter: 0.6,
    year: 0.8,
  };

  const multiplier = timeMultipliers[timeRange];

  // Generate realistic-looking mock data
  const baseEvents = Math.floor(15 * multiplier);
  const baseRevenue = Math.floor(12500 * multiplier);
  const baseViewers = Math.floor(850 * multiplier);
  const baseFollowers = Math.floor(2500 * multiplier);

  return {
    overview: {
      totalEvents: baseEvents,
      totalRevenue: baseRevenue,
      averageViewers: baseViewers,
      activeFollowers: baseFollowers,
      storeSales: Math.floor(baseRevenue * 0.4),
      engagementScore: Math.floor(75 + Math.random() * 20),
      totalStreams: Math.floor(baseEvents * 0.6),
      totalPosts: Math.floor(45 * multiplier),
    },
    events: {
      upcoming: Math.floor(baseEvents * 0.3),
      live: Math.floor(baseEvents * 0.1),
      completed: Math.floor(baseEvents * 0.6),
      totalViews: Math.floor(baseViewers * baseEvents * 1.2),
      totalRevenue: baseRevenue,
    },
    store: {
      totalProducts: Math.floor(12 * multiplier),
      activeProducts: Math.floor(8 * multiplier),
      totalOrders: Math.floor(150 * multiplier),
      totalRevenue: Math.floor(baseRevenue * 0.4),
      conversionRate: 3.2 + Math.random() * 2,
    },
    engagement: {
      followers: baseFollowers,
      following: Math.floor(baseFollowers * 0.3),
      likes: Math.floor(1250 * multiplier),
      comments: Math.floor(320 * multiplier),
      shares: Math.floor(180 * multiplier),
      engagementRate: 4.5 + Math.random() * 2,
    },
    streaming: {
      totalSessions: Math.floor(baseEvents * 0.6),
      totalWatchTime: Math.floor(1250 * multiplier), // in hours
      averageViewers: baseViewers,
      peakViewers: Math.floor(baseViewers * 1.8),
      totalRevenue: Math.floor(baseRevenue * 0.6),
    },
    timeRange,
  };
}

/**
 * Generate trend data for metrics
 */
export function generateTrend(
  current: number,
  previous: number,
  period: string = "vs last period",
): { value: number; direction: "up" | "down" | "neutral"; period: string } {
  const change = current - previous;
  const percentChange = previous > 0 ? (change / previous) * 100 : 0;

  return {
    value: Math.abs(percentChange),
    direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
    period,
  };
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}






