import React, { useState, useEffect, useRef } from "react";
import { humanDuration } from "../utils/humansize";

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
  path: string;
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

// Компонент аудиоплеера
const AudioPlayer: React.FC<{
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}> = ({
  currentTrack,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onClose,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = `/api/download?id=${currentTrack.id}`;
      audioRef.current.load();
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => onNext();

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onNext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-400 rounded-lg shadow-lg p-4 w-80 z-50">
      <audio ref={audioRef} preload="metadata" />

      {/* Track Info */}
      <div className="flex items-center mb-3">
        {currentTrack.coverArt && (
          <img
            src={currentTrack.coverArt}
            alt={currentTrack.album}
            className="w-12 h-12 object-cover rounded mr-3"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
            {currentTrack.title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {currentTrack.artist} • {currentTrack.album}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
        >
          ✕
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max="100"
          value={duration ? (currentTime / duration) * 100 : 0}
          onChange={handleSeek}
          className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          aria-label="Seek audio position"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4 mb-3">
        <button
          onClick={onPrevious}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-lg"
        >
          ⏮
        </button>
        <button
          onClick={togglePlayPause}
          className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-lg"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          onClick={onNext}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-lg"
        >
          ⏭
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center space-x-2">
        <span className="text-sm">🔊</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume * 100}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          aria-label="Volume control"
        />
      </div>
    </div>
  );
};

// Модальное окно альбома
const AlbumModal: React.FC<{
  album: Album | null;
  tracks: AudioTrack[];
  onClose: () => void;
  onPlayTrack: (track: AudioTrack) => void;
  loading: boolean;
}> = ({ album, tracks, onClose, onPlayTrack, loading }) => {
  if (!album) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6">
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
        <div className="overflow-y-auto max-h-96 p-4">
          {loading ? (
            <div className="flex justify-center items-center h-32 text-gray-500 dark:text-gray-400">
              Loading tracks...
            </div>
          ) : (
            tracks.map((track, index) => (
              <div
                key={track.id}
                className="p-3 hover:bg-gray-50 rounded-md bg-dark-700 dark:hover:bg-dark-500 cursor-pointer flex items-center justify-between group"
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

const MusicLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"albums" | "artists" | "genres">(
    "albums"
  );
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AudioTrack[]>([]);

  // Modal state
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumTracks, setAlbumTracks] = useState<AudioTrack[]>([]);
  const [albumLoading, setAlbumLoading] = useState(false);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
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

  const searchTracks = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setSearchResults(data.tracks || []);
    } catch (error) {
      console.error("Failed to search tracks:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlbumTracks = async (album: Album) => {
    setAlbumLoading(true);
    try {
      const response = await fetch(
        `/api/music/album/tracks?album=${encodeURIComponent(
          album.name
        )}&artist=${encodeURIComponent(album.artist)}`
      );
      const data = await response.json();
      setAlbumTracks(data.tracks || []);
      setSelectedAlbum(album);
    } catch (error) {
      console.error("Failed to load album tracks:", error);
    } finally {
      setAlbumLoading(false);
    }
  };

  // Player functions
  const playTrack = (track: AudioTrack, trackList: AudioTrack[] = [track]) => {
    setCurrentTrack(track);
    setPlaylist(trackList);
    const index = trackList.findIndex((t) => t.id === track.id);
    setCurrentTrackIndex(index !== -1 ? index : 0);
    setIsPlaying(true);
  };

  const playNext = () => {
    if (playlist.length > 0 && currentTrackIndex < playlist.length - 1) {
      const nextIndex = currentTrackIndex + 1;
      const nextTrack = playlist[nextIndex];
      if (nextTrack) {
        setCurrentTrackIndex(nextIndex);
        setCurrentTrack(nextTrack);
      }
    }
  };

  const playPrevious = () => {
    if (playlist.length > 0 && currentTrackIndex > 0) {
      const prevIndex = currentTrackIndex - 1;
      const prevTrack = playlist[prevIndex];
      if (prevTrack) {
        setCurrentTrackIndex(prevIndex);
        setCurrentTrack(prevTrack);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-dark-700">
      {/* Header */}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && searchTracks()}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={searchTracks}
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
              onClick={() => setActiveTab(tab)}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        )}

        {!loading && (
          <>
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Search Results
                </h2>
                <div className="space-y-2">
                  {searchResults.map((track) => (
                    <div
                      key={track.id}
                      className="bg-white dark:bg-dark-800 rounded-lg p-3 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer group border border-gray-200 dark:border-dark-600"
                      onClick={() => playTrack(track, searchResults)}
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
            )}

            {/* Albums Grid */}
            {activeTab === "albums" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    className="bg-white dark:bg-dark-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-dark-600"
                    onClick={() => loadAlbumTracks(album)}
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
            )}

            {/* Artists Grid */}
            {activeTab === "artists" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {artists.map((artist) => (
                  <div
                    key={artist.id}
                    className="bg-white dark:bg-dark-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-dark-600"
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
            )}

            {/* Genres Grid */}
            {activeTab === "genres" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {genres.map((genre) => (
                  <div
                    key={genre.id}
                    className="bg-white dark:bg-dark-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-dark-600"
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
            )}
          </>
        )}
      </div>

      {/* Album Modal */}
      <AlbumModal
        album={selectedAlbum}
        tracks={albumTracks}
        loading={albumLoading}
        onClose={() => setSelectedAlbum(null)}
        onPlayTrack={(track) => {
          playTrack(track, albumTracks);
          setSelectedAlbum(null);
        }}
      />

      {/* Audio Player */}
      <AudioPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onNext={playNext}
        onPrevious={playPrevious}
        onClose={() => {
          setCurrentTrack(null);
          setIsPlaying(false);
          setPlaylist([]);
        }}
      />
    </div>
  );
};

export default MusicLibrary;
