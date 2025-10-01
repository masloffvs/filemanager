import React from "react";

export type SettingsTab = "general" | "server" | "sorting" | "autotags";
export type SortKey = "name" | "size" | "modified" | "created";
export type SortOrder = "asc" | "desc";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;

  // General settings
  cfgRoot: string;
  setCfgRoot: (value: string) => void;
  cfgInterval: number;
  setCfgInterval: (value: number) => void;
  cfgBusy: boolean;
  cfgMsg: string | null;
  onSaveGeneral: () => Promise<void>;

  // Server settings
  cfgServerHost: string;
  setCfgServerHost: (value: string) => void;
  cfgServerPort: number;
  setCfgServerPort: (value: number) => void;
  onSaveServer: () => Promise<void>;

  // Sorting settings
  cfgFolderSortKey: SortKey;
  setCfgFolderSortKey: (value: SortKey) => void;
  cfgFolderSortOrder: SortOrder;
  setCfgFolderSortOrder: (value: SortOrder) => void;
  cfgFileSortKey: SortKey;
  setCfgFileSortKey: (value: SortKey) => void;
  cfgFileSortOrder: SortOrder;
  setCfgFileSortOrder: (value: SortOrder) => void;
  onSaveSorting: () => Promise<void>;

  // Auto-tags settings
  autoMode: "merge" | "missing" | "replace";
  setAutoMode: (value: "merge" | "missing" | "replace") => void;
  autoType: "" | "file" | "folder" | "link";
  setAutoType: (value: "" | "file" | "folder" | "link") => void;
  autoPrefix: string;
  setAutoPrefix: (value: string) => void;
  autoDryRun: boolean;
  setAutoDryRun: (value: boolean) => void;
  autoBusy: boolean;
  autoMsg: string | null;
  onApplyAutoTags: () => Promise<void>;
  reloadBusy: boolean;
  reloadMsg: string | null;
  onReloadRules: () => Promise<void>;
}

export default function SettingsModal(props: SettingsModalProps) {
  if (!props.isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-start justify-center p-4 z-50"
      onClick={props.onClose}
    >
      <div
        className="bg-white rounded shadow-lg w-full max-w-3xl p-4 mt-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          <div className="w-40 border-r border-gray-200 pr-2">
            <div className="text-xs font-medium text-gray-500 mb-2">
              Sections
            </div>
            <ul className="space-y-1">
              {(["general", "server", "sorting", "autotags"] as const).map(
                (tab) => (
                  <li key={tab}>
                    <button
                      className={`w-full text-left px-2 py-1 rounded text-xs ${
                        props.activeTab === tab
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => props.onTabChange(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  </li>
                )
              )}
            </ul>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Settings</div>
              <button
                className="text-gray-500 hover:text-gray-700 text-sm"
                onClick={props.onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {props.activeTab === "general" && <GeneralTab {...props} />}

            {props.activeTab === "server" && <ServerTab {...props} />}

            {props.activeTab === "sorting" && <SortingTab {...props} />}

            {props.activeTab === "autotags" && <AutotagsTab {...props} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneralTab(props: SettingsModalProps) {
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-600">Index root path</label>
        <input
          className="border rounded px-2 py-1 text-xs"
          value={props.cfgRoot}
          onChange={(e) => props.setCfgRoot(e.target.value)}
          placeholder="./ or /absolute/path"
        />
        <label className="text-xs text-gray-600">Reindex interval (sec)</label>
        <input
          placeholder="Minimum 1 second"
          type="number"
          min={1}
          className="border rounded px-2 py-1 text-xs"
          value={props.cfgInterval}
          onChange={(e) =>
            props.setCfgInterval(Math.max(1, Number(e.target.value) || 1))
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          disabled={props.cfgBusy}
          onClick={props.onSaveGeneral}
        >
          {props.cfgBusy ? "Saving…" : "Save"}
        </button>
        {props.cfgMsg && (
          <span className="text-[11px] text-gray-500">{props.cfgMsg}</span>
        )}
      </div>
    </div>
  );
}

function ServerTab(props: SettingsModalProps) {
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-600">Host</label>
        <input
          className="border rounded px-2 py-1 text-xs"
          value={props.cfgServerHost}
          onChange={(e) => props.setCfgServerHost(e.target.value)}
          placeholder="127.0.0.1 or 0.0.0.0"
        />
        <label className="text-xs text-gray-600">Port</label>
        <input
          placeholder="1-65535"
          type="number"
          min={1}
          className="border rounded px-2 py-1 text-xs"
          value={props.cfgServerPort}
          onChange={(e) =>
            props.setCfgServerPort(Math.max(1, Number(e.target.value) || 3000))
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
          onClick={props.onSaveServer}
        >
          Save
        </button>
        {props.cfgMsg && (
          <span className="text-[11px] text-gray-500 break-all">
            {props.cfgMsg}
          </span>
        )}
      </div>
      <div className="text-[11px] text-gray-500">
        Changing host/port requires restarting the server process or reloading
        the app with the new URL.
      </div>
    </div>
  );
}

function SortingTab(props: SettingsModalProps) {
  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs text-gray-500">Folders</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-600">Sort by</label>
        <select
          title="Select folder sort key"
          className="border rounded px-2 py-1 text-xs"
          value={props.cfgFolderSortKey}
          onChange={(e) => props.setCfgFolderSortKey(e.target.value as SortKey)}
        >
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="modified">Modified</option>
          <option value="created">Created</option>
        </select>
        <label className="text-xs text-gray-600">Order</label>
        <select
          title="Select folder sort order"
          className="border rounded px-2 py-1 text-xs"
          value={props.cfgFolderSortOrder}
          onChange={(e) =>
            props.setCfgFolderSortOrder(e.target.value as SortOrder)
          }
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <div className="text-xs text-gray-500 mt-4">Files</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-600">Sort by</label>
        <select
          title="Select file sort key"
          className="border rounded px-2 py-1 text-xs"
          value={props.cfgFileSortKey}
          onChange={(e) => props.setCfgFileSortKey(e.target.value as SortKey)}
        >
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="modified">Modified</option>
          <option value="created">Created</option>
        </select>
        <label className="text-xs text-gray-600">Order</label>
        <select
          title="Select file sort order"
          className="border rounded px-2 py-1 text-xs"
          value={props.cfgFileSortOrder}
          onChange={(e) =>
            props.setCfgFileSortOrder(e.target.value as SortOrder)
          }
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          onClick={props.onSaveSorting}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function AutotagsTab(props: SettingsModalProps) {
  return (
    <div className="mt-3">
      <div className="text-xs text-gray-500 mb-1">Auto-tags</div>
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          disabled={props.reloadBusy}
          onClick={props.onReloadRules}
        >
          {props.reloadBusy ? "Reloading…" : "Reload rules"}
        </button>
        {props.reloadMsg && (
          <span className="text-[11px] text-gray-500">{props.reloadMsg}</span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-xs text-gray-600 flex items-center gap-2">
          <span className="w-20">Mode</span>
          <select
            className="flex-1 border rounded px-2 py-1 text-xs"
            value={props.autoMode}
            onChange={(e) =>
              props.setAutoMode(e.target.value as typeof props.autoMode)
            }
          >
            <option value="merge">merge</option>
            <option value="missing">missing</option>
            <option value="replace">replace</option>
          </select>
        </label>
        <label className="text-xs text-gray-600 flex items-center gap-2">
          <span className="w-20">Type</span>
          <select
            className="flex-1 border rounded px-2 py-1 text-xs"
            value={props.autoType}
            onChange={(e) =>
              props.setAutoType(e.target.value as typeof props.autoType)
            }
          >
            <option value="">any</option>
            <option value="file">file</option>
            <option value="folder">folder</option>
            <option value="link">link</option>
          </select>
        </label>
        <label className="text-xs text-gray-600 flex items-center gap-2 sm:col-span-2">
          <span className="w-20">Path prefix</span>
          <input
            className="flex-1 border rounded px-2 py-1 text-xs"
            value={props.autoPrefix}
            onChange={(e) => props.setAutoPrefix(e.target.value)}
            placeholder="/absolute/path"
          />
        </label>
        <label className="text-xs text-gray-600 flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={props.autoDryRun}
            onChange={(e) => props.setAutoDryRun(e.target.checked)}
          />
          <span>Dry-run (don't write to DB)</span>
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          disabled={props.autoBusy}
          onClick={props.onApplyAutoTags}
        >
          {props.autoBusy ? "Applying…" : "Apply auto-tags"}
        </button>
        {props.autoMsg && (
          <span className="text-[11px] text-gray-500 break-all">
            {props.autoMsg}
          </span>
        )}
      </div>
    </div>
  );
}
