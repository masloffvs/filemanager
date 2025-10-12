import React from "react";
import { humanDuration } from "../../utils/humansize";
import type { AudioTrack } from "./types";

interface SearchResultsProps {
  searchResults: AudioTrack[];
  onPlayTrack: (track: AudioTrack, trackList: AudioTrack[]) => void;
  loading: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  onPlayTrack,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500 dark:text-gray-400">Searching...</div>
      </div>
    );
  }

  if (searchResults.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Search Results
      </h2>
      <div className="space-y-2">
        {searchResults.map((track) => (
          <div
            key={track.id}
            className="bg-white dark:bg-dark-800 rounded-lg p-3 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer group border border-gray-200 dark:border-dark-600"
            onClick={() => onPlayTrack(track, searchResults)}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {track.coverArt && (
                <img
                  src={track.coverArt}
                  alt={track.album}
                  className="w-10 h-10 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                  {track.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {track.artist} • {track.album}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {track.duration && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {humanDuration(track.duration)}
                </span>
              )}
              <button className="text-blue-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                ▶
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
