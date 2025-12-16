// Skeleton component for loading states in creator dashboard
export function CreatorDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Filter Controls Skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-48 bg-gray-800 rounded-lg" />
        <div className="h-10 w-32 bg-gray-800 rounded-lg" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-gray-800 rounded-lg" />
              <div className="w-16 h-8 bg-gray-800 rounded" />
            </div>
            <div className="w-24 h-4 bg-gray-800 rounded mb-1" />
            <div className="w-32 h-3 bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      {/* Events Section Skeleton */}
      <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="w-32 h-6 bg-gray-800 rounded" />
          <div className="w-20 h-4 bg-gray-800 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border border-gray-800 rounded-lg">
              <div className="w-3/4 h-5 bg-gray-800 rounded mb-2" />
              <div className="w-full h-4 bg-gray-800 rounded mb-3" />
              <div className="flex gap-2">
                <div className="w-20 h-4 bg-gray-800 rounded" />
                <div className="w-24 h-4 bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

