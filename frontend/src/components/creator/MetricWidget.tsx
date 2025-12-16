import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    period: string;
  };
  onClick?: () => void;
  className?: string;
}

export function MetricWidget({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "#CD000E",
  trend,
  onClick,
  className = "",
}: MetricWidgetProps) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendColor =
    trend?.direction === "up"
      ? "text-green-400"
      : trend?.direction === "down"
        ? "text-red-400"
        : "text-[#9A9A9A]";

  return (
    <div
      onClick={onClick}
      className={`
        bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6
        hover:border-[#CD000E]/50 transition-all duration-300 hover:shadow-[#CD000E]/10
        ${onClick ? "cursor-pointer" : ""}
        group
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        {Icon && (
          <div
            className="p-2 rounded-lg group-hover:scale-110 transition-transform"
            style={{ backgroundColor: `${iconColor}10` }}
          >
            <Icon className="w-6 h-6" style={{ color: iconColor }} />
          </div>
        )}
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-heading font-semibold ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{trend.value.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="mb-2">
        <div className="text-2xl md:text-3xl font-heading font-bold text-white group-hover:text-[#CD000E] transition-colors">
          {value}
        </div>
        <h3 className="text-sm font-heading font-semibold text-white uppercase tracking-tight mt-2">
          {title}
        </h3>
      </div>

      {subtitle && (
        <p className="text-xs text-[#9A9A9A] font-body mt-1">{subtitle}</p>
      )}

      {trend && (
        <p className="text-xs text-[#9A9A9A] font-body mt-2">{trend.period}</p>
      )}
    </div>
  );
}

