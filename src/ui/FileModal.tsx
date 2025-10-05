import React, { useState, useEffect } from "react";
import type { Entry } from "./types";
import { humanSize } from "./types";

const Modal = React.lazy(() => import("./Modal"));

// Type for individual items in the archive
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
  <div className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
    <button
      className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-gray-700 hover:text-gray-900 dark:hover:text-gray-300 dark:hover:underline"
      onClick={onToggle}
    >
      <span className="text-gray-700 dark:text-gray-300">{title}</span>
      <span className="ml-2 text-gray-400 dark:text-gray-300">
        {isOpen ? "−" : "+"}
      </span>
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
  // Spoiler states
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [protectionExpanded, setProtectionExpanded] = useState(false);

  // Protection states
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  return (
    <Modal isOpen={true} onClose={onClose} title="File Details">
      {/* Password prompt state - replaces all modal content */}
      {showPasswordPrompt && !fileUnlocked ? (
        <div className="mt-3 min-w-[500px] max-w-[90%]">
          <div className="text-center py-4">
            <div className="flex justify-center mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-6 text-gray-500"
              >
                <path
                  fillRule="evenodd"
                  d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <div className="text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              Password protected file
            </div>

            <div className="text-xs text-gray-500 mb-3">
              Enter password to continue
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-gray-500 mb-1 text-xs dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                className="w-full border rounded p-2 text-xs dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
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
            </div>

            {passwordError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded dark:bg-dark-300 dark:text-red-400">
                {passwordError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                aria-describedby="file-modal-close"
                aria-label="Cancel and close"
                aria-roledescription="button"
                type="button"
                className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-200"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                aria-label="Unlock file"
                aria-roledescription="button"
                type="button"
                className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-200"
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
                {verifyingPassword && (
                  <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full mr-1"></div>
                )}
                {verifyingPassword ? "Verifying…" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Normal modal content - only shown when file is unlocked or not protected
        <>
          <div className="mt-3 min-w-[500px] max-w-[90%]">
            <Spoiler
              title="Metadata & Info"
              isOpen={infoExpanded}
              onToggle={() => setInfoExpanded(!infoExpanded)}
            >
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300 break-words">
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
                  <span className="text-gray-500">Path:</span> {entry.fullPath}
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
                    className="w-full border rounded p-2 text-xs dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
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
                    className="w-full border rounded p-2 text-xs dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                    value={tagsDraft}
                    onChange={(e) => onTagsChange(e.target.value)}
                    placeholder="Comma or space separated (e.g. project, image)"
                  />
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {entry.tags.map((t, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-200 cursor-pointer"
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
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-1 dark:bg-dark-300 dark:border-dark-600 dark:focus:ring-blue-400"
                  />
                  <label
                    htmlFor="password-protection"
                    className="text-xs text-gray-700 dark:text-gray-300 select-none"
                  >
                    Enable password protection for this file
                  </label>
                </div>

                <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-200 dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300">
                  <div className="flex items-start space-x-1">
                    <span className="text-blue-600">ℹ</span>
                    <span>
                      When enabled, other users will need to enter the password
                      to download or view this file.
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
                        className="w-full border rounded p-2 text-xs dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
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
                        className="w-full border rounded p-2 text-xs dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-200 cursor-pointer"
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
        </>
      )}
    </Modal>
  );
}
