import React from "react";
import type { Entry } from "./types";
import { getFileIcon } from "./FileIconUtils";
import { humanSize } from "./types";

interface FileEntryProps {
  entry: Entry;
  isGroupStart?: boolean;
  onClick: (entry: Entry) => void;
}

export default function FileEntry({
  entry,
  isGroupStart = false,
  onClick,
}: FileEntryProps) {
  return (
    <li
      className={`flex items-center py-1 px-1 hover:bg-gray-50 transition ${
        entry.type === "folder" ? "cursor-pointer" : "cursor-default"
      } ${isGroupStart ? "mt-2" : ""}`}
      onClick={() => onClick(entry)}
    >
      {getFileIcon(entry)}
      <span className="flex-1 truncate text-xs flex items-center gap-1">
        <span className="truncate">
          {entry.fullPath.split("/").filter(Boolean).pop() || "/"}
        </span>
        {entry.isPasswordProtected && (
          <div title="Password protected">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3 h-3 text-amber-600 flex-shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </span>
      {entry.size !== null && (
        <span className="ml-2 text-xs text-gray-500 w-16 text-right tabular-nums">
          {humanSize(entry.size)}
        </span>
      )}
    </li>
  );
}
