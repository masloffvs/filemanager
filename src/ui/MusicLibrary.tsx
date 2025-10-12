import React, { useState, useEffect } from "react";
import type { AudioTrack, Album, MusicLibraryTab } from "./music/types";
import MusicLibraryHeader from "./music/MusicLibraryHeader";
import SearchResults from "./music/SearchResults";
import AlbumsGrid from "./music/AlbumsGrid";
import ArtistsGrid from "./music/ArtistsGrid";
import GenresGrid from "./music/GenresGrid";
import AlbumModal from "./music/AlbumModal";
import AudioPlayer from "./music/AudioPlayer";
import { useMusicPlayer } from "./music/useMusicPlayer";
import { useMusicData } from "./music/useMusicData";

const MusicLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MusicLibraryTab>("albums");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumTracks, setAlbumTracks] = useState<AudioTrack[]>([]);
  const [albumLoading, setAlbumLoading] = useState(false);

  // Use custom hooks
  const musicPlayer = useMusicPlayer();
  const musicData = useMusicData();

  useEffect(() => {
    musicData.fetchData(activeTab);
  }, [activeTab, musicData.fetchData]);

  const searchTracks = async () => {
    if (!searchQuery.trim()) return;
    await musicData.searchTracks(searchQuery);
  };

  const loadAlbumTracks = async (album: Album) => {
    setAlbumLoading(true);
    try {
      const tracks = await musicData.loadAlbumTracks(album);
      setAlbumTracks(tracks);
      setSelectedAlbum(album);
    } catch (error) {
      console.error("Failed to load album tracks:", error);
    } finally {
      setAlbumLoading(false);
    }
  };

  const handleAlbumModalPlayTrack = (track: AudioTrack) => {
    musicPlayer.playTrack(track, albumTracks);
    setSelectedAlbum(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "albums":
        return (
          <AlbumsGrid
            albums={musicData.albums}
            onAlbumClick={loadAlbumTracks}
            loading={musicData.loading}
          />
        );
      case "artists":
        return (
          <ArtistsGrid
            artists={musicData.artists}
            loading={musicData.loading}
          />
        );
      case "genres":
        return (
          <GenresGrid genres={musicData.genres} loading={musicData.loading} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-dark-700">
      {/* Header */}
      <MusicLibraryHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={searchTracks}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Search Results */}
        <SearchResults
          searchResults={musicData.searchResults}
          onPlayTrack={musicPlayer.playTrack}
          loading={musicData.searchLoading}
        />

        {/* Tab Content */}
        {renderContent()}
      </div>

      {/* Album Modal */}
      <AlbumModal
        album={selectedAlbum}
        tracks={albumTracks}
        loading={albumLoading}
        onClose={() => setSelectedAlbum(null)}
        onPlayTrack={handleAlbumModalPlayTrack}
      />

      {/* Audio Player */}
      <AudioPlayer
        currentTrack={musicPlayer.playerState.currentTrack}
        isPlaying={musicPlayer.playerState.isPlaying}
        onPlay={musicPlayer.play}
        onPause={musicPlayer.pause}
        onNext={musicPlayer.playNext}
        onPrevious={musicPlayer.playPrevious}
        onClose={musicPlayer.stop}
      />
    </div>
  );
};

export default MusicLibrary;
