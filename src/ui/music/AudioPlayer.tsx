import React, { useState, useEffect, useRef } from "react";
import { humanDuration } from "../../utils/humansize";
import type { AudioTrack } from "./types";
import { motion } from "framer-motion";

interface AudioPlayerProps {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
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
      audioRef.current.src = `/api/music/stream?id=${currentTrack.id}`;
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
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="fixed bottom-4 right-4 px-4 py-3.5 bg-white dark:bg-dark-800/50 dark:backdrop-blur-md border border-gray-200 dark:border-dark-400 rounded-xl w-[300px] z-50"
    >
      <audio ref={audioRef} preload="metadata" />

      {/* Track Info */}
      <div className="flex items-center mb-5">
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
        <div
          className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 relative cursor-pointer"
          onClick={(e) => {
            const rect = (e.target as HTMLDivElement).getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = clickX / rect.width;
            const newTime = percent * duration;
            if (audioRef.current) {
              audioRef.current.currentTime = newTime;
              setCurrentTime(newTime);
            }
          }}
          aria-label="Seek audio position"
        >
          <div
            className="h-2 rounded-full bg-blue-500 absolute top-0 left-0"
            style={{
              width: duration ? `${(currentTime / duration) * 100}%` : "0%",
              transition: "width 0.1s linear",
            }}
          />
        </div>
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
          className="p-3 bg-blue-500 flex-1 hover:bg-blue-600 text-white rounded-full text-lg"
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
    </motion.div>
  );
};

export default AudioPlayer;
