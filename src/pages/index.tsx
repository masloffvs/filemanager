import React, { Suspense, useEffect, useState } from "react";
import type { Entry } from "../ui/types";
import type { SettingsTab, SortKey, SortOrder } from "../ui/SettingsModal";

const Breadcrumbs = React.lazy(() => import("../ui/Breadcrumbs"));
const FileEntry = React.lazy(() => import("../ui/FileEntry"));
const Pagination = React.lazy(() => import("../ui/Pagination"));
const SearchModal = React.lazy(() => import("../ui/SearchModal"));
const FileModal = React.lazy(() => import("../ui/FileModal"));
const MassPasswordModal = React.lazy(() => import("../ui/MassPasswordModal"));
const PreviewFile = React.lazy(() => import("../ui/PreviewFile"));
const FileActions = React.lazy(() => import("../ui/FileActions"));
const FileMetadata = React.lazy(() => import("../ui/FileMetadata"));

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[] | undefined>(undefined);
  // Состояние для массового выделения
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [parentId, setParentId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const PAGE_SIZE = 21;
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

  // preview
  const [previewFile, setPreviewFile] = useState<Entry | null>(null);

  // Mass password modal state
  const [massPasswordOpen, setMassPasswordOpen] = useState<boolean>(false);
  const [massPassword, setMassPassword] = useState<string>("");
  const [massPasswordBusy, setMassPasswordBusy] = useState<boolean>(false);
  const [massPasswordError, setMassPasswordError] = useState<string | null>(
    null
  );

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
    <>
      <div
        id="app-main-files-overview"
        className="w-full flex-grow flex-row flex h-full"
      >
        <div
          id="file-listing"
          className="flex-grow overflow-hidden w-full overflow-auto"
        >
          <div className="p-2 w-full">
            <div className="w-full h-10 justify-between items-center bg-gray-50 rounded overflow-hidden py-2 px-3 flex items-center dark:bg-dark-400">
              <Suspense fallback={null}>
                <Breadcrumbs
                  rootFolder={rootFolder}
                  currentPath={currentPath}
                  onNavigate={handleNavigate}
                />
              </Suspense>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>
          <div
            className="mx-auto rounded p-2 h-full flex flex-col"
            onClick={(e) => {
              // Сброс выделения при клике вне файлов
              if (e.target === e.currentTarget) {
                setMultiSelectedIds([]);
              }
            }}
          >
            {loading || entries === undefined ? (
              <div className="w-full py-8">
                <div className="flex flex-col items-center justify-center p-4 w-full">
                  <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mb-3 dark:border-gray-600 dark:border-t-gray-400"></div>
                  <p className="text-gray-500 text-sm dark:text-gray-400">
                    Loading...
                  </p>
                </div>
              </div>
            ) : sortedEntries.length === 0 ? (
              <div className="w-full">
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
              <ul className="w-full flex-grow space-y-1" role="list">
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
                          onContextMenu={handleOpen}
                          onClick={(it) => {
                            setPreviewFile(null);

                            if (it.type === "file") setPreviewFile(it);
                            else handleOpen(it);
                          }}
                        />
                      );
                    })}
                </Suspense>
              </ul>
            )}
          </div>
        </div>

        {previewFile !== undefined && previewFile !== null && (
          <div
            id="file-details"
            className="py-3 px-2 max-w-[300px] w-full bg-white h-full overflow-auto dark:bg-dark-700"
          >
            <div className="sticky top-0 bg-gray-50 p-2 mb-3 rounded-md dark:bg-dark-400 dark:border-dark-200">
              <div className="rounded-[4px] min-h-[200px] border border-gray-200 overflow-hidden bg-gray-100 mb-4 dark:bg-dark-500 dark:border-dark-300">
                {previewFile ? <PreviewFile file={previewFile} /> : null}
              </div>

              <FileMetadata file={previewFile} />

              <FileActions file={previewFile} />
            </div>
          </div>
        )}
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
    </>
  );
}
