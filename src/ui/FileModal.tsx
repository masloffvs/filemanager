import React, { useState, useEffect } from "react";
import type { Entry } from "./types";
import { getFileIcon } from "./FileIconUtils";
import { humanSize } from "./types";
import { ArchiveTree } from "./ArchiveTree";

type ArchiveItem = {
  path: string;
  size: number;
  compressedSize: number;
  isDir: boolean;
};

// Stable Spoiler component outside of render
const Spoiler = ({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div className="border-b border-gray-200 last:border-b-0">
    <button
      className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-gray-700 hover:text-gray-900 hover:underline"
      onClick={onToggle}
    >
      <span>{title}</span>
      <span className="ml-2 text-gray-400">{isOpen ? "−" : "+"}</span>
    </button>
    {isOpen && <div className="pb-3">{children}</div>}
  </div>
);

interface FileModalProps {
  entry: Entry | null;
  onClose: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  commentDraft: string;
  onCommentChange: (comment: string) => void;
  tagsDraft: string;
  onTagsChange: (tags: string) => void;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
}

export default function FileModal({
  entry,
  onClose,
  showPreview,
  onTogglePreview,
  commentDraft,
  onCommentChange,
  tagsDraft,
  onTagsChange,
  saving,
  saveError,
  onSave,
}: FileModalProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [archiveExpanded, setArchiveExpanded] = useState<
    Record<string, boolean>
  >({});

  // Spoiler states
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [protectionExpanded, setProtectionExpanded] = useState(false);

  // Protection states
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inputKey, setInputKey] = useState(0); // Key to force re-mount only when needed
  const [protectionSaving, setProtectionSaving] = useState(false);
  const [protectionError, setProtectionError] = useState<string | null>(null);

  // Password verification for accessing protected files
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [fileUnlocked, setFileUnlocked] = useState(false);

  useEffect(() => {
    if (entry) {
      // Reset archive preview state when entry changes
      setArchiveOpen(false);
      setArchiveItems([]);
      setArchiveError(null);
      setArchiveLoading(false);

      // Load password protection state from entry or fetch it
      const currentProtected = entry.isPasswordProtected || false;
      setIsProtected(currentProtected);
      setPassword("");
      setConfirmPassword("");
      setProtectionError(null);

      // Reset password access state
      setShowPasswordPrompt(false);
      setAccessPassword("");
      setPasswordError(null);
      setFileUnlocked(false);

      // If file is protected, show password prompt
      if (entry.isPasswordProtected && entry.type === "file") {
        setShowPasswordPrompt(true);
      }
    }
  }, [entry?.id, entry?.isPasswordProtected]);

  if (!entry) return null;

  const handleArchiveToggle = async () => {
    if (!archiveOpen && entry) {
      try {
        setArchiveLoading(true);
        setArchiveError(null);
        const res = await fetch(
          `/api/archiveList?path=${encodeURIComponent(entry.fullPath)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        setArchiveItems(Array.isArray(data.items) ? data.items : []);
        setArchiveOpen(true);
      } catch (err: any) {
        setArchiveError(String(err?.message || err));
      } finally {
        setArchiveLoading(false);
      }
    } else {
      setArchiveOpen(false);
    }
  };

  const lower = (entry.fullPath || "").toLowerCase();
  const mt = entry.mimeType || "";
  const isImg =
    /^image\//.test(mt) || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(lower);
  const isVideo =
    /^video\//.test(mt) || /\.(mp4|mkv|mov|avi|webm|m4v)$/i.test(lower);
  const isPdf = /pdf/i.test(mt) || /\.pdf$/i.test(lower);
  const canInline = isImg || isVideo;
  const canOpenTab = isImg || isPdf || /^text\//.test(mt);
  const isArchive =
    /\.(zip)$/i.test(entry.fullPath) || /zip/.test(entry.mimeType || "");

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded shadow-lg w-full max-w-lg p-4 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center min-w-0">
            {getFileIcon(entry)}
            <div className="truncate text-sm font-medium">
              {entry.fullPath.split("/").filter(Boolean).pop()}
            </div>
          </div>
          <button
            className="text-gray-500 hover:text-gray-700 text-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Password prompt state - replaces all modal content */}
        {showPasswordPrompt && !fileUnlocked ? (
          <div className="py-4 text-center">
            <div className="flex justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-8 h-8 text-gray-600"
              >
                <path
                  fillRule="evenodd"
                  d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <h3 className="text-base font-medium text-black mb-1">
              Password protected file
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Enter password to continue
            </p>

            <div className="space-y-3">
              <input
                type="password"
                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    accessPassword &&
                    !verifyingPassword
                  ) {
                    e.preventDefault();
                    const unlockBtn = document.querySelector(
                      '[data-action="unlock"]'
                    ) as HTMLButtonElement;
                    unlockBtn?.click();
                  }
                }}
                autoFocus
              />

              {passwordError && (
                <div className="text-xs text-red-600 text-center">
                  {passwordError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 text-black bg-white hover:bg-gray-50 flex-1"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  disabled={verifyingPassword || !accessPassword}
                  data-action="unlock"
                  onClick={async () => {
                    if (!entry || !accessPassword) return;
                    try {
                      setVerifyingPassword(true);
                      setPasswordError(null);
                      const res = await fetch("/api/verifyPassword", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: entry.id,
                          password: accessPassword,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok)
                        throw new Error(
                          data.error || "Failed to verify password"
                        );
                      if (!data.valid) {
                        setPasswordError("Invalid password");
                        return;
                      }
                      setFileUnlocked(true);
                      setShowPasswordPrompt(false);
                    } catch (err: any) {
                      setPasswordError(String(err?.message || err));
                    } finally {
                      setVerifyingPassword(false);
                    }
                  }}
                >
                  {verifyingPassword ? "Verifying..." : "Unlock"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Normal modal content - only shown when file is unlocked or not protected
          <>
            <div className="mt-3">
              <Spoiler
                title="Metadata & Info"
                isOpen={infoExpanded}
                onToggle={() => setInfoExpanded(!infoExpanded)}
              >
                <div className="space-y-1 text-xs text-gray-600 break-words">
                  <div>
                    <span className="text-gray-500">Type:</span>{" "}
                    {entry.mimeType || "unknown"}
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span>{" "}
                    {humanSize(entry.size)}
                  </div>
                  {entry.meta?.created && (
                    <div>
                      <span className="text-gray-500">Created:</span>{" "}
                      {entry.meta.created}
                    </div>
                  )}
                  {entry.meta?.lastModified && (
                    <div>
                      <span className="text-gray-500">Modified:</span>{" "}
                      {entry.meta.lastModified}
                    </div>
                  )}
                  <div className="truncate" title={entry.fullPath}>
                    <span className="text-gray-500">Path:</span>{" "}
                    {entry.fullPath}
                  </div>
                </div>
              </Spoiler>

              <Spoiler
                title="Comment & Tags"
                isOpen={metaExpanded}
                onToggle={() => setMetaExpanded(!metaExpanded)}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-500 mb-1 text-xs">
                      Comment
                    </label>
                    <textarea
                      className="w-full border rounded p-2 text-xs"
                      rows={3}
                      value={commentDraft}
                      onChange={(e) => onCommentChange(e.target.value)}
                      placeholder="Add a note about this file"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 text-xs">
                      Tags
                    </label>
                    <input
                      className="w-full border rounded p-2 text-xs"
                      value={tagsDraft}
                      onChange={(e) => onTagsChange(e.target.value)}
                      placeholder="Comma or space separated (e.g. project, image)"
                    />
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.tags.map((t, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      disabled={saving}
                      onClick={onSave}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>

                  {saveError && (
                    <div className="text-xs text-red-600">{saveError}</div>
                  )}
                </div>
              </Spoiler>

              <Spoiler
                title="Protection"
                isOpen={protectionExpanded}
                onToggle={() => setProtectionExpanded(!protectionExpanded)}
              >
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="password-protection"
                      checked={isProtected}
                      onChange={async (e) => {
                        const checked = e.target.checked;

                        // If unchecking and entry has password protection, require password
                        if (!checked && entry && entry.isPasswordProtected) {
                          if (!fileUnlocked) {
                            setProtectionError(
                              "Enter the current password to remove protection"
                            );
                            e.target.checked = true; // Keep checkbox checked
                            return;
                          }

                          try {
                            setProtectionSaving(true);
                            setProtectionError(null);
                            const res = await fetch(
                              `/api/filePassword?id=${encodeURIComponent(
                                entry.id
                              )}`,
                              {
                                method: "DELETE",
                              }
                            );
                            const data = await res.json();
                            if (!res.ok)
                              throw new Error(
                                data.error || "Failed to remove password"
                              );
                            setPassword("");
                            setConfirmPassword("");
                            setIsProtected(false);
                          } catch (err: any) {
                            setProtectionError(String(err?.message || err));
                            e.target.checked = true; // Revert checkbox if failed
                          } finally {
                            setProtectionSaving(false);
                          }
                        } else {
                          setIsProtected(checked);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label
                      htmlFor="password-protection"
                      className="text-xs text-gray-700"
                    >
                      Enable password protection for this file
                    </label>
                  </div>

                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-200">
                    <div className="flex items-start space-x-1">
                      <span className="text-blue-600">ℹ</span>
                      <span>
                        When enabled, other users will need to enter the
                        password to download or view this file.
                      </span>
                    </div>
                  </div>

                  {isProtected && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-gray-500 mb-1 text-xs">
                          Password
                        </label>
                        <input
                          type="password"
                          className="w-full border rounded p-2 text-xs"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          autoComplete="new-password"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-500 mb-1 text-xs">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          className="w-full border rounded p-2 text-xs"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          autoComplete="new-password"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          disabled={
                            protectionSaving ||
                            !password ||
                            password !== confirmPassword
                          }
                          onClick={async () => {
                            if (!entry) return;
                            try {
                              setProtectionSaving(true);
                              setProtectionError(null);

                              if (isProtected && password) {
                                // Set password protection
                                const res = await fetch("/api/filePassword", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    id: entry.id,
                                    password: password,
                                  }),
                                });
                                const data = await res.json();
                                if (!res.ok)
                                  throw new Error(
                                    data.error || "Failed to set password"
                                  );
                              } else {
                                // Remove password protection
                                const res = await fetch(
                                  `/api/filePassword?id=${encodeURIComponent(
                                    entry.id
                                  )}`,
                                  {
                                    method: "DELETE",
                                  }
                                );
                                const data = await res.json();
                                if (!res.ok)
                                  throw new Error(
                                    data.error || "Failed to remove password"
                                  );
                              }

                              setPassword("");
                              setConfirmPassword("");
                            } catch (err: any) {
                              setProtectionError(String(err?.message || err));
                            } finally {
                              setProtectionSaving(false);
                            }
                          }}
                        >
                          {protectionSaving ? "Setting…" : "Set Protection"}
                        </button>
                      </div>

                      {password &&
                        confirmPassword &&
                        password !== confirmPassword && (
                          <div className="text-xs text-red-600">
                            Passwords do not match
                          </div>
                        )}

                      {protectionError && (
                        <div className="text-xs text-red-600">
                          {protectionError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Spoiler>
            </div>

            {(!entry.isPasswordProtected || fileUnlocked) && (
              <Spoiler
                title="Actions & Preview"
                isOpen={actionsExpanded}
                onToggle={() => setActionsExpanded(!actionsExpanded)}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      href={`/api/download?path=${encodeURIComponent(
                        entry.fullPath
                      )}${
                        entry.isPasswordProtected &&
                        fileUnlocked &&
                        accessPassword
                          ? `&password=${encodeURIComponent(accessPassword)}`
                          : ""
                      }`}
                    >
                      Download
                    </a>

                    {canInline && (
                      <button
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        onClick={onTogglePreview}
                      >
                        {showPreview ? "Hide Preview" : "Show Preview"}
                      </button>
                    )}

                    {isArchive && (
                      <button
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        onClick={handleArchiveToggle}
                      >
                        {archiveOpen
                          ? "Hide Contents"
                          : archiveLoading
                          ? "Loading…"
                          : "Show Contents"}
                      </button>
                    )}

                    {canOpenTab && (
                      <a
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        target="_blank"
                        rel="noreferrer"
                        href={`/api/preview?path=${encodeURIComponent(
                          entry.fullPath
                        )}${
                          entry.isPasswordProtected &&
                          fileUnlocked &&
                          accessPassword
                            ? `&password=${encodeURIComponent(accessPassword)}`
                            : ""
                        }`}
                      >
                        Open Preview
                      </a>
                    )}
                  </div>

                  {showPreview && (
                    <div className="border rounded bg-gray-50 overflow-hidden">
                      {isImg ? (
                        <img
                          src={`/api/preview?path=${encodeURIComponent(
                            entry.fullPath
                          )}${
                            entry.isPasswordProtected &&
                            fileUnlocked &&
                            accessPassword
                              ? `&password=${encodeURIComponent(
                                  accessPassword
                                )}`
                              : ""
                          }`}
                          alt="preview"
                          className="max-h-[60vh] w-full object-contain bg-white"
                        />
                      ) : isVideo ? (
                        <video
                          className="w-full max-h-[60vh] bg-black"
                          controls
                          src={`/api/preview?path=${encodeURIComponent(
                            entry.fullPath
                          )}${
                            entry.isPasswordProtected &&
                            fileUnlocked &&
                            accessPassword
                              ? `&password=${encodeURIComponent(
                                  accessPassword
                                )}`
                              : ""
                          }`}
                        />
                      ) : (
                        <div className="p-3 text-xs text-gray-500">
                          No inline preview available for this type.
                        </div>
                      )}
                    </div>
                  )}

                  {archiveOpen && (
                    <div className="border rounded bg-gray-50 overflow-hidden">
                      <div className="p-2 text-xs text-gray-600">
                        Archive contents
                      </div>
                      {archiveError && (
                        <div className="px-3 pb-2 text-xs text-red-600">
                          {archiveError}
                        </div>
                      )}
                      <div className="max-h-[50vh] overflow-auto">
                        {archiveLoading ? (
                          <div className="px-3 py-1 text-[11px] text-gray-500">
                            Loading…
                          </div>
                        ) : archiveItems.length === 0 ? (
                          <div className="px-3 py-1 text-[11px] text-gray-500">
                            Empty archive or unsupported format.
                          </div>
                        ) : (
                          <div className="text-[11px]">
                            <ArchiveTree
                              items={archiveItems}
                              expanded={archiveExpanded}
                              onToggleExpanded={(path) =>
                                setArchiveExpanded((prev) => ({
                                  ...prev,
                                  [path]: !prev[path],
                                }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Spoiler>
            )}
          </>
        )}
      </div>
    </div>
  );
}
