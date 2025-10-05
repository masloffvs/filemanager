import { _ } from "node_modules/tailwindcss/dist/colors-b_6i0Oi7";
import type { MediaEntry } from "../hooks/useMedialist";
import { use, useEffect, useMemo, useState } from "react";

export default function MediaVideoCard({
  media,
  onClick,
}: {
  media: MediaEntry;
  onClick: (media: MediaEntry) => void;
}) {
  if (!media.videoEntry) return null;

  const [isHovered, setIsHovered] = useState(false);
  const [frames, setFrames] = useState<
    { timestamp: number; frameBase64: string }[]
  >([]);
  const [currentFrame, setCurrentFrame] = useState<
    { timestamp: number; frameBase64: string } | undefined
  >(undefined);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    if (!isHovered) {
      setCurrentFrame(undefined);
    }

    if (isHovered && media?.videoEntry?.id && frames.length > 0) {
      let i = 0;
      const allFramesLength = frames.length;
      if (allFramesLength === 0) return;

      intervalId = setInterval(() => {
        if (!isMounted) return;

        setCurrentFrame(frames[i]);

        i = (i + 1) % allFramesLength;

        if (process.env.NODE_ENV === "development") {
          console.log("Switched to frame:", frames[i]);
        }

        document
          .getElementById(`media-video-frame-${media.id}`)
          ?.setAttribute(
            "data-current-frame",
            String(currentFrame?.timestamp || 0)
          );

        document
          .getElementById(`media-video-frame-blur-${media.id}`)
          ?.setAttribute(
            "data-current-frame",
            String(currentFrame?.timestamp || 0)
          );
      }, 320);
    }

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [media.videoEntry?.id, frames, isHovered]);

  useEffect(() => {
    let isMounted = true;

    if (isHovered && media?.videoEntry?.id && frames.length === 0) {
      fetch(`/api/media/frames?id=${media?.videoEntry?.id}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("Fetched frames data:", data);
          if (isMounted && Array.isArray(data)) {
            setFrames(
              data.map(
                (item) =>
                  item.frame as { timestamp: number; frameBase64: string }
              )
            );
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isHovered, frames.length, media?.videoEntry?.id]);

  return (
    <div
      key={media.id}
      onClick={() => onClick(media)}
      title={media.videoEntry?.title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Media item with video about '${media.videoEntry?.title}'`}
      className="relative cursor-pointer group rounded-[15px] border dark:border-dark-300 overflow-hidden"
    >
      <div className="w-full select-none h-[200px] overflow-hidden bg-black flex items-center justify-center relative">
        <img
          id={`media-video-frame-blur-${media.id}`}
          alt=""
          className="h-[200px] w-full object-cover opacity-20 blur-md w-full z-10"
          data-current-frame={currentFrame?.timestamp || 0}
          src={currentFrame?.frameBase64 || media.videoEntry?.thumbnailBase64}
        />

        <img
          id={`media-video-frame-${media.id}`}
          alt=""
          data-current-frame={currentFrame?.timestamp || 0}
          className="h-full object-cover absolute z-30"
          src={currentFrame?.frameBase64 || media.videoEntry?.thumbnailBase64}
        />

        {/* Text overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-sm p-2">
          <h6 className="text-white text-sm font-medium truncate">
            {media.videoEntry?.title || "Untitled"}
          </h6>
          <p className="text-gray-300 text-xs opacity-75">
            {frames.length > 0 && `${frames.length} frames`}
            {currentFrame?.timestamp &&
              ` • ${Math.round(currentFrame.timestamp)}s`}
          </p>
        </div>
      </div>
    </div>
  );
}
