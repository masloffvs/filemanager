import React from "react";
import { humanDuration } from "../../utils/humansize";
import type { Artist } from "./types";

interface ArtistsGridProps {
  artists: Artist[];
  onArtistClick?: (artist: Artist) => void;
  loading: boolean;
}

const ArtistsGrid: React.FC<ArtistsGridProps> = ({
  artists,
  onArtistClick,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500 dark:text-gray-400">
          Loading artists...
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {artists.map((artist) => (
        <div
          key={artist.id}
          className={`bg-white dark:bg-dark-800 rounded-lg shadow-sm transition-shadow p-4 border border-gray-200 dark:border-dark-600 ${
            onArtistClick ? "hover:shadow-md cursor-pointer" : ""
          }`}
          onClick={() => onArtistClick?.(artist)}
        >
          <h3 className="font-medium text-lg mb-2 text-gray-900 dark:text-gray-100">
            {artist.name}
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>{artist.albumCount} albums</p>
            <p>{artist.trackCount} tracks</p>
            <p>{humanDuration(artist.totalDuration)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArtistsGrid;
