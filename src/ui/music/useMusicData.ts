import { useState, useEffect, useCallback } from "react";
import type {
  Album,
  Artist,
  Genre,
  AudioTrack,
  MusicLibraryTab,
} from "./types";

interface UseMusicDataReturn {
  albums: Album[];
  artists: Artist[];
  genres: Genre[];
  searchResults: AudioTrack[];
  loading: boolean;
  searchLoading: boolean;
  fetchData: (tab: MusicLibraryTab) => Promise<void>;
  searchTracks: (query: string) => Promise<void>;
  loadAlbumTracks: (album: Album) => Promise<AudioTrack[]>;
}

export const useMusicData = (): UseMusicDataReturn => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchResults, setSearchResults] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchData = useCallback(async (tab: MusicLibraryTab) => {
    setLoading(true);
    try {
      switch (tab) {
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
  }, []);

  const searchTracks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data.tracks || []);
    } catch (error) {
      console.error("Failed to search tracks:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const loadAlbumTracks = useCallback(
    async (album: Album): Promise<AudioTrack[]> => {
      try {
        const response = await fetch(
          `/api/music/album/tracks?album=${encodeURIComponent(
            album.name
          )}&artist=${encodeURIComponent(album.artist)}`
        );
        const data = await response.json();
        return data.tracks || [];
      } catch (error) {
        console.error("Failed to load album tracks:", error);
        return [];
      }
    },
    []
  );

  return {
    albums,
    artists,
    genres,
    searchResults,
    loading,
    searchLoading,
    fetchData,
    searchTracks,
    loadAlbumTracks,
  };
};
