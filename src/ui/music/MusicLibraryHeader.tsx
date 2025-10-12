import React from "react";
import type { MusicLibraryTab } from "./types";

interface MusicLibraryHeaderProps {
  activeTab: MusicLibraryTab;
  onTabChange: (tab: MusicLibraryTab) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
}

const MusicLibraryHeader: React.FC<MusicLibraryHeaderProps> = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
}) => {
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-dark-400 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Music Library
        </h1>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onSearch}
          disabled={!searchQuery.trim()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm transition-colors"
        >
          Search
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-dark-400">
        {(["albums", "artists", "genres"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-2 font-medium capitalize text-sm transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MusicLibraryHeader;
