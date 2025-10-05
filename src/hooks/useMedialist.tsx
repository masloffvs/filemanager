import { useEffect, useState } from "react";
import type { MediaSlicedEntry, VideoMediaFile } from "../mediaIndex";

export interface MediaEntry extends MediaSlicedEntry {
  videoEntry?: VideoMediaFile;
}

export default function useMedialist(limit: number, offset: number) {
  if (typeof window === "undefined") {
    throw new Error("useMedialist can only be used in the browser");
  }

  const [streamedList, setStreamedList] = useState<MediaEntry[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchMedia() {
      try {
        const res = await fetch(
          `/api/media/slice?limit=${limit}&offset=${offset}`
        );
        if (!res.ok) {
          throw new Error(`Error fetching media: ${res.statusText}`);
        }
        const data = await res.json();
        if (isMounted) {
          let videoEntries: MediaEntry[] = [];
          for (const item of data) {
            if (item.mediaType === "video") {
              try {
                const videoRes = await fetch(`/api/media/get?id=${item.id}`);
                if (videoRes.ok) {
                  const videoData = await videoRes.json();
                  item.videoEntry = videoData as VideoMediaFile;
                  videoEntries.push(item);
                  setStreamedList(videoEntries);
                }
              } catch (e) {
                console.error(
                  `Failed to fetch video metadata for entryId ${item.entryId}:`,
                  e
                );
              }
            }
          }
          setStreamedList(data);
        }
      } catch (error) {
        console.error("Failed to fetch media list:", error);
      }
    }

    fetchMedia();

    return () => {
      isMounted = false;
    };
  }, [limit, offset]);

  return streamedList.length > 0 ? streamedList : [];
}
