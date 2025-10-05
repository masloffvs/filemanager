import type { Entry } from "./types";

export default function FileActions({ file }: { file: Entry | null }) {
  if (!file) return null;

  const actions = [];

  if (file.type === "file") {
    actions.push(
      <button
        key="download"
        aria-label="Download file"
        className="px-3 w-full cursor-pointer py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-200"
        onClick={() => {
          window.location.href = `/api/download?id=${file.id}`;
        }}
      >
        Download
      </button>
    );
  }

  return <div className="flex space-y-1">{actions}</div>;
}
