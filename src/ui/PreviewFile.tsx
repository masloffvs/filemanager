import useFileMetadata from "@/hooks/useFileMetadata";
import type { Entry } from "./types";
import { useEffect, useState } from "react";

function warningComponent(svg: React.JSX.Element, message: string) {
  return (
    <div className="w-full h-[200px] flex flex-col items-center justify-center flex-wrap py-4">
      {svg}
      <p className="text-gray-500 text-[12px] mt-2 px-6 text-center">
        {message}
      </p>
    </div>
  );
}

function isCoverEmpty(cover: string | null | undefined) {
  return (
    cover === "" ||
    cover === "N/A" ||
    cover === "null" ||
    cover === "undefined" ||
    cover?.toString()?.trim() === "" ||
    cover ===
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgMBAp6kAAAAAElFTkSuQmCC" || // 1x1 pixel
    cover == undefined ||
    cover === null
  );
}

const PlaySvg = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5"
  >
    <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
  </svg>
);

const PauseSvg = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5"
  >
    <path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" />
  </svg>
);

function AudioPlayer({ cover, src }: { cover: string; src: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );
  const [audioProgessInPercent, setAudioProgessInPercent] = useState<Number>(0);

  useEffect(() => {
    if (!audioElement) return;

    const updateProgress = () => {
      if (audioElement) {
        const percent =
          (audioElement.currentTime / audioElement.duration) * 100;
        setAudioProgessInPercent(percent);
      }
    };

    audioElement.addEventListener("timeupdate", updateProgress);
    return () => {
      audioElement.removeEventListener("timeupdate", updateProgress);
    };
  }, [audioElement]);

  useEffect(() => {
    const audio = new Audio(src);
    setAudioElement(audio);
    return () => {
      audio.pause();
      setAudioElement(null);
    };
  }, [src]);

  return (
    <div className="min-w-[100px] min-h-[200px] dark:drop-shadow-lg dark:shadow-dark-300 flex items-center justify-center relative overflow-hidden">
      {!isCoverEmpty(cover) && (
        <img
          src={cover}
          className="w-full z-10 h-full absolute object-cover opacity-20 blur-[2px] dark:opacity-30"
          alt=""
        />
      )}

      {/**bg progress */}
      <div className="w-full h-1 absolute bottom-0 left-0 bg-gray-200 dark:bg-dark-500">
        <div
          aria-label="Audio progress"
          data-value={audioProgessInPercent}
          className="h-full bg-blue-500 dark:bg-gradient-to-r dark:from-blue-500 dark:to-blue-700 transition-all duration-200 ease-in-out rounded-r"
          style={{
            width: `${audioProgessInPercent}%`,
          }}
        ></div>
      </div>

      <button
        type="button"
        aria-roledescription="button"
        title={isPlaying ? "Pause" : "Play"}
        onClick={() => {
          if (!audioElement) return;
          if (isPlaying) {
            audioElement.pause();
            setIsPlaying(false);
          } else {
            audioElement.play();
            setIsPlaying(true);
          }
        }}
        className="p-2 z-50 rounded hover:bg-dark-200 dark:hover:bg-dark-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
      >
        {isPlaying ? PauseSvg : PlaySvg}
      </button>
    </div>
  );
}

export default function PreviewFile({ file }: { file: Entry | null }) {
  if (!file) return null;

  const allMetadata = useFileMetadata(file);

  const [responseCode, setResponseCode] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkPreview() {
      if (!file) {
        if (isMounted) setResponseCode(null);
        return;
      }
      try {
        const res = await fetch(`/api/preview?id=${file?.id}`, {
          method: "HEAD",
        });
        if (isMounted) setResponseCode(res.status);
      } catch (e) {
        console.error("Error checking preview:", e);
        if (isMounted) setResponseCode(null);
      }
    }
    checkPreview();
    return () => {
      isMounted = false;
    };
  }, [file]);

  if (responseCode === 403 || responseCode === 401) {
    return warningComponent(
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="size-4"
      >
        <path
          fillRule="evenodd"
          d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z"
          clipRule="evenodd"
        />
      </svg>,
      "This file is password protected. Please enter the password to preview it."
    );
  } else if (responseCode === 404) {
    return warningComponent(
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="size-4"
      >
        <path
          fillRule="evenodd"
          d="M3.05 3.05a7 7 0 1 1 9.9 9.9 7 7 0 0 1-9.9-9.9Zm1.627.566 7.707 7.707a5.501 5.501 0 0 0-7.707-7.707Zm6.646 8.768L3.616 4.677a5.501 5.501 0 0 0 7.707 7.707Z"
          clipRule="evenodd"
        />
      </svg>,
      "File not found"
    );
  }

  switch (file.type) {
    case "folder":
      return (
        <p className="text-gray-500 text-sm">Folder preview not available</p>
      );
    case "file":
      switch (file.mimeType) {
        case "image/png":
        case "image/jpeg":
        case "image/gif":
        case "image/webp":
        case "image/svg+xml":
          return (
            <img
              src={`/api/preview?id=${file.id}`}
              alt="Preview"
              className="max-w-full h-[200px] object-contain"
            />
          );
        case "video/mp4":
        case "video/webm":
        case "video/mov":
        case "video/quicktime":
        case "video/ogg":
        case "video/avi":
        case "video/mpeg":
        case "video/flv":
          return (
            <video
              controls
              src={`/api/preview?id=${file.id}`}
              className="max-w-full h-auto"
            >
              Your browser does not support the video tag.
            </video>
          );

        case "audio/mpeg":
        case "audio/wav":
        case "audio/ogg":
        case "audio/flac":
        case "audio/x-flac":
        case "audio/webm":
        case "audio/aac":
        case "audio/mp4":
          return (
            <AudioPlayer
              cover={allMetadata?.cover}
              src={`/api/preview?id=${file.id}`}
            />
          );
        default:
          return warningComponent(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="size-4"
            >
              <path
                fillRule="evenodd"
                d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>,
            "Preview not available for this file type."
          );
      }
  }
}
