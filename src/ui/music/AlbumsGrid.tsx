import React from "react";
import { humanDuration } from "../../utils/humansize";
import type { Album } from "./types";

interface AlbumsGridProps {
  albums: Album[];
  onAlbumClick: (album: Album) => void;
  loading: boolean;
}

const AlbumsGrid: React.FC<AlbumsGridProps> = ({
  albums,
  onAlbumClick,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500 dark:text-gray-400">
          Loading albums...
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {albums.map((album) => (
        <div
          key={album.id}
          className="bg-white dark:bg-dark-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-dark-600"
          onClick={() => onAlbumClick(album)}
        >
          {album.coverArt ? (
            <img
              src={album.coverArt}
              alt={album.name}
              className="w-full aspect-square object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full aspect-square bg-gray-300 dark:bg-dark-600 rounded-t-lg flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                No Cover
              </span>
            </div>
          )}
          <div className="p-3">
            <h3 className="font-medium text-sm mb-1 truncate text-gray-900 dark:text-gray-100">
              {album.name}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {album.artist}
            </p>
            {album.year && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {album.year}
              </p>
            )}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500 mt-2">
              <span>{album.trackCount} tracks</span>
              <span>{humanDuration(album.totalDuration)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlbumsGrid;
