import { logger } from "@/logger";
import type { Entry } from "../ui/types";
import { useState, useEffect } from "react";

const metadataCache = new Map<string, Record<string, any>>();

export default function useFileMetadata(
  file: Entry | null
): Record<string, any> | undefined {
  if (typeof window === "undefined") return undefined;

  const [allMetadata, setAllMetadata] = useState<
    Record<string, any> | undefined
  >(undefined);

  useEffect(() => {
    let isMounted = true;
    async function fetchMetadata() {
      if (file && file.id) {
        if (metadataCache.has(file.id)) {
          if (process.env.NODE_ENV === "development") {
            logger.info(`Using cached metadata for file ID: ${file.id}`);
          }
          setAllMetadata(metadataCache.get(file.id));
          return;
        }
        try {
          const res = await fetch(`/api/metadata?id=${file.id}`, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) throw new Error("Failed to fetch metadata");
          const data: Record<string, any> = await res.json();
          metadataCache.set(file.id, data); // Сохраняем в кеш
          if (isMounted) setAllMetadata(data);
        } catch (e) {
          console.error("Error fetching metadata:", e);
          if (isMounted) setAllMetadata(undefined);
        }
      } else {
        setAllMetadata(undefined);
      }
    }
    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, [file]);

  return allMetadata;
}
