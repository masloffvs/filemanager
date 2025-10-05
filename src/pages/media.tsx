import MediaVideoCard from "@/ui/MediaVideoCard";
import useMedialist, { type MediaEntry } from "../hooks/useMedialist";
import { useState } from "react";
import VideoView from "@/ui/VideoView";

export default function MediaPage() {
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const mediaList = useMedialist(limit, offset);

  const [selectedMedia, setSelectedMedia] = useState<MediaEntry | null>(null);

  return (
    <div>
      {selectedMedia && (
        <VideoView
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {mediaList
          .filter((media) => media.videoEntry) // Only show entries with video metadata
          .map((media) => (
            <MediaVideoCard
              key={media.id}
              media={media}
              onClick={setSelectedMedia}
            />
          ))}
      </div>
    </div>
  );
}
