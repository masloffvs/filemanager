import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MediaEntry } from "../hooks/useMedialist";

function PasswordInput({
  onSubmit,
  error,
}: {
  onSubmit: (password: string) => void;
  error?: boolean;
}) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full h-full flex flex-col items-center justify-center backdrop-blur-md bg-black/10"
    >
      <div className="bg-dark-700 px-8 rounded-3xl flex flex-col items-center py-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-12 mb-12"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>

        <h1 className="text-white text-2xl mb-0 text-center">
          This video is password protected.
        </h1>
        <p className="text-white dark:text-gray-400 mb-4 text-center">
          Please enter the password to continue.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="mb-4 p-2 text-center bg-dark-600 px-5 rounded text-white w-full focus:outline-none focus:ring-2 focus:ring-dark-400"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-dark-500 hover:bg-dark-400 rounded-md cursor-pointer w-full text-white transition-colors"
        >
          Watch Video
        </button>
        {error && (
          <div className="mt-4 text-red-500 text-sm">
            Invalid password, please try again.
          </div>
        )}
      </div>
    </form>
  );
}

export default function VideoView({
  media,
  onClose,
}: {
  media: MediaEntry;
  onClose?: () => void;
}) {
  if (!media.videoEntry) return null;

  const [videoUrl, setVideoUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const checkVideoAccess = async (passwordParam?: string) => {
    if (!media.videoEntry?.id) return;

    const url = passwordParam
      ? `/api/media/stream?id=${
          media.videoEntry.id
        }&password=${encodeURIComponent(passwordParam)}`
      : `/api/media/stream?id=${media.videoEntry.id}`;

    try {
      const response = await fetch(url, { method: "HEAD" });

      if (response.status === 401 || response.status === 403) {
        setShowPasswordInput(true);
        setIsVideoLoading(false);
        return false;
      }

      if (response.ok) {
        setVideoUrl(url);
        setShowPasswordInput(false);
        setAuthError(false);
        setIsVideoLoading(true);
        return true;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error("Error checking video access:", error);
      setAuthError(true);
      return false;
    }
  };

  useEffect(() => {
    if (media.videoEntry?.id) {
      checkVideoAccess();
    }
  }, [media.videoEntry?.id]);

  const handlePasswordSubmit = async (inputPassword: string) => {
    setPassword(inputPassword);
    const success = await checkVideoAccess(inputPassword);

    if (!success) {
      setAuthError(true);
    }
  };

  useEffect(() => {
    if (media.videoEntry?.id) {
      setVideoUrl(`/api/media/stream?id=${media.videoEntry.id}`);
      setIsVideoLoading(true);
    }
  }, [media.videoEntry?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      }

      if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekRelative(-15);
      }

      if (e.code === "ArrowRight") {
        e.preventDefault();
        seekRelative(15);
      }

      if (e.code === "Escape") {
        e.preventDefault();
        if (!isFullscreen) {
          handleEscapeClose();
        }
      }
    };

    const handleMouseMove = () => {
      setShowControls(true);

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      if (isPlaying) {
        hideTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 2000);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isPlaying, isFullscreen]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    } else {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  }, [isPlaying]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const time = pos * duration;
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVideoDoubleClick = () => {
    toggleFullscreen();
  };

  const updateBuffered = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(
        videoRef.current.buffered.length - 1
      );
      setBuffered(bufferedEnd);
    }
  };

  const handleVideoLoadedData = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleVideoCanPlay = () => {
    setIsVideoLoading(false);
  };

  const seekRelative = (seconds: number) => {
    if (videoRef.current && duration > 0) {
      const newTime = Math.max(
        0,
        Math.min(duration, videoRef.current.currentTime + seconds)
      );

      setShowControls(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);

      if (isPlaying) {
        hideTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 2000);
      }
    }
  };

  const handleEscapeClose = () => {
    if (isFadingOut) return; // Prevent multiple calls

    setIsFadingOut(true);

    if (videoRef.current) {
      const video = videoRef.current;
      const wasPlaying = !video.paused;

      if (wasPlaying) {
        // Fade out volume over 300ms
        const originalVolume = video.volume;
        const fadeSteps = 10;
        const volumeStep = originalVolume / fadeSteps;
        let currentStep = 0;

        const volumeFadeInterval = setInterval(() => {
          currentStep++;
          const newVolume = Math.max(
            0,
            originalVolume - volumeStep * currentStep
          );
          video.volume = newVolume;

          if (currentStep >= fadeSteps || newVolume <= 0) {
            clearInterval(volumeFadeInterval);
            video.volume = 0;
          }
        }, 30); // 30ms intervals for smooth fade
      }
    }

    // Call onClose after fade animation completes
    setTimeout(() => {
      onClose?.();
    }, 500); // Match the fade-out duration
  };

  if (showPasswordInput) {
    return (
      <div className="w-screen h-screen bg-black p-4 fixed top-0 left-0 z-50">
        <div className="w-full h-full flex items-center justify-center">
          <PasswordInput onSubmit={handlePasswordSubmit} error={authError} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black p-4 fixed top-0 left-0 z-50">
      <div className="w-full h-full flex items-center justify-center relative">
        {process.env.NODE_ENV === "development" ? (
          <div className="absolute top-4 left-4 text-white bg-black/50 px-2 py-1 rounded text-sm z-50">
            <h1>Debug information</h1>
            <ul className="text-xs">
              <li>Video ID: {media.videoEntry?.id}</li>
              <li>Video URL: {videoUrl}</li>
              <li>Is Loading: {isVideoLoading ? "Yes" : "No"}</li>
              <li>Is Fullscreen: {isFullscreen ? "Yes" : "No"}</li>
              <li>Duration: {duration.toFixed(2)}s</li>
              <li>Current Time: {currentTime.toFixed(2)}s</li>
              <li>Is Playing: {isPlaying ? "Yes" : "No"}</li>
              <li>Buffered: {buffered.toFixed(2)}s</li>
            </ul>
            {colorPalette.length > 0 && (
              <div className="mt-2">
                <div className="text-xs mb-1">Color Palette:</div>
                <div className="flex gap-1">
                  {colorPalette.map((color, index) => (
                    <div
                      key={index}
                      className="w-4 h-4 rounded border border-white/20"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Video container without animation */}
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.video
            ref={videoRef}
            className="w-full max-h-screen cursor-pointer"
            key={videoUrl}
            src={videoUrl}
            autoPlay
            preload="auto"
            playsInline
            crossOrigin="anonymous"
            // Hardware acceleration hints
            disablePictureInPicture={false}
            disableRemotePlayback={false}
            // Optimize for high bitrate content
            poster="" // Prevents flash of unstyled content
            muted={false}
            // Performance optimizations
            style={{
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
              perspective: "1000px",
              willChange: "transform",
              objectFit: "contain",
            }}
            // Add codec preferences via ref callback
            ref={(video) => {
              if (video) {
                videoRef.current = video;

                if ("requestIdleCallback" in window) {
                  video.setAttribute("playsinline", "true");
                  video.setAttribute("webkit-playsinline", "true");
                }
              }
            }}
            initial={{ scale: 0.8 }}
            animate={{
              scale: isVideoLoading ? 0.8 : isFadingOut ? 0.95 : 1,
              opacity: isFadingOut ? 0 : 1,
            }}
            transition={{ duration: isFadingOut ? 0.5 : 1.3, ease: "easeOut" }}
            onDoubleClick={handleVideoDoubleClick}
            onTimeUpdate={() => {
              setCurrentTime(videoRef.current?.currentTime || 0);
              updateBuffered();
            }}
            onLoadedMetadata={() =>
              setDuration(videoRef.current?.duration || 0)
            }
            onLoadedData={handleVideoLoadedData}
            onCanPlay={handleVideoCanPlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onProgress={updateBuffered}
            onSeeking={() => {
              setShowControls(true);
            }}
            onSeeked={() => {
              if (isPlaying) {
                hideTimeoutRef.current = setTimeout(() => {
                  setShowControls(false);
                }, 2000);
              }
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </motion.video>

          {/* Loading overlay */}
          <AnimatePresence>
            {isVideoLoading && (
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 bg-black z-10 flex items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Custom Controls Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ y: "150%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "150%", scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="absolute bottom-4 left-4 right-4 bg-dark-500/30 backdrop-blur-md border-2 border-dark-400/50 bg-opacity-50 rounded-[24px] p-4"
            >
              <div className="flex items-center space-x-4">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlayPause}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  {isPlaying ? (
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Progress Bar */}
                <div className="flex-1 flex items-center space-x-2">
                  <span className="text-white text-sm">
                    {formatTime(currentTime)}
                  </span>
                  <div
                    className="flex-1 h-2 bg-gray-600 rounded-full cursor-pointer relative"
                    onClick={handleSeek}
                  >
                    {/* Buffer Progress */}
                    <div
                      className="absolute h-full bg-gray-400 rounded-full opacity-50"
                      style={{
                        width: `${duration ? (buffered / duration) * 100 : 0}%`,
                      }}
                    />
                    {/* Current Progress */}
                    <div
                      className="absolute h-full bg-white rounded-full"
                      style={{
                        width: `${
                          duration ? (currentTime / duration) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-white text-sm">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
