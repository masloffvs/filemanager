import { useState, useCallback } from "react";
import type { AudioTrack, PlayerState } from "./types";

export const useMusicPlayer = () => {
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    playlist: [],
    currentTrackIndex: 0,
  });

  const playTrack = useCallback(
    (track: AudioTrack, trackList: AudioTrack[] = [track]) => {
      const trackIndex = trackList.findIndex((t) => t.id === track.id);
      setPlayerState({
        currentTrack: track,
        isPlaying: true,
        playlist: trackList,
        currentTrackIndex: trackIndex !== -1 ? trackIndex : 0,
      });
    },
    []
  );

  const playNext = useCallback(() => {
    setPlayerState((prev) => {
      const { playlist, currentTrackIndex } = prev;
      if (playlist.length > 0 && currentTrackIndex < playlist.length - 1) {
        const nextIndex = currentTrackIndex + 1;
        const nextTrack = playlist[nextIndex];
        if (nextTrack) {
          return {
            ...prev,
            currentTrackIndex: nextIndex,
            currentTrack: nextTrack,
          };
        }
      }
      return prev;
    });
  }, []);

  const playPrevious = useCallback(() => {
    setPlayerState((prev) => {
      const { playlist, currentTrackIndex } = prev;
      if (playlist.length > 0 && currentTrackIndex > 0) {
        const prevIndex = currentTrackIndex - 1;
        const prevTrack = playlist[prevIndex];
        if (prevTrack) {
          return {
            ...prev,
            currentTrackIndex: prevIndex,
            currentTrack: prevTrack,
          };
        }
      }
      return prev;
    });
  }, []);

  const play = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const stop = useCallback(() => {
    setPlayerState({
      currentTrack: null,
      isPlaying: false,
      playlist: [],
      currentTrackIndex: 0,
    });
  }, []);

  const setPlaylist = useCallback((tracks: AudioTrack[]) => {
    setPlayerState((prev) => ({
      ...prev,
      playlist: tracks,
    }));
  }, []);

  return {
    playerState,
    playTrack,
    playNext,
    playPrevious,
    play,
    pause,
    stop,
    setPlaylist,
  };
};
