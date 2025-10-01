import "./index.css";
import React, { useEffect, useState, lazy, Suspense } from "react";
import type { Entry } from "./ui/types";

const Breadcrumbs = lazy(() => import("./ui/Breadcrumbs"));
const FileEntry = lazy(() => import("./ui/FileEntry"));
const Pagination = lazy(() => import("./ui/Pagination"));
const SearchModal = lazy(() => import("./ui/SearchModal"));
const SettingsModal = lazy(() => import("./ui/SettingsModal"));
const FileModal = lazy(() => import("./ui/FileModal"));
const MassPasswordModal = lazy(() => import("./ui/MassPasswordModal"));

import type { SettingsTab, SortKey, SortOrder } from "./ui/SettingsModal";

export function App() {
  const [entries, setEntries] = useState<Entry[] | undefined>(undefined);
  // Состояние для массового выделения
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [parentId, setParentId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const PAGE_SIZE = 20;
  const [rootFolder, setRootFolder] = useState<string>("/");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [tagsDraft, setTagsDraft] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finderOpen, setFinderOpen] = useState<boolean>(false);
  const [finderQuery, setFinderQuery] = useState<string>("");
  const [finderResults, setFinderResults] = useState<Entry[]>([]);
  const [finderLoading, setFinderLoading] = useState<boolean>(false);
  const [finderError, setFinderError] = useState<string | null>(null);
  const [finderTags, setFinderTags] = useState<
    Array<{ tag: string; count: number }>
  >([]);
  const [finderTagsLoading, setFinderTagsLoading] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [cfgRoot, setCfgRoot] = useState<string>("");
  const [cfgInterval, setCfgInterval] = useState<number>(10);
  const [cfgBusy, setCfgBusy] = useState<boolean>(false);
  const [cfgMsg, setCfgMsg] = useState<string | null>(null);
  const [cfgServerHost, setCfgServerHost] = useState<string>("127.0.0.1");
  const [cfgServerPort, setCfgServerPort] = useState<number>(3000);
  const [cfgFolderSortKey, setCfgFolderSortKey] = useState<SortKey>("name");
  const [cfgFolderSortOrder, setCfgFolderSortOrder] =
    useState<SortOrder>("asc");
  const [cfgFileSortKey, setCfgFileSortKey] = useState<SortKey>("name");
  const [cfgFileSortOrder, setCfgFileSortOrder] = useState<SortOrder>("asc");
  const [autoMode, setAutoMode] = useState<"merge" | "missing" | "replace">(
    "merge"
  );
  const [autoType, setAutoType] = useState<"" | "file" | "folder" | "link">("");
  const [autoPrefix, setAutoPrefix] = useState<string>("");
  const [autoDryRun, setAutoDryRun] = useState<boolean>(true);
  const [autoBusy, setAutoBusy] = useState<boolean>(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);
  const [reloadBusy, setReloadBusy] = useState<boolean>(false);
  const [reloadMsg, setReloadMsg] = useState<string | null>(null);

  // Mass password modal state
  const [massPasswordOpen, setMassPasswordOpen] = useState<boolean>(false);
  const [massPassword, setMassPassword] = useState<string>("");
  const [massPasswordBusy, setMassPasswordBusy] = useState<boolean>(false);
  const [massPasswordError, setMassPasswordError] = useState<string | null>(
    null
  );

  // Local copy of sort prefs for runtime sorting
  const [runtimeFolderSort, setRuntimeFolderSort] = useState<{
    key: SortKey;
    order: SortOrder;
  }>({ key: "name", order: "asc" });
  const [runtimeFileSort, setRuntimeFileSort] = useState<{
    key: SortKey;
    order: SortOrder;
  }>({ key: "name", order: "asc" });

  // Helper functions to convert between relative URL paths and absolute file paths
  const toRelativePath = (absolutePath: string): string => {
    if (!rootFolder || rootFolder === "/") return absolutePath;
    if (absolutePath.startsWith(rootFolder)) {
      const relative = absolutePath.slice(rootFolder.length);
      return relative.startsWith("/") ? relative : "/" + relative;
    }
    return absolutePath;
  };

  const toAbsolutePath = (relativePath: string): string => {
    if (!rootFolder || rootFolder === "/" || relativePath === "/") {
      return relativePath === "/" ? rootFolder : relativePath;
    }
    if (relativePath.startsWith("/")) {
      return rootFolder + relativePath;
    }
    return rootFolder + "/" + relativePath;
  };

  // Get root folder from env or DB on mount
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg && typeof cfg.indexRootPath === "string") {
          const resolved =
            typeof cfg.resolvedIndexRootPath === "string" &&
            cfg.resolvedIndexRootPath
              ? cfg.resolvedIndexRootPath
              : cfg.indexRootPath;
          setRootFolder(resolved || "/");
          // Use current pathname as relative path, convert to absolute for internal use
          const relativePath = window.location.pathname || "/";
          const absolutePath = resolved
            ? resolved + (relativePath === "/" ? "" : relativePath)
            : relativePath;
          setCurrentPath(absolutePath);
          if (cfg.folderSort)
            setRuntimeFolderSort({
              key: cfg.folderSort.key || "name",
              order: cfg.folderSort.order || "asc",
            });
          if (cfg.fileSort)
            setRuntimeFileSort({
              key: cfg.fileSort.key || "name",
              order: cfg.fileSort.order || "asc",
            });
        }
      })
      .catch(() => {
        const fallback = "/";
        setRootFolder(fallback);
      });
  }, []);

  useEffect(() => {
    setPage(0); // Reset page on path change
  }, [currentPath]);

  useEffect(() => {
    setLoading(true);
    let url = `/api/getSliceByIdOrPath?path=${encodeURIComponent(currentPath)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setEntries([]);
          setParentId(null);
          return;
        }
        setEntries(data);
        if (data.length > 0) {
          setParentId(data[0].parentId);
        }
      })
      .catch(() => {
        setEntries([]);
        setParentId(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentPath]);

  // Sorting helpers
  const sortName = (e: Entry) =>
    (e.fullPath.split("/").filter(Boolean).pop() || "").toLowerCase();
  const sortSize = (e: Entry) => Number(e.size ?? 0);
  const toTime = (s?: string | null) => (s ? Date.parse(s) || 0 : 0);
  const sortModified = (e: Entry) => toTime(e.meta?.lastModified);
  const sortCreated = (e: Entry) => toTime(e.meta?.created);

  const sortedEntries = React.useMemo(() => {
    if (!entries) return [];

    const folders = entries.filter((e) => e.type === "folder");
    const rest = entries.filter((e) => e.type !== "folder");

    const sortBySpec = (
      arr: Entry[],
      spec: { key: SortKey; order: SortOrder }
    ) => {
      const keyFn =
        spec.key === "name"
          ? sortName
          : spec.key === "size"
          ? sortSize
          : spec.key === "modified"
          ? sortModified
          : sortCreated;
      const mul = spec.order === "asc" ? 1 : -1;
      arr.sort((a, b) => {
        const av = keyFn(a);
        const bv = keyFn(b);
        if (av < bv) return -1 * mul;
        if (av > bv) return 1 * mul;
        // tie-breaker: by name asc
        const an = sortName(a);
        const bn = sortName(b);
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    };

    sortBySpec(folders, runtimeFolderSort);
    sortBySpec(rest, runtimeFileSort);
    return [...folders, ...rest];
  }, [entries, runtimeFolderSort, runtimeFileSort]);

  // Обработка клика по файлу с поддержкой Ctrl/Shift
  const handleOpen = (entry: Entry, event?: React.MouseEvent) => {
    if (event && (event.ctrlKey || event.metaKey)) {
      setMultiSelectedIds((prev) => {
        if (prev.includes(entry.id)) {
          return prev.filter((id) => id !== entry.id);
        } else {
          return [...prev, entry.id];
        }
      });
      return;
    }
    if (entry.type === "folder") {
      const relativePath = toRelativePath(entry.fullPath);
      window.history.pushState({}, "", relativePath);
      setCurrentPath(entry.fullPath);
      setMultiSelectedIds([]);
    } else if (entry.type === "file") {
      setSelected(entry);
      setMultiSelectedIds([]);
      const isImg = !!entry.mimeType && /^image\//.test(entry.mimeType);
      const isVideo = !!entry.mimeType && /^video\//.test(entry.mimeType);
      setShowPreview(isImg || isVideo);
    }
  };

  const handleNavigate = (path: string) => {
    const relativePath = toRelativePath(path);
    window.history.pushState({}, "", relativePath);
    setCurrentPath(path);
  };

  // Browser navigation
  React.useEffect(() => {
    const onPopState = () => {
      const relativePath = window.location.pathname || "/";
      const absolutePath = toAbsolutePath(relativePath);
      setCurrentPath(absolutePath);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [rootFolder]);

  // Populate drafts when opening modal
  useEffect(() => {
    if (selected) {
      setCommentDraft(selected.comment || "");
      setTagsDraft(
        Array.isArray(selected.tags) ? selected.tags.join(", ") : ""
      );
      setSaveError(null);
    }
  }, [selected]);

  // Hotkeys: Escape (close), Cmd/Ctrl+F (finder), Cmd/Ctrl+Z (settings)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selected) {
          setSelected(null);
          return;
        }
        if (finderOpen) {
          setFinderOpen(false);
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        const target = e.target as HTMLElement | null;
        const tag = (target?.tagName || "").toUpperCase();
        const inEditable =
          tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
        if (!inEditable || !finderOpen) {
          e.preventDefault();
          setFinderOpen(true);
          setFinderQuery("");
          setFinderResults([]);
          setFinderError(null);
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        const target = e.target as HTMLElement | null;
        const tag = (target?.tagName || "").toUpperCase();
        const inEditable =
          tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
        if (!inEditable || settingsOpen) {
          e.preventDefault();
          setSettingsOpen(true);
        }
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "l"
      ) {
        const target = e.target as HTMLElement | null;
        const tag = (target?.tagName || "").toUpperCase();
        const inEditable =
          tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;

        if (!inEditable && multiSelectedIds.length > 0) {
          e.preventDefault();
          setMassPasswordOpen(true);
          setMassPassword("");
          setMassPasswordError(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, finderOpen, settingsOpen, multiSelectedIds]);

  const runSearch = async () => {
    const q = finderQuery.trim();
    if (!q) {
      setFinderResults([]);
      return;
    }
    try {
      setFinderLoading(true);
      setFinderError(null);
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=100`
      );
      if (!res.ok) throw new Error(await res.text());
      const items: Entry[] = await res.json();
      setFinderResults(items);
    } catch (err: any) {
      setFinderError(String(err?.message || err));
    } finally {
      setFinderLoading(false);
    }
  };

  // Load tag cloud when finder opens
  useEffect(() => {
    let abort = false;
    const load = async () => {
      try {
        setFinderTagsLoading(true);
        const res = await fetch(`/api/tags?limit=50`);
        if (!res.ok) throw new Error(await res.text());
        const items: Array<{ tag: string; count: number }> = await res.json();
        if (!abort) setFinderTags(items);
      } catch {
        if (!abort) setFinderTags([]);
      } finally {
        if (!abort) setFinderTagsLoading(false);
      }
    };
    if (finderOpen) load();
    return () => {
      abort = true;
    };
  }, [finderOpen]);

  // Load config when settings open
  useEffect(() => {
    if (!settingsOpen) return;
    (async () => {
      try {
        const res = await fetch("/api/config");
        if (!res.ok) return;
        const c = await res.json();
        if (typeof c.indexRootPath === "string") setCfgRoot(c.indexRootPath);
        if (Number.isFinite(Number(c.reindexIntervalSec)))
          setCfgInterval(Number(c.reindexIntervalSec));
        if (typeof c.serverHost === "string") setCfgServerHost(c.serverHost);
        if (Number.isFinite(Number(c.serverPort)))
          setCfgServerPort(Number(c.serverPort));
        if (c.folderSort) {
          if (c.folderSort.key) setCfgFolderSortKey(c.folderSort.key);
          if (c.folderSort.order) setCfgFolderSortOrder(c.folderSort.order);
        }
        if (c.fileSort) {
          if (c.fileSort.key) setCfgFileSortKey(c.fileSort.key);
          if (c.fileSort.order) setCfgFileSortOrder(c.fileSort.order);
        }
      } catch {}
    })();
  }, [settingsOpen]);

  const handleSelectEntry = (entry: Entry, event?: React.MouseEvent) => {
    if (event && (event.ctrlKey || event.metaKey)) {
      setMultiSelectedIds((prev) => {
        if (prev.includes(entry.id)) {
          return prev.filter((id) => id !== entry.id);
        } else {
          return [...prev, entry.id];
        }
      });
      return;
    }
    if (entry.type === "folder") {
      handleNavigate(entry.fullPath);
      setMultiSelectedIds([]);
    } else {
      setSelected(entry);
      setMultiSelectedIds([]);
      const isImg = !!entry.mimeType && /^image\//.test(entry.mimeType);
      const isVideo = !!entry.mimeType && /^video\//.test(entry.mimeType);
      setShowPreview(isImg || isVideo);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      setSaveError(null);
      const res = await fetch("/api/updateEntry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          comment: commentDraft,
          tags: tagsDraft,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: Entry = await res.json();
      setSelected(updated);
      setEntries((prev) =>
        prev
          ? prev.map((e) =>
              e.id === updated.id
                ? { ...e, comment: updated.comment, tags: updated.tags }
                : e
            )
          : prev
      );
    } catch (err: any) {
      setSaveError(String(err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  // Settings handlers
  const handleSaveGeneral = async () => {
    try {
      setCfgBusy(true);
      setCfgMsg(null);
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indexRootPath: cfgRoot,
          reindexIntervalSec: cfgInterval,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));
      setCfgMsg("Saved");
      if (json && typeof json.indexRootPath === "string") {
        setRootFolder(json.indexRootPath || "/");
      }
    } catch (err: any) {
      setCfgMsg("Save failed: " + String(err?.message || err));
    } finally {
      setCfgBusy(false);
    }
  };

  const handleSaveServer = async () => {
    try {
      const body = { serverHost: cfgServerHost, serverPort: cfgServerPort };
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(j));
      const needs = !!j.requiresRestart;
      const nextUrl = `${window.location.protocol}//${
        cfgServerHost || window.location.hostname
      }:${cfgServerPort}/`;
      setCfgMsg(
        needs ? `Saved. Server will need restart. Open: ${nextUrl}` : "Saved"
      );
    } catch (err: any) {
      setCfgMsg("Save failed: " + String(err?.message || err));
    }
  };

  const handleSaveSorting = async () => {
    try {
      const body = {
        folderSort: { key: cfgFolderSortKey, order: cfgFolderSortOrder },
        fileSort: { key: cfgFileSortKey, order: cfgFileSortOrder },
      };
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(j));
      setRuntimeFolderSort({
        key: cfgFolderSortKey,
        order: cfgFolderSortOrder,
      });
      setRuntimeFileSort({ key: cfgFileSortKey, order: cfgFileSortOrder });
    } catch {}
  };

  const handleReloadRules = async () => {
    try {
      setReloadBusy(true);
      setReloadMsg(null);
      const res = await fetch("/api/reloadAutotags");
      if (!res.ok) throw new Error(await res.text());
      setReloadMsg("Rules reloaded");
    } catch (err: any) {
      setReloadMsg("Reload failed: " + String(err?.message || err));
    } finally {
      setReloadBusy(false);
    }
  };

  const handleApplyAutoTags = async () => {
    try {
      setAutoBusy(true);
      setAutoMsg(null);
      const params = new URLSearchParams();
      params.set("mode", autoMode);
      if (autoType) params.set("type", autoType);
      if (autoPrefix) params.set("pathPrefix", autoPrefix);
      params.set("dry", String(autoDryRun));
      const res = await fetch(`/api/applyAutotags?${params.toString()}`);
      const txt = await res.text();
      if (!res.ok) throw new Error(txt);
      setAutoMsg(txt);
    } catch (err: any) {
      setAutoMsg("Apply failed: " + String(err?.message || err));
    } finally {
      setAutoBusy(false);
    }
  };

  const handleSetMassPassword = async () => {
    if (!massPassword.trim() || multiSelectedIds.length === 0) return;

    try {
      setMassPasswordBusy(true);
      setMassPasswordError(null);

      // Get entries to process
      const filesToProcess =
        entries?.filter((e) => multiSelectedIds.includes(e.id)) || [];

      // Process each file sequentially
      let successCount = 0;
      let errorCount = 0;

      for (const file of filesToProcess) {
        try {
          const res = await fetch("/api/filePassword", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: file.id,
              password: massPassword,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to set password");
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to set password for ${file.fullPath}:`, err);
          errorCount++;
        }
      }

      // Update entries to show password protection for successful ones
      setEntries((prev) =>
        prev
          ? prev.map((e) =>
              multiSelectedIds.includes(e.id)
                ? { ...e, isPasswordProtected: true }
                : e
            )
          : prev
      );

      if (errorCount > 0) {
        setMassPasswordError(
          `${successCount} files protected, ${errorCount} failed`
        );
      }

      if (successCount > 0) {
        setMassPasswordOpen(false);
        setMultiSelectedIds([]);
        setMassPassword("");
      }
    } catch (err: any) {
      setMassPasswordError(String(err?.message || err));
    } finally {
      setMassPasswordBusy(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(sortedEntries.length / PAGE_SIZE);

  return (
    <div
      className="flex items-start justify-center min-h-screen bg-white py-8"
      style={{ paddingTop: 32, paddingBottom: 32 }}
    >
      <div
        className="mx-auto rounded p-2"
        style={{
          width: "80vw",
          maxWidth: 480,
          minWidth: 0,
          background: "white",
        }}
        onClick={(e) => {
          // Сброс выделения при клике вне файлов
          if (e.target === e.currentTarget) {
            setMultiSelectedIds([]);
          }
        }}
      >
        <Suspense fallback={null}>
          <Breadcrumbs
            rootFolder={rootFolder}
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />
        </Suspense>

        {loading || entries === undefined ? (
          <div className="w-full py-8">
            <div className="flex flex-col items-center justify-center p-4 w-full">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mb-3"></div>
              <p className="text-gray-500 text-sm">Loading...</p>
            </div>
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="w-full py-8">
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl w-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-4 text-gray-400 mb-3"
              >
                <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 1 1 0 4H4a2 2 0 0 1-2-2ZM2 9.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.25ZM2.75 12.5a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75Z" />
              </svg>
              <p className="text-gray-500 text-sm font-medium">
                This folder is empty
              </p>
              <p className="text-gray-400 text-xs mt-0">
                No files or folders found
              </p>
            </div>
          </div>
        ) : (
          <ul>
            <Suspense fallback={null}>
              {sortedEntries
                .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                .map((e, idx, arr) => {
                  const previousEntry = arr[idx - 1];
                  const isGroupStart =
                    idx > 0 &&
                    e.type !== "folder" &&
                    previousEntry &&
                    previousEntry.type === "folder";
                  const isMultiSelected = multiSelectedIds.includes(e.id);
                  return (
                    <FileEntry
                      key={e.id}
                      entry={e}
                      isGroupStart={isGroupStart}
                      isMultiSelected={isMultiSelected}
                      onClick={handleOpen}
                    />
                  );
                })}
            </Suspense>
          </ul>
        )}

        <Suspense fallback={null}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <SearchModal
          isOpen={finderOpen}
          onClose={() => setFinderOpen(false)}
          query={finderQuery}
          onQueryChange={setFinderQuery}
          onSearch={runSearch}
          results={finderResults}
          loading={finderLoading}
          error={finderError}
          tags={finderTags}
          tagsLoading={finderTagsLoading}
          onSelectEntry={handleSelectEntry}
        />
      </Suspense>

      <Suspense fallback={null}>
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          activeTab={settingsTab}
          onTabChange={setSettingsTab}
          cfgRoot={cfgRoot}
          setCfgRoot={setCfgRoot}
          cfgInterval={cfgInterval}
          setCfgInterval={setCfgInterval}
          cfgBusy={cfgBusy}
          cfgMsg={cfgMsg}
          onSaveGeneral={handleSaveGeneral}
          cfgServerHost={cfgServerHost}
          setCfgServerHost={setCfgServerHost}
          cfgServerPort={cfgServerPort}
          setCfgServerPort={setCfgServerPort}
          onSaveServer={handleSaveServer}
          cfgFolderSortKey={cfgFolderSortKey}
          setCfgFolderSortKey={setCfgFolderSortKey}
          cfgFolderSortOrder={cfgFolderSortOrder}
          setCfgFolderSortOrder={setCfgFolderSortOrder}
          cfgFileSortKey={cfgFileSortKey}
          setCfgFileSortKey={setCfgFileSortKey}
          cfgFileSortOrder={cfgFileSortOrder}
          setCfgFileSortOrder={setCfgFileSortOrder}
          onSaveSorting={handleSaveSorting}
          autoMode={autoMode}
          setAutoMode={setAutoMode}
          autoType={autoType}
          setAutoType={setAutoType}
          autoPrefix={autoPrefix}
          setAutoPrefix={setAutoPrefix}
          autoDryRun={autoDryRun}
          setAutoDryRun={setAutoDryRun}
          autoBusy={autoBusy}
          autoMsg={autoMsg}
          onApplyAutoTags={handleApplyAutoTags}
          reloadBusy={reloadBusy}
          reloadMsg={reloadMsg}
          onReloadRules={handleReloadRules}
        />
      </Suspense>

      <Suspense fallback={null}>
        <FileModal
          entry={selected}
          onClose={() => setSelected(null)}
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview((v) => !v)}
          commentDraft={commentDraft}
          onCommentChange={setCommentDraft}
          tagsDraft={tagsDraft}
          onTagsChange={setTagsDraft}
          saving={saving}
          saveError={saveError}
          onSave={handleSave}
        />
      </Suspense>

      <Suspense fallback={null}>
        <MassPasswordModal
          isOpen={massPasswordOpen}
          onClose={() => setMassPasswordOpen(false)}
          selectedCount={multiSelectedIds.length}
          password={massPassword}
          onPasswordChange={setMassPassword}
          onSave={handleSetMassPassword}
          saving={massPasswordBusy}
          error={massPasswordError}
        />
      </Suspense>

      <style>
        {`
          @media (max-width: 640px) {
            .container, .max-w-md, .mx-auto, .rounded, .p-4, .p-2 {
              width: 96vw !important;
              max-width: 100vw !important;
              padding-left: 0.5rem !important;
              padding-right: 0.5rem !important;
            }
          }
        `}
      </style>
    </div>
  );
}

export default App;
