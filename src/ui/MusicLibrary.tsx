import React, { useState, useEffect, useMemo } from "react";
import { humanDuration } from "./types";

interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year?: number;
  genre: string;
  trackNumber?: number;
  trackTotal?: number;
  duration?: number;
  bitrate?: number;
  coverArt?: string;
}

interface Album {
  id: string;
  name: string;
  artist: string;
  year?: number;
  genre: string;
  trackCount: number;
  totalDuration: number;
  coverArt?: string;
}

interface Artist {
  id: string;
  name: string;
  albumCount: number;
  trackCount: number;
  totalDuration: number;
}

interface Genre {
  id: string;
  name: string;
  trackCount: number;
  albumCount: number;
  artistCount: number;
}

type ViewMode = "albums" | "artists" | "genres";
type SortBy = "name" | "year" | "artist" | "duration" | "trackCount";

interface FilterState {
  sortBy: SortBy;
  sortOrder: "asc" | "desc";
  searchQuery: string;
}

export default function MusicLibrary() {
  const [viewMode, setViewMode] = useState<ViewMode>("albums");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumTracks, setAlbumTracks] = useState<AudioTrack[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    sortBy: "name",
    sortOrder: "asc",
    searchQuery: "",
  });
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    fetchData();
  }, [viewMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (viewMode) {
        case "albums":
          const albumsResponse = await fetch("/api/music/albums");
          const albumsData = await albumsResponse.json();
          setAlbums(albumsData.albums || []);
          break;
        case "artists":
          const artistsResponse = await fetch("/api/music/artists");
          const artistsData = await artistsResponse.json();
          setArtists(artistsData.artists || []);
          break;
        case "genres":
          const genresResponse = await fetch("/api/music/genres");
          const genresData = await genresResponse.json();
          setGenres(genresData.genres || []);
          break;
      }
    } catch (error) {
      console.error("Failed to fetch music data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlbumTracks = async (album: Album) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/music/album/tracks?album=${encodeURIComponent(album.name)}&artist=${encodeURIComponent(album.artist)}`
      );
      const data = await response.json();
      setAlbumTracks(data.tracks || []);
      setSelectedAlbum(album);
    } catch (error) {
      console.error("Failed to load album tracks:", error);
    } finally {
      setLoading(false);
    }
  };

  const playTrack = (track: AudioTrack) => {
    window.open(`/api/download?id=${track.id}`, '_blank');
  };

  // Filter and sort data
  const filteredAlbums = useMemo(() => {
    let filtered = [...albums];

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (album) =>
          album.name.toLowerCase().includes(query) ||
          album.artist.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (filters.sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "artist":
          aValue = a.artist.toLowerCase();
          bValue = b.artist.toLowerCase();
          break;
        case "year":
          aValue = a.year || 0;
          bValue = b.year || 0;
          break;
        case "trackCount":
          aValue = a.trackCount;
          bValue = b.trackCount;
          break;
        case "duration":
          aValue = a.totalDuration;
          bValue = b.totalDuration;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return filters.sortOrder === "asc" ? result : -result;
    });

    return filtered;
  }, [albums, filters]);

  const filteredArtists = useMemo(() => {
    let filtered = [...artists];

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((artist) =>
        artist.name.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (filters.sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "trackCount":
          aValue = a.trackCount;
          bValue = b.trackCount;
          break;
        case "duration":
          aValue = a.totalDuration;
          bValue = b.totalDuration;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return filters.sortOrder === "asc" ? result : -result;
    });

    return filtered;
  }, [artists, filters]);

  const renderAlbums = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {filteredAlbums.map((album) => (
        <div
          key={album.id}
          className="relative cursor-pointer group rounded-lg border dark:border-dark-300 overflow-hidden bg-white dark:bg-dark-800 hover:shadow-lg transition-shadow"
          onClick={() => loadAlbumTracks(album)}
        >
          {album.coverArt ? (
            <img
              src={album.coverArt}
              alt={album.name}
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div className="w-full aspect-square bg-gray-100 dark:bg-dark-600 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-8 text-gray-400 dark:text-gray-500"
              >
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
              </svg>
            </div>
          )}
          <div className="p-3">
            <h3 className="font-medium text-sm mb-1 truncate text-gray-900 dark:text-gray-100">
              {album.name}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
              {album.artist}
            </p>
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-500">
              <span>{album.trackCount} tracks</span>
              {album.year && <span>{album.year}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderArtists = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredArtists.map((artist) => (
        <div
          key={artist.id}
          className="bg-white dark:bg-dark-800 rounded-lg border dark:border-dark-300 p-4 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {artist.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {artist.name}
              </h3>
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Albums:</span>
              <span>{artist.albumCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Tracks:</span>
              <span>{artist.trackCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{humanDuration(artist.totalDuration)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderGenres = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {genres.map((genre) => (
        <div
          key={genre.id}
          className="bg-white dark:bg-dark-800 rounded-lg border dark:border-dark-300 p-4 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-6 text-white"
              >
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {genre.name}
              </h3>
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Artists:</span>
              <span>{genre.artistCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Albums:</span>
              <span>{genre.albumCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Tracks:</span>
              <span>{genre.trackCount}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAlbumTracks = () => (
    <div className="p-4">
      <div className="mb-6 flex items-start space-x-4">
        <button
          onClick={() => setSelectedAlbum(null)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4 text-sm"
        >
          ← Back to Albums
        </button>
      </div>
      
      {selectedAlbum && (
        <div className="mb-6 flex items-start space-x-4">
          {selectedAlbum.coverArt ? (
            <img
              src={selectedAlbum.coverArt}
              alt={selectedAlbum.name}
              className="w-32 h-32 object-cover rounded-lg border dark:border-dark-300"
            />
          ) : (
            <div className="w-32 h-32 bg-gray-100 dark:bg-dark-600 rounded-lg border dark:border-dark-300 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-12 text-gray-400 dark:text-gray-500"
              >
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192Z" />
              </svg>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">{selectedAlbum.name}</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-1">
              {selectedAlbum.artist}
            </p>
            {selectedAlbum.year && (
              <p className="text-gray-500 dark:text-gray-500 mb-2">
                {selectedAlbum.year} • {selectedAlbum.genre}
              </p>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-500">
              <span>{selectedAlbum.trackCount} tracks</span>
              <span className="mx-2">•</span>
              <span>{humanDuration(selectedAlbum.totalDuration)}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-1">
        {albumTracks.map((track, index) => (
          <div
            key={track.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg transition-colors group"
          >
            <div className="flex items-center space-x-3 flex-1">
              <span className="text-gray-500 dark:text-gray-500 w-6 text-right text-xs">
                {track.trackNumber || index + 1}
              </span>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {track.title}
                </h4>
                {track.artist !== selectedAlbum?.artist && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {track.artist}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {track.duration && (
                <span className="text-xs text-gray-500 dark:text-gray-500 tabular-nums">
                  {humanDuration(track.duration)}
                </span>
              )}
              <button
                onClick={() => playTrack(track)}
                className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-all"
              >
                Play
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {selectedAlbum && renderAlbumTracks()}

        {!selectedAlbum && (
          <div className="p-4">
            {/* Header with navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-5 text-gray-600 dark:text-gray-400"
                >
                  <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192Z" />
                </svg>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
                  {viewMode} ({
                    viewMode === "albums" ? filteredAlbums.length :
                    viewMode === "artists" ? filteredArtists.length :
                    genres.length
                  })
                </h2>
              </div>

              {/* View mode tabs */}
              <div className="flex space-x-1 bg-gray-100 dark:bg-dark-600 rounded-lg p-1">
                {(["albums", "artists", "genres"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 text-xs font-medium capitalize rounded-md transition-colors ${
                      viewMode === mode
                        ? "bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full dark:border-gray-600 dark:border-t-gray-400"></div>
              </div>
            ) : (
              <>
                {viewMode === "albums" && renderAlbums()}
                {viewMode === "artists" && renderArtists()}
                {viewMode === "genres" && renderGenres()}
              </>
            )}

            {/* Empty state */}
            {!loading && (
              (viewMode === "albums" && filteredAlbums.length === 0) ||
              (viewMode === "artists" && filteredArtists.length === 0) ||
              (viewMode === "genres" && genres.length === 0)
            ) && (
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
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  No music found
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Try adjusting your search or check if music files have been indexed
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compact filter panel */}
      {!selectedAlbum && (
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
                placeholder="Search music..."
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-dark-400 rounded bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
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
                aria-label="Sort by"
              >
                <option value="name">Name</option>
                <option value="artist">Artist</option>
                <option value="year">Year</option>
                <option value="trackCount">Track Count</option>
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

            {/* Stats */}
            <div className="pt-2 border-t border-gray-200 dark:border-dark-500 space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>
                    {viewMode === "albums" ? filteredAlbums.length :
                     viewMode === "artists" ? filteredArtists.length :
                     genres.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}