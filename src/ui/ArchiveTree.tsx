import React from "react";
import { humanSize } from "./types";

type ArchiveItem = {
  path: string;
  size: number;
  compressedSize: number;
  isDir: boolean;
};
type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  children?: Map<string, TreeNode>;
};

interface ArchiveTreeProps {
  items: ArchiveItem[];
  expanded: Record<string, boolean>;
  onToggleExpanded: (path: string) => void;
}

export function ArchiveTree({
  items,
  expanded,
  onToggleExpanded,
}: ArchiveTreeProps) {
  const buildTree = (items: ArchiveItem[]): TreeNode => {
    const root: TreeNode = {
      name: "",
      path: "",
      isDir: true,
      children: new Map(),
    };
    for (const it of items) {
      const parts = it.path
        .replace(/\\/g, "/")
        .split("/")
        .filter((p): p is string => typeof p === "string" && Boolean(p));
      let cur = root;
      for (let i = 0; i < parts.length; i++) {
        const seg = parts[i];
        if (!seg) continue;
        const isLast = i === parts.length - 1;
        const childPath = (cur.path ? cur.path + "/" : "") + seg;
        if (!cur.children) cur.children = new Map();
        let child = cur.children.get(seg);
        if (!child) {
          child = {
            name: seg,
            path: childPath,
            isDir: isLast ? it.isDir : true,
            size: isLast && !it.isDir ? it.size : undefined,
            children: isLast && !it.isDir ? undefined : new Map(),
          };
          cur.children.set(seg, child);
        } else if (isLast && !it.isDir) {
          child.isDir = false;
          child.size = it.size;
        }
        cur = child;
      }
    }
    return root;
  };

  const TreeNodeComponent: React.FC<{ node: TreeNode; depth?: number }> = ({
    node,
    depth = 0,
  }) => {
    if (!node.children || node.children.size === 0) return null;
    const entries = Array.from(node.children.values()).sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return (
      <ul>
        {entries.map((n) => {
          const hasKids = !!(n.children && n.children.size > 0);
          const isExpanded = expanded[n.path] ?? true;
          return (
            <li key={n.path} className="px-3 py-0.5">
              <div className="flex items-center">
                <span
                  className={`inline-block`}
                  style={{ width: `${depth * 12}px` }}
                />
                {hasKids ? (
                  <button
                    className="mr-1 text-gray-600"
                    onClick={() => onToggleExpanded(n.path)}
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? "▼" : "▶"}
                  </button>
                ) : (
                  <span className="mr-1 text-gray-400">•</span>
                )}
                <span className="mr-2 text-gray-500">
                  {n.isDir ? "📁" : "📄"}
                </span>
                <span className="truncate flex-1">{n.name}</span>
                {!n.isDir && (
                  <span className="ml-2 text-gray-400 tabular-nums">
                    {humanSize(n.size || 0)}
                  </span>
                )}
              </div>
              {hasKids && isExpanded && (
                <TreeNodeComponent node={n} depth={depth + 1} />
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const tree = buildTree(items);
  return <TreeNodeComponent node={tree} />;
}
