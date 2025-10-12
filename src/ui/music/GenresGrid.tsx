import React from "react";
import type { Genre } from "./types";

interface GenresGridProps {
  genres: Genre[];
  onGenreClick?: (genre: Genre) => void;
  loading: boolean;
}

const GenresGrid: React.FC<GenresGridProps> = ({
  genres,
  onGenreClick,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500 dark:text-gray-400">
          Loading genres...
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {genres.map((genre) => (
        <div
          key={genre.id}
          className={`bg-white dark:bg-dark-800 rounded-lg shadow-sm transition-shadow p-4 border border-gray-200 dark:border-dark-600 ${
            onGenreClick ? "hover:shadow-md cursor-pointer" : ""
          }`}
          onClick={() => onGenreClick?.(genre)}
        >
          <h3 className="font-medium text-lg mb-2 text-gray-900 dark:text-gray-100">
            {genre.name}
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>{genre.artistCount} artists</p>
            <p>{genre.albumCount} albums</p>
            <p>{genre.trackCount} tracks</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GenresGrid;
