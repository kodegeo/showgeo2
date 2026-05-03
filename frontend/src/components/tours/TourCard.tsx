import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { TourListItem } from "@/services/tours.service";

export interface TourCardProps {
  tour: TourListItem;
}

export function TourCard({ tour }: TourCardProps) {
  return (
    <article className="rounded-xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#CD000E]/50 hover:shadow-lg transition-all duration-300">
      <Link to={`/tours/${tour.slug}`} className="block group">
        <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
          {tour.thumbnail ? (
            <img
              src={tour.thumbnail}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700">
              <MapPin className="w-16 h-16 text-white/80" aria-hidden />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-heading font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#CD000E] transition-colors">
            {tour.name}
          </h3>
          <span className="inline-flex items-center gap-2 mt-2 font-medium text-sm text-gray-600 dark:text-gray-300 group-hover:underline">
            View tour
          </span>
        </div>
      </Link>
    </article>
  );
}
