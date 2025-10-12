// Music library type definitions
export interface AudioTrack {
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

export interface Album {
  id: string;
  name: string;
  artist: string;
  year?: number;
  genre: string;
  trackCount: number;
  totalDuration: number;
  coverArt?: string;
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  trackCount: number;
  totalDuration: number;
}

export interface Genre {
  id: string;
  name: string;
  trackCount: number;
  albumCount: number;
  artistCount: number;
}

// Player state interface
export interface PlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  playlist: AudioTrack[];
  currentTrackIndex: number;
}

// Music library tab types
export type MusicLibraryTab = "albums" | "artists" | "genres";
