import { useState } from "react";
import { Search } from "lucide-react";

interface ProfileSearchBarProps {
  onSearch?: (query: string, type: "artists" | "events" | "rooms") => void;
}

export function ProfileSearchBar({ onSearch }: ProfileSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"artists" | "events" | "rooms">("events");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery, searchType);
  };

  return (
    <div className="w-full bg-[#0B0B0B] border-b border-gray-800 py-4 z-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9A9A9A]" />
            <input
              type="text"
              placeholder={`Search ${searchType}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-20 py-2.5 bg-[#0B0B0B]/90 border border-gray-800 rounded-lg text-white font-body text-sm placeholder-[#9A9A9A] focus:outline-none focus:border-[#CD000E] transition-colors"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as "artists" | "events" | "rooms")}
                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white font-body focus:outline-none focus:border-[#CD000E] cursor-pointer"
              >
                <option value="artists">Artists</option>
                <option value="events">Events</option>
                <option value="rooms">Rooms</option>
              </select>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

