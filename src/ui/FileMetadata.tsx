import { use, useEffect, useMemo } from "react";
import type { Entry } from "./types";
import { useState } from "react";
import useFileMetadata from "@/hooks/useFileMetadata";

interface HumanMetadataValues {
  [key: string]: string | null | undefined;
}

interface FileMetadataFetched {
  [key: string]: string | number | null | undefined | HumanMetadataValues;
  human: HumanMetadataValues;
}

export default function FileMetadata({ file }: { file: Entry | null }) {
  const allMetadata = useFileMetadata(file);

  const humanMetadata: HumanMetadataValues | null = useMemo(() => {
    if (!allMetadata) return null;
    if ("human" in allMetadata && typeof allMetadata.human === "object") {
      return allMetadata.human as HumanMetadataValues;
    }
    return null;
  }, [allMetadata]);

  const metaDataArray: [string, string][] = useMemo(() => {
    if (!file) return [];
    const data: [string, string][] = [];
    let filePath = file.fullPath || "unknown";
    if (filePath.startsWith("/")) filePath = filePath.slice(1);
    if (filePath === "") filePath = "/";

    const fileName = filePath.split("/").filter(Boolean).pop() || "/";
    if (fileName !== "/") filePath = filePath.replace(/\/?[^\/]*$/, "") || "/";

    data.push(["Name", fileName]);

    if (file?.isPasswordProtected) data.push(["Password Protected", "Yes"]);
    if (file.comment) data.push(["Comment", file.comment]);
    if (file.tags && file.tags.length > 0)
      data.push(["Tags", file.tags.map((tag) => `#${tag}`).join(", ")]);

    if (file.id) data.push(["ID", file.id]);
    return data;
  }, [file]);

  return (
    <ul className="space-y-1">
      {metaDataArray.map(([label, value]) => (
        <li
          key={label}
          className="flex justify-between text-xs text-gray-600 mb-1 bg-white px-1.5 py-0.5 rounded dark:bg-dark-300 dark:text-gray-300"
        >
          <span className="text-left">{label}</span>
          <span className="text-right font-mono">{value}</span>
        </li>
      ))}

      <li className="h-2" id="file-metadata-separator"></li>

      {humanMetadata &&
        Object.keys(humanMetadata).length > 0 &&
        Object.entries(humanMetadata).map(([key, value]) => {
          if (value === null || value === undefined) return null;
          const label = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());
          return (
            <li
              key={key}
              className="flex justify-between text-xs text-gray-600 mb-1 bg-white px-1.5 py-0.5 rounded dark:bg-dark-300 dark:text-gray-300"
            >
              <span className="text-left">{label}</span>
              <span className="text-right font-mono">{value}</span>
            </li>
          );
        })}
    </ul>
  );
}
