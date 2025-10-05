import MediaVideoCard from "@/ui/MediaVideoCard";
import useMedialist, { type MediaEntry } from "../hooks/useMedialist";
import { useState, useMemo } from "react";
import VideoView from "@/ui/VideoView";

// Filter types
type SortBy = "name" | "date" | "size" | "duration";

interface FilterState {
  sortBy: SortBy;
  sortOrder: "asc" | "desc";
  searchQuery: string;
}

export default function MediaPage() {
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const mediaList = useMedialist(limit, offset);

  const [selectedMedia, setSelectedMedia] = useState<MediaEntry | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    sortBy: "date",
    sortOrder: "desc",
    searchQuery: "",
  });

  // Filter and sort video entries only
  const filteredVideos = useMemo(() => {
    let filtered = mediaList.filter((media) => media.videoEntry);

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (media) =>
          media.fullPath.toLowerCase().includes(query) ||
          (media.tags &&
            media.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    }

    // Sort entries
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (filters.sortBy) {
        case "name":
          aValue = a.fullPath.split("/").pop()?.toLowerCase() || "";
          bValue = b.fullPath.split("/").pop()?.toLowerCase() || "";
          break;
        case "size":
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case "duration":
          aValue = a.videoEntry?.duration || 0;
          bValue = b.videoEntry?.duration || 0;
          break;
        case "date":
        default:
          aValue = new Date(a.meta?.lastModified || 0).getTime();
          bValue = new Date(b.meta?.lastModified || 0).getTime();
          break;
      }

      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return filters.sortOrder === "asc" ? result : -result;
    });

    return filtered;
  }, [mediaList, filters]);

  // Pagination logic
  const hasMorePages = mediaList.length === limit;
  const currentPage = Math.floor(offset / limit) + 1;
  const canGoBack = offset > 0;

  const handleNextPage = () => {
    if (hasMorePages) {
      setOffset((prev) => prev + limit);
    }
  };

  const handlePrevPage = () => {
    if (canGoBack) {
      setOffset((prev) => Math.max(0, prev - limit));
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0); // Reset to first page
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {selectedMedia && (
          <VideoView
            media={selectedMedia}
            onClose={() => setSelectedMedia(null)}
          />
        )}

        <div className="p-4">
          {/* Videos Section */}
          {filteredVideos.length > 0 ? (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-5 text-gray-600 dark:text-gray-400"
                  >
                    <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 0 0 1.28-.53V4.75Z" />
                  </svg>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Videos ({filteredVideos.length})
                  </h2>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Page {currentPage}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={handlePrevPage}
                      disabled={!canGoBack}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-dark-500"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={!hasMorePages}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-dark-500"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredVideos.map((media) => (
                  <MediaVideoCard
                    key={media.id}
                    media={media}
                    onClick={setSelectedMedia}
                  />
                ))}
              </div>
            </section>
          ) : (
            <div className="text-center py-12">
              <svg
                className="w-8 h-8 text-gray-400 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                No videos found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compact filter panel */}
      <div className="w-60 flex-shrink-0 p-3">
        <div className="bg-gray-50 dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-500 p-3 space-y-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Controls
          </h3>

          {/* Search */}
          <div>
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              placeholder="Search videos..."
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-dark-400 rounded bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Per page
            </label>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-dark-400 rounded bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Sort by
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as SortBy,
                }))
              }
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-dark-400 rounded bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 mb-2"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="duration">Duration</option>
            </select>

            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, sortOrder: "asc" }))
                }
                className={`px-2 py-1 text-xs rounded ${
                  filters.sortOrder === "asc"
                    ? "bg-gray-200 text-gray-900 dark:bg-dark-500 dark:text-gray-100"
                    : "bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-400"
                }`}
              >
                ↑ Asc
              </button>
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, sortOrder: "desc" }))
                }
                className={`px-2 py-1 text-xs rounded ${
                  filters.sortOrder === "desc"
                    ? "bg-gray-200 text-gray-900 dark:bg-dark-500 dark:text-gray-100"
                    : "bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-400"
                }`}
              >
                ↓ Desc
              </button>
            </div>
          </div>

          {/* Stats & Pagination Info */}
          <div className="pt-2 border-t border-gray-200 dark:border-dark-500 space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Videos:</span>
                <span>{filteredVideos.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Page:</span>
                <span>{currentPage}</span>
              </div>
            </div>

            {hasMorePages && (
              <div className="text-xs text-blue-600 dark:text-blue-400">
                More videos available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
