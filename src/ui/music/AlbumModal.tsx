import React from "react";
import { humanDuration } from "../../utils/humansize";
import type { Album, AudioTrack } from "./types";

interface AlbumModalProps {
  album: Album | null;
  tracks: AudioTrack[];
  onClose: () => void;
  onPlayTrack: (track: AudioTrack) => void;
  loading: boolean;
}

const AlbumModal: React.FC<AlbumModalProps> = ({
  album,
  tracks,
  onClose,
  onPlayTrack,
  loading,
}) => {
  if (!album) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-400">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
              {album.coverArt && (
                <img
                  src={album.coverArt}
                  alt={album.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              <div>
                <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-gray-100">
                  {album.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-1">
                  {album.artist}
                </p>
                {album.year && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                    {album.year} • {album.genre}
                  </p>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  <span>{album.trackCount} tracks</span>
                  <span className="mx-2">•</span>
                  <span>{humanDuration(album.totalDuration)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl p-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tracks */}
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex justify-center items-center h-32 text-gray-500 dark:text-gray-400">
              Loading tracks...
            </div>
          ) : (
            tracks.map((track, index) => (
              <div
                key={track.id}
                className="p-3 border-b border-gray-100 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer flex items-center justify-between group"
                onClick={() => onPlayTrack(track)}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-gray-500 dark:text-gray-400 w-6 text-right text-xs">
                    {track.trackNumber || index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                      {track.title}
                    </h4>
                    {track.artist !== album.artist && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {track.artist}
                      </p>
                    )}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumModal;
