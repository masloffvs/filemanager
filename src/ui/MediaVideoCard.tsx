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
      className="flex flex-col items-center gap-2 bg-gray-100 p-2 rounded dark:bg-dark-400 hover:dark:border-dark-100 border-transparent border cursor-pointer"
    >
      <div className="w-full select-none h-[200px] overflow-hidden bg-black flex items-center justify-center relative">
        <img
          id={`media-video-frame-blur-${media.id}`}
          alt=""
          className="h-[200px]  w-full object-cover opacity-20 blur-md w-full z-10"
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
      </div>

      <div className="w-full flex flex-col items-start justify-start text-left">
        <h6 className="text-white">{media.videoEntry?.title || "Untitled"}</h6>
        <p className="text-gray-500 text-[10px]">
          {frames.length} {currentFrame?.timestamp}
        </p>
      </div>
    </div>
  );
}
