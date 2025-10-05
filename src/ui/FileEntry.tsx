import React from "react";
import type { Entry } from "./types";
import { getFileIcon } from "./FileIconUtils";
import { humanSize } from "./types";

interface FileEntryProps {
  entry: Entry;
  isGroupStart?: boolean;
  isMultiSelected?: boolean;
  onClick: (entry: Entry, event?: React.MouseEvent) => void;
  onContextMenu: (entry: Entry, event: React.MouseEvent) => void;
}

export default function FileEntry({
  entry,
  isGroupStart = false,
  isMultiSelected = false,
  onClick,
  onContextMenu,
}: FileEntryProps) {
  return (
    <li
      className={`flex cursor-pointer items-center rounded-sm py-1 px-1 hover:bg-gray-50 dark:hover:bg-dark-300 transition ${
        entry.type === "folder" ? "cursor-pointer" : "cursor-default"
      } ${isGroupStart ? "mt-2" : ""} ${
        isMultiSelected ? "bg-blue-100 dark:bg-blue-200" : ""
      }`}
      onClick={(e) => onClick(entry, e)}
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
      <div className="flex items-center ml-2 space-x-3">
        {entry.size !== null && (
          <span className="ml-2 text-xs text-gray-500 w-16 text-right tabular-nums">
            {humanSize(entry.size)}
          </span>
        )}
        <button
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded dark:hover:bg-dark-300 dark:hover:text-gray-200 cursor-pointer dark:hover:bg-dark-400 dark:focus:outline-dark-100"
          title="More actions"
          aria-label="More actions"
          onClick={(e) => {
            e.preventDefault();
            onContextMenu ? onContextMenu(entry, e) : null;
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-4"
          >
            <path d="M2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
          </svg>
        </button>
      </div>
    </li>
  );
}
