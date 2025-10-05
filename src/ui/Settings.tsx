import { lazy } from "react";
import { useEffect, useState } from "react";
import type { SettingsTab, SortKey, SortOrder } from "./SettingsModal";

const SettingsModal = lazy(() => import("./SettingsModal"));

interface SettingsProps {
  setSettingsOpen: (open: boolean) => void;
}

export default function Settings({ setSettingsOpen }: SettingsProps) {
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

  // Local copy of sort prefs for runtime sorting
  const [runtimeFolderSort, setRuntimeFolderSort] = useState<{
    key: SortKey;
    order: SortOrder;
  }>({ key: "name", order: "asc" });
  const [runtimeFileSort, setRuntimeFileSort] = useState<{
    key: SortKey;
    order: SortOrder;
  }>({ key: "name", order: "asc" });
  const [rootFolder, setRootFolder] = useState<string>("/");
  const [currentPath, setCurrentPath] = useState<string>("/");

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

  return (
    <SettingsModal
      isOpen={true}
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
  );
}
