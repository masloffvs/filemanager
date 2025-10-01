import React from "react";

interface BreadcrumbsProps {
  rootFolder: string;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumbs({
  rootFolder,
  currentPath,
  onNavigate,
}: BreadcrumbsProps) {
  // Remove rootFolder prefix from display
  let displayPath = currentPath;
  if (rootFolder !== "/" && displayPath.startsWith(rootFolder)) {
    displayPath = displayPath.slice(rootFolder.length);
    if (!displayPath.startsWith("/")) displayPath = "/" + displayPath;
  }
  const segments = displayPath.split("/").filter((s) => s.length > 0);

  const handleBreadcrumb = (idx: number) => {
    const relativePath =
      "/" +
      segments
        .slice(0, idx + 1)
        .filter(Boolean)
        .join("/");
    // Convert relative path back to absolute path
    const absolutePath =
      rootFolder === "/" ? relativePath : rootFolder + relativePath;
    onNavigate(absolutePath);
  };

  return (
    <div className="flex items-center mb-1 flex-wrap gap-1">
      <span
        className="text-gray-700 hover:underline hover:text-gray-900 cursor-pointer text-xs"
        onClick={() => onNavigate(rootFolder)}
      >
        root
      </span>
      {segments.map((seg, idx) => (
        <React.Fragment key={idx}>
          <span className="text-gray-400 text-xs">/</span>
          <span
            className="text-gray-700 hover:underline hover:text-gray-900 cursor-pointer text-xs"
            onClick={() => handleBreadcrumb(idx)}
          >
            {seg}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
