import React from "react";
import type { Entry } from "./types";
import { getFileIcon } from "./FileIconUtils";
import { humanSize } from "./types";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  results: Entry[];
  loading: boolean;
  error: string | null;
  tags: Array<{ tag: string; count: number }>;
  tagsLoading: boolean;
  onSelectEntry: (entry: Entry) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  query,
  onQueryChange,
  onSearch,
  results,
  loading,
  error,
  tags,
  tagsLoading,
  onSelectEntry,
}: SearchModalProps) {
  const finderInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => finderInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-start justify-center p-4 z-40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded shadow-lg w-full max-w-xl p-3 mt-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 items-center">
          <input
            ref={finderInputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
            className="flex-1 border rounded px-2 py-1 text-sm"
            placeholder="Search files/folders by name, path, comment, tags"
          />
          <button
            className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            onClick={onSearch}
          >
            Find
          </button>
        </div>
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        <div className="mt-2">
          <div className="text-[11px] text-gray-500 mb-1">Suggested tags</div>
          <div className="flex flex-wrap gap-1">
            {tagsLoading && (
              <span className="text-[11px] text-gray-400">Loading…</span>
            )}
            {!tagsLoading && tags.length === 0 && (
              <span className="text-[11px] text-gray-400">No tags yet</span>
            )}
            {!tagsLoading &&
              tags.map(({ tag, count }) => {
                // simple sizing from count
                const sizeClass =
                  count > 20
                    ? "text-sm"
                    : count > 10
                    ? "text-[13px]"
                    : "text-[11px]";
                return (
                  <button
                    key={tag}
                    className={`px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-700 ${sizeClass}`}
                    onClick={() => {
                      onQueryChange(tag);
                      setTimeout(() => onSearch(), 0);
                    }}
                    title={`${tag} (${count})`}
                  >
                    #{tag}
                  </button>
                );
              })}
          </div>
        </div>
        <ul className="mt-2 max-h-[60vh] overflow-auto divide-y divide-gray-100">
          {loading && (
            <li className="py-2 text-xs text-gray-500">Searching…</li>
          )}
          {!loading && results.length === 0 && query && (
            <li className="py-2 text-xs text-gray-500">No results</li>
          )}
          {results.map((e) => (
            <li
              key={e.id}
              className={`flex items-center gap-2 py-1 px-1 hover:bg-gray-50 ${
                e.type === "folder" ? "cursor-pointer" : "cursor-pointer"
              }`}
              onClick={() => {
                onClose();
                onSelectEntry(e);
              }}
            >
              {getFileIcon(e)}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">
                  {e.fullPath.split("/").filter(Boolean).pop() || "/"}
                </div>
                <div className="truncate text-[11px] text-gray-500">
                  {e.fullPath}
                </div>
              </div>
              {e.size !== null && (
                <div className="text-[11px] text-gray-500 w-16 text-right tabular-nums">
                  {humanSize(e.size)}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
