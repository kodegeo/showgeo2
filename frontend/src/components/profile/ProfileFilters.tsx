import { useState } from "react";
import { Calendar } from "lucide-react";

interface ProfileFiltersProps {
  onFilterChange?: (filter: "all" | "free" | "paid") => void;
  onTimeRangeChange?: (range: "all" | "week" | "month" | "quarter" | "year") => void;
  defaultFilter?: "all" | "free" | "paid";
  defaultTimeRange?: "all" | "week" | "month" | "quarter" | "year";
}

export function ProfileFilters({
  onFilterChange,
  onTimeRangeChange,
  defaultFilter = "all",
  defaultTimeRange = "all",
}: ProfileFiltersProps) {
  const [filter, setFilter] = useState<"all" | "free" | "paid">(defaultFilter);
  const [timeRange, setTimeRange] = useState<"all" | "week" | "month" | "quarter" | "year">(
    defaultTimeRange
  );

  const handleFilterClick = (newFilter: "all" | "free" | "paid") => {
    setFilter(newFilter);
    onFilterChange?.(newFilter);
  };

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRange = e.target.value as "all" | "week" | "month" | "quarter" | "year";
    setTimeRange(newRange);
    onTimeRangeChange?.(newRange);
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
      <div className="flex items-center gap-4">
        {/* Free/Paid Toggle */}
        <div className="flex items-center gap-2 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg p-1">
          <button
            onClick={() => handleFilterClick("all")}
            className={`px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-all duration-300 ${
              filter === "all"
                ? "bg-[#CD000E] text-white shadow-lg shadow-[#CD000E]/20"
                : "bg-transparent text-[#9A9A9A] hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleFilterClick("free")}
            className={`px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-all duration-300 ${
              filter === "free"
                ? "bg-[#CD000E] text-white shadow-lg shadow-[#CD000E]/20"
                : "bg-transparent text-[#9A9A9A] hover:text-white"
            }`}
          >
            Free
          </button>
          <button
            onClick={() => handleFilterClick("paid")}
            className={`px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-all duration-300 ${
              filter === "paid"
                ? "bg-[#CD000E] text-white shadow-lg shadow-[#CD000E]/20"
                : "bg-transparent text-[#9A9A9A] hover:text-white"
            }`}
          >
            Paid
          </button>
        </div>

        {/* Time Range Dropdown */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9A9A9A] pointer-events-none" />
          <select
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="pl-10 pr-4 py-2 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg text-white font-body text-sm focus:outline-none focus:border-[#CD000E] transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>
    </div>
  );
}




