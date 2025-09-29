import "./index.css";
import React, { useEffect, useState } from "react";

// Folder
const FolderIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9c-.546 0-1.059.146-1.5.401V3.5ZM2 9.5v3A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 12.5 8h-9A1.5 1.5 0 0 0 2 9.5Z" />
  </svg>
);
// Any file
const FileIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h4.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12a1.5 1.5 0 0 1 .439 1.061V12.5A1.5 1.5 0 0 1 12 14H4a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
  </svg>
);
// Symlink
const LinkIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M11.914 4.086a2 2 0 0 0-2.828 0l-5 5a2 2 0 1 0 2.828 2.828l.556-.555a.75.75 0 0 1 1.06 1.06l-.555.556a3.5 3.5 0 0 1-4.95-4.95l5-5a3.5 3.5 0 0 1 4.95 4.95l-1.972 1.972a2.125 2.125 0 0 1-3.006-3.005L9.97 4.97a.75.75 0 1 1 1.06 1.06L9.058 8.003a.625.625 0 0 0 .884.883l1.972-1.972a2 2 0 0 0 0-2.828Z"
      clipRule="evenodd"
    />
  </svg>
);
// Video file
const VideoIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path d="M3 4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H3ZM15 4.75a.75.75 0 0 0-1.28-.53l-2 2a.75.75 0 0 0-.22.53v2.5c0 .199.079.39.22.53l2 2a.75.75 0 0 0 1.28-.53v-6.5Z" />
  </svg>
);
// Photo file
const PhotoIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm10.5 5.707a.5.5 0 0 0-.146-.353l-1-1a.5.5 0 0 0-.708 0L9.354 9.646a.5.5 0 0 1-.708 0L6.354 7.354a.5.5 0 0 0-.708 0l-2 2a.5.5 0 0 0-.146.353V12a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V9.707ZM12 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
      clipRule="evenodd"
    />
  </svg>
);
// Executable file
const ExecIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M9.58 1.077a.75.75 0 0 1 .405.82L9.165 6h4.085a.75.75 0 0 1 .567 1.241l-6.5 7.5a.75.75 0 0 1-1.302-.638L6.835 10H2.75a.75.75 0 0 1-.567-1.241l6.5-7.5a.75.75 0 0 1 .897-.182Z"
      clipRule="evenodd"
    />
  </svg>
);
// Presentation file
const PresentationIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path d="M13.975 6.5c.028.276-.199.5-.475.5h-4a.5.5 0 0 1-.5-.5v-4c0-.276.225-.503.5-.475A5.002 5.002 0 0 1 13.974 6.5Z" />
    <path d="M6.5 4.025c.276-.028.5.199.5.475v4a.5.5 0 0 0 .5.5h4c.276 0 .503.225.475.5a5 5 0 1 1-5.474-5.475Z" />
  </svg>
);
// Database file
const DatabaseIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path d="M8 7c3.314 0 6-1.343 6-3s-2.686-3-6-3-6 1.343-6 3 2.686 3 6 3Z" />
    <path d="M8 8.5c1.84 0 3.579-.37 4.914-1.037A6.33 6.33 0 0 0 14 6.78V8c0 1.657-2.686 3-6 3S2 9.657 2 8V6.78c.346.273.72.5 1.087.683C4.42 8.131 6.16 8.5 8 8.5Z" />
    <path d="M8 12.5c1.84 0 3.579-.37 4.914-1.037.366-.183.74-.41 1.086-.684V12c0 1.657-2.686 3-6 3s-6-1.343-6-3v-1.22c.346.273.72.5 1.087.683C4.42 12.131 6.16 12.5 8 12.5Z" />
  </svg>
);
// Rust/cargo file
const RustIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M4.5 1.938a.75.75 0 0 1 1.025.274l.652 1.131c.351-.138.71-.233 1.073-.288V1.75a.75.75 0 0 1 1.5 0v1.306a5.03 5.03 0 0 1 1.072.288l.654-1.132a.75.75 0 1 1 1.298.75l-.652 1.13c.286.23.55.492.785.786l1.13-.653a.75.75 0 1 1 .75 1.3l-1.13.652c.137.351.233.71.288 1.073h1.305a.75.75 0 0 1 0 1.5h-1.306a5.032 5.032 0 0 1-.288 1.072l1.132.654a.75.75 0 0 1-.75 1.298l-1.13-.652c-.23.286-.492.55-.786.785l.652 1.13a.75.75 0 0 1-1.298.75l-.653-1.13c-.351.137-.71.233-1.073.288v1.305a.75.75 0 0 1-1.5 0v-1.306a5.032 5.032 0 0 1-1.072-.288l-.653 1.132a.75.75 0 0 1-1.3-.75l.653-1.13a4.966 4.966 0 0 1-.785-.786l-1.13.652a.75.75 0 0 1-.75-1.298l1.13-.653a4.965 4.965 0 0 1-.288-1.073H1.75a.75.75 0 0 1 0-1.5h1.306a5.03 5.03 0 0 1 .288-1.072l-1.132-.653a.75.75 0 0 1 .75-1.3l1.13.653c.23-.286.492-.55.786-.785l-.653-1.13A.75.75 0 0 1 4.5 1.937Zm1.14 3.476a3.501 3.501 0 0 0 0 5.172L7.135 8 5.641 5.414ZM8.434 8.75 6.94 11.336a3.491 3.491 0 0 0 2.81-.305 3.49 3.49 0 0 0 1.669-2.281H8.433Zm2.987-1.5H8.433L6.94 4.664a3.501 3.501 0 0 1 4.48 2.586Z"
      clipRule="evenodd"
    />
  </svg>
);
// Bash/sh/zsh script
const ShellIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm2.22 1.97a.75.75 0 0 0 0 1.06l.97.97-.97.97a.75.75 0 1 0 1.06 1.06l1.5-1.5a.75.75 0 0 0 0-1.06l-1.5-1.5a.75.75 0 0 0-1.06 0ZM8.75 8.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"
      clipRule="evenodd"
    />
  </svg>
);
// Virtual machine file
const VMIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M7.628 1.349a.75.75 0 0 1 .744 0l1.247.712a.75.75 0 1 1-.744 1.303L8 2.864l-.875.5a.75.75 0 0 1-.744-1.303l1.247-.712ZM4.65 3.914a.75.75 0 0 1-.279 1.023L4.262 5l.11.063a.75.75 0 0 1-.744 1.302l-.13-.073A.75.75 0 0 1 2 6.25V5a.75.75 0 0 1 .378-.651l1.25-.714a.75.75 0 0 1 1.023.279Zm6.698 0a.75.75 0 0 1 1.023-.28l1.25.715A.75.75 0 0 1 14 5v1.25a.75.75 0 0 1-1.499.042l-.129.073a.75.75 0 0 1-.744-1.302l.11-.063-.11-.063a.75.75 0 0 1-.28-1.023ZM6.102 6.915a.75.75 0 0 1 1.023-.279l.875.5.875-.5a.75.75 0 0 1 .744 1.303l-.869.496v.815a.75.75 0 0 1-1.5 0v-.815l-.869-.496a.75.75 0 0 1-.28-1.024ZM2.75 9a.75.75 0 0 1 .75.75v.815l.872.498a.75.75 0 0 1-.744 1.303l-1.25-.715A.75.75 0 0 1 2 11V9.75A.75.75 0 0 1 2.75 9Zm10.5 0a.75.75 0 0 1 .75.75V11a.75.75 0 0 1-.378.651l-1.25.715a.75.75 0 0 1-.744-1.303l.872-.498V9.75a.75.75 0 0 1 .75-.75Zm-4.501 3.708.126-.072a.75.75 0 0 1 .744 1.303l-1.247.712a.75.75 0 0 1-.744 0L6.38 13.94a.75.75 0 0 1 .744-1.303l.126.072a.75.75 0 0 1 1.498 0Z"
      clipRule="evenodd"
    />
  </svg>
);
// Security/fingerprint/keys
const KeyIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M8 3c-.988 0-1.908.286-2.682.78a.75.75 0 0 1-.806-1.266A6.5 6.5 0 0 1 14.5 8c0 1.665-.333 3.254-.936 4.704a.75.75 0 0 1-1.385-.577C12.708 10.857 13 9.464 13 8a5 5 0 0 0-5-5ZM3.55 4.282a.75.75 0 0 1 .23 1.036A4.973 4.973 0 0 0 3 8a.75.75 0 0 1-1.5 0c0-1.282.372-2.48 1.014-3.488a.75.75 0 0 1 1.036-.23ZM8 5.875A2.125 2.125 0 0 0 5.875 8a3.625 3.625 0 0 1-3.625 3.625H2.213a.75.75 0 1 1 .008-1.5h.03A2.125 2.125 0 0 0 4.376 8a3.625 3.625 0 1 1 7.25 0c0 .078-.001.156-.003.233a.75.75 0 1 1-1.5-.036c.002-.066.003-.131.003-.197A2.125 2.125 0 0 0 8 5.875ZM7.995 7.25a.75.75 0 0 1 .75.75 6.502 6.502 0 0 1-4.343 6.133.75.75 0 1 1-.498-1.415A5.002 5.002 0 0 0 7.245 8a.75.75 0 0 1 .75-.75Zm2.651 2.87a.75.75 0 0 1 .463.955 9.39 9.39 0 0 1-3.008 4.25.75.75 0 0 1-.936-1.171 7.892 7.892 0 0 0 2.527-3.57.75.75 0 0 1 .954-.463Z"
      clipRule="evenodd"
    />
  </svg>
);
// PCAP/cap/wireshark
const PcapIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M3.757 4.5c.18.217.376.42.586.608.153-.61.354-1.175.596-1.678A5.53 5.53 0 0 0 3.757 4.5ZM8 1a6.994 6.994 0 0 0-7 7 7 7 0 1 0 7-7Zm0 1.5c-.476 0-1.091.386-1.633 1.427-.293.564-.531 1.267-.683 2.063A5.48 5.48 0 0 0 8 6.5a5.48 5.48 0 0 0 2.316-.51c-.152-.796-.39-1.499-.683-2.063C9.09 2.886 8.476 2.5 8 2.5Zm3.657 2.608a8.823 8.823 0 0 0-.596-1.678c.444.298.842.659 1.182 1.07-.18.217-.376.42-.586.608Zm-1.166 2.436A6.983 6.983 0 0 1 8 8a6.983 6.983 0 0 1-2.49-.456 10.703 10.703 0 0 0 .202 2.6c.72.231 1.49.356 2.288.356.798 0 1.568-.125 2.29-.356a10.705 10.705 0 0 0 .2-2.6Zm1.433 1.85a12.652 12.652 0 0 0 .018-2.609c.405-.276.78-.594 1.117-.947a5.48 5.48 0 0 1 .44 2.262 7.536 7.536 0 0 1-1.575 1.293Zm-2.172 2.435a9.046 9.046 0 0 1-3.504 0c.039.084.078.166.12.244C6.907 13.114 7.523 13.5 8 13.5s1.091-.386 1.633-1.427c.04-.078.08-.16.12-.244Zm1.31.74a8.5 8.5 0 0 0 .492-1.298c.457-.197.893-.43 1.307-.696a5.526 5.526 0 0 1-1.8 1.995Zm-6.123 0a8.507 8.507 0 0 1-.493-1.298 8.985 8.985 0 0 1-1.307-.696 5.526 5.526 0 0 0 1.8 1.995ZM2.5 8.1c.463.5.993.935 1.575 1.293a12.652 12.652 0 0 1-.018-2.608 7.037 7.037 0 0 1-1.117-.947 5.48 5.48 0 0 0-.44 2.262Z"
      clipRule="evenodd"
    />
  </svg>
);
// Archive file
const ArchiveIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M4.784 3A2.25 2.25 0 0 0 2.68 4.449L1.147 8.475A2.25 2.25 0 0 0 1 9.276v1.474A2.25 2.25 0 0 0 3.25 13h9.5A2.25 2.25 0 0 0 15 10.75V9.276c0-.274-.05-.545-.147-.801l-1.534-4.026A2.25 2.25 0 0 0 11.216 3H4.784Zm-.701 1.983a.75.75 0 0 1 .7-.483h6.433a.75.75 0 0 1 .701.483L13.447 9h-2.412a1 1 0 0 0-.832.445l-.406.61a1 1 0 0 1-.832.445h-1.93a1 1 0 0 1-.832-.445l-.406-.61A1 1 0 0 0 4.965 9H2.553l1.53-4.017Z"
      clipRule="evenodd"
    />
  </svg>
);
// Key/cert file
const CertIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className="size-4 mr-2"
  >
    <path
      fillRule="evenodd"
      d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
      clipRule="evenodd"
    />
  </svg>
);

// human-readable file size formatter
function humanSize(val: number | null | undefined): string {
  if (val == null) return "";
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"] as const;
  let size = Number(val);
  if (!Number.isFinite(size) || size < 0) return "";
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  const precision = size < 10 && i > 0 ? 1 : 0;
  return `${size.toFixed(precision)} ${units[i]}`;
}

// Minimal Entry shape used by the UI
type Entry = {
  id: string;
  type: "file" | "link" | "folder";
  size: number | null;
  fullPath: string; // server-provided display path
  path: string; // absolute path (used for icon heuristics)
  mimeType: string | null;
  parentId: string | null;
  meta?: any | null;
  comment?: string | null;
  tags?: string[] | null;
};

function getFileIcon(e: Entry): JSX.Element {
  if (e.type === "folder") return FolderIcon;
  if (e.type === "link") return LinkIcon;
  // Video
  if (e.mimeType && /^video\//.test(e.mimeType)) return VideoIcon;
  // Photo
  if (e.mimeType && /^image\//.test(e.mimeType)) return PhotoIcon;
  // Executable
  if (
    e.mimeType === "application/x-executable" ||
    e.mimeType === "application/x-msdownload" ||
    e.mimeType === "application/x-msdos-program" ||
    e.path.match(/\.(exe|bin|dll|so|dylib|app|run|out)$/i)
  )
    return ExecIcon;
  // Presentation
  if (
    e.mimeType === "application/vnd.ms-powerpoint" ||
    e.mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    e.path.match(/\.(ppt|pptx)$/i)
  )
    return PresentationIcon;
  // Database
  if (
    e.mimeType === "application/x-sqlite3" ||
    e.mimeType === "application/vnd.sqlite3" ||
    e.path.match(/\.(sqlite|db|sqlite3)$/i)
  )
    return DatabaseIcon;
  // Rust/cargo
  if (e.path.match(/Cargo\.toml$|\.rs$/i)) return RustIcon;
  // Shell scripts
  if (
    e.mimeType === "application/x-sh" ||
    e.mimeType === "application/x-shellscript" ||
    e.path.match(/\.(sh|zsh|bash)$/i)
  )
    return ShellIcon;
  // VM
  if (e.path.match(/\.(vmdk|vdi|qcow2|img|iso)$/i)) return VMIcon;
  // Security/keys
  if (
    e.path.match(/\.(key|pem|crt|cer|p12|pfx|asc)$/i) ||
    (e.mimeType && /x-pem|x-x509|x-pkcs/.test(e.mimeType))
  )
    return KeyIcon;
  // PCAP/cap/wireshark
  if (e.path.match(/\.(pcap|cap)$/i)) return PcapIcon;
  // Archive
  if (
    e.mimeType === "application/zip" ||
    e.mimeType === "application/x-tar" ||
    e.mimeType === "application/x-7z-compressed" ||
    e.mimeType === "application/x-rar-compressed" ||
    e.path.match(/\.(zip|tar|gz|tgz|bz2|xz|7z|rar|iso)$/i)
  )
    return ArchiveIcon;
  // Cert
  if (e.path.match(/\.(pem|crt|cer|cert)$/i)) return CertIcon;
  // Default
  return FileIcon;
}

export function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [parentId, setParentId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
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
  const finderInputRef = React.useRef<HTMLInputElement | null>(null);
  const [finderTags, setFinderTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [finderTagsLoading, setFinderTagsLoading] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'server' | 'sorting' | 'autotags'>('general');
  const [cfgRoot, setCfgRoot] = useState<string>('');
  const [cfgInterval, setCfgInterval] = useState<number>(10);
  const [cfgBusy, setCfgBusy] = useState<boolean>(false);
  const [cfgMsg, setCfgMsg] = useState<string | null>(null);
  const [cfgServerHost, setCfgServerHost] = useState<string>('127.0.0.1');
  const [cfgServerPort, setCfgServerPort] = useState<number>(3000);
  const [cfgFolderSortKey, setCfgFolderSortKey] = useState<'name'|'size'|'modified'|'created'>('name');
  const [cfgFolderSortOrder, setCfgFolderSortOrder] = useState<'asc'|'desc'>('asc');
  const [cfgFileSortKey, setCfgFileSortKey] = useState<'name'|'size'|'modified'|'created'>('name');
  const [cfgFileSortOrder, setCfgFileSortOrder] = useState<'asc'|'desc'>('asc');
  const [autoMode, setAutoMode] = useState<"merge" | "missing" | "replace">("merge");
  const [autoType, setAutoType] = useState<"" | "file" | "folder" | "link">("");
  const [autoPrefix, setAutoPrefix] = useState<string>("");
  const [autoDryRun, setAutoDryRun] = useState<boolean>(true);
  const [autoBusy, setAutoBusy] = useState<boolean>(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);
  const [reloadBusy, setReloadBusy] = useState<boolean>(false);
  const [reloadMsg, setReloadMsg] = useState<string | null>(null);
  // Local copy of sort prefs for runtime sorting (must be declared before useMemo below)
  const [runtimeFolderSort, setRuntimeFolderSort] = useState<{key:'name'|'size'|'modified'|'created', order:'asc'|'desc'}>({key:'name',order:'asc'});
  const [runtimeFileSort, setRuntimeFileSort] = useState<{key:'name'|'size'|'modified'|'created', order:'asc'|'desc'}>({key:'name',order:'asc'});

  // Get root folder from env or DB on mount
  useEffect(() => {
    // Fetch server config for root folder
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg && typeof cfg.indexRootPath === 'string') {
          const resolved = typeof cfg.resolvedIndexRootPath === 'string' && cfg.resolvedIndexRootPath
            ? cfg.resolvedIndexRootPath
            : cfg.indexRootPath;
          setRootFolder(resolved || '/');
          setCurrentPath(resolved || '/');
          window.history.replaceState({}, '', '#' + (resolved || '/'));
          if (cfg.folderSort) setRuntimeFolderSort({ key: cfg.folderSort.key || 'name', order: cfg.folderSort.order || 'asc' });
          if (cfg.fileSort) setRuntimeFileSort({ key: cfg.fileSort.key || 'name', order: cfg.fileSort.order || 'asc' });
        }
      })
      .catch(() => {
        const fallback = '/';
        setRootFolder(fallback);
      });
  }, []);

  useEffect(() => {
    setPage(0); // Reset page on path change
  }, [currentPath]);

  useEffect(() => {
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
      });
  }, [currentPath]);

  // Sorting helper
  const sortName = (e: Entry) => (e.fullPath.split('/').filter(Boolean).pop() || '').toLowerCase();
  const sortSize = (e: Entry) => Number(e.size ?? 0);
  const toTime = (s?: string | null) => (s ? Date.parse(s) || 0 : 0);
  const sortModified = (e: Entry) => toTime(e.meta?.lastModified);
  const sortCreated = (e: Entry) => toTime(e.meta?.created);

  const sortedEntries = React.useMemo(() => {
    const folders = entries.filter((e) => e.type === 'folder');
    const rest = entries.filter((e) => e.type !== 'folder');

    const sortBySpec = (arr: Entry[], spec: {key:'name'|'size'|'modified'|'created', order:'asc'|'desc'}) => {
      const keyFn = spec.key === 'name' ? sortName : spec.key === 'size' ? sortSize : spec.key === 'modified' ? sortModified : sortCreated;
      const mul = spec.order === 'asc' ? 1 : -1;
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

  const handleOpen = (entry: Entry) => {
    if (entry.type === "folder") {
      window.history.pushState({}, "", "#" + entry.fullPath);
      setCurrentPath(entry.fullPath);
    } else if (entry.type === "file") {
      setSelected(entry);
      const isImg = !!entry.mimeType && /^image\//.test(entry.mimeType);
      const isVideo = !!entry.mimeType && /^video\//.test(entry.mimeType);
      setShowPreview(isImg || isVideo);
    }
  };

  // Interactive breadcrumb navigation
  const handleBreadcrumb = (idx: number, segments: string[]) => {
    const newPath =
      "/" +
      segments
        .slice(0, idx + 1)
        .filter(Boolean)
        .join("/");
    window.history.pushState({}, "", "#" + newPath);
    setCurrentPath(newPath);
  };

  React.useEffect(() => {
    const onPopState = () => {
      const hash = window.location.hash.replace(/^#/, "");
      setCurrentPath(hash || "/");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Populate drafts when opening modal
  useEffect(() => {
    if (selected) {
      setCommentDraft(selected.comment || "");
      setTagsDraft(Array.isArray(selected.tags) ? selected.tags.join(", ") : "");
      setSaveError(null);
    }
  }, [selected]);

  // Hotkeys: Escape (close), Cmd/Ctrl+F (finder)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape closes whichever modal is open
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
      // Spotlight-like search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        // Don't hijack when user is typing in inputs unless finder is already open
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
          setTimeout(() => finderInputRef.current?.focus(), 0);
        }
      }
      // Settings: Cmd/Ctrl+Z (avoid hijacking if typing in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        const target = e.target as HTMLElement | null;
        const tag = (target?.tagName || "").toUpperCase();
        const inEditable = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
        if (!inEditable || settingsOpen) {
          e.preventDefault();
          setSettingsOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, finderOpen]);

  const runSearch = async () => {
    const q = finderQuery.trim();
    if (!q) {
      setFinderResults([]);
      return;
    }
    try {
      setFinderLoading(true);
      setFinderError(null);
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=100`);
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
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const c = await res.json();
        if (typeof c.indexRootPath === 'string') setCfgRoot(c.indexRootPath);
        if (Number.isFinite(Number(c.reindexIntervalSec))) setCfgInterval(Number(c.reindexIntervalSec));
        if (typeof c.serverHost === 'string') setCfgServerHost(c.serverHost);
        if (Number.isFinite(Number(c.serverPort))) setCfgServerPort(Number(c.serverPort));
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


  // Pagination
  const pagedEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(entries.length / PAGE_SIZE);

  // Breadcrumbs, remove rootFolder prefix from display
  let displayPath = currentPath;
  if (rootFolder !== "/" && displayPath.startsWith(rootFolder)) {
    displayPath = displayPath.slice(rootFolder.length);
    if (!displayPath.startsWith("/")) displayPath = "/" + displayPath;
  }
  const segments = displayPath.split("/").filter((s) => s.length > 0);

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
      >
        <div className="flex items-center mb-1 flex-wrap gap-1">
          <span
            className="text-gray-700 hover:underline hover:text-gray-900 cursor-pointer text-xs"
            onClick={() => {
              window.history.pushState({}, "", "#" + rootFolder);
              setCurrentPath(rootFolder);
            }}
          >
            root
          </span>
          {segments.map((seg, idx) => (
            <React.Fragment key={idx}>
              <span className="text-gray-400 text-xs">/</span>
              <span
                className="text-gray-700 hover:underline hover:text-gray-900 cursor-pointer text-xs"
                onClick={() => handleBreadcrumb(idx, segments)}
              >
                {seg}
              </span>
            </React.Fragment>
          ))}
        </div>
        <ul>
          {sortedEntries
            .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
            .map((e, idx, arr) => {
              const isGroupStart =
              idx > 0 && e.type !== "folder" && arr[idx - 1].type === "folder";
              return (
                <li
                  key={e.id}
                  className={`flex items-center py-1 px-1 hover:bg-gray-50 transition ${
                    e.type === "folder" ? "cursor-pointer" : "cursor-default"
                } ${isGroupStart ? "mt-2" : ""}`}
                  onClick={() => handleOpen(e)}
                >
                {getFileIcon(e)}
                <span className="flex-1 truncate text-xs">
                  {e.fullPath.split("/").filter(Boolean).pop() || "/"}
                </span>
                {e.size !== null && (
                  <span className="ml-2 text-xs text-gray-500 w-16 text-right tabular-nums">
                    {humanSize(e.size)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-2">
            <button
              className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-400 disabled:bg-gray-100"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Prev
            </button>
            <span className="text-xs text-gray-600">
              Page {page + 1} / {totalPages}
            </span>
            <button
              className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-400 disabled:bg-gray-100"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </button>
          </div>
        )}
      </div>
      {finderOpen && (
        <div
          className="fixed inset-0 bg-black/30 flex items-start justify-center p-4 z-40"
          onClick={() => setFinderOpen(false)}
        >
          <div
            className="bg-white rounded shadow-lg w-full max-w-xl p-3 mt-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 items-center">
              <input
                ref={finderInputRef}
                value={finderQuery}
                onChange={(e) => setFinderQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder="Search files/folders by name, path, comment, tags"
              />
              <button
                className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={runSearch}
              >
                Find
              </button>
            </div>
            {finderError && (
              <div className="mt-2 text-xs text-red-600">{finderError}</div>
            )}
            <div className="mt-2">
              <div className="text-[11px] text-gray-500 mb-1">Suggested tags</div>
              <div className="flex flex-wrap gap-1">
                {finderTagsLoading && (
                  <span className="text-[11px] text-gray-400">Loading…</span>
                )}
                {!finderTagsLoading && finderTags.length === 0 && (
                  <span className="text-[11px] text-gray-400">No tags yet</span>
                )}
                {!finderTagsLoading &&
                  finderTags.map(({ tag, count }) => {
                    // simple sizing from count
                    const sizeClass =
                      count > 20 ? "text-sm" : count > 10 ? "text-[13px]" : "text-[11px]";
                    return (
                      <button
                        key={tag}
                        className={`px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-700 ${sizeClass}`}
                        onClick={() => {
                          setFinderQuery(tag);
                          setTimeout(() => runSearch(), 0);
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
              {finderLoading && (
                <li className="py-2 text-xs text-gray-500">Searching…</li>
              )}
              {!finderLoading && finderResults.length === 0 && finderQuery && (
                <li className="py-2 text-xs text-gray-500">No results</li>
              )}
              {finderResults.map((e) => (
                <li
                  key={e.id}
                  className={`flex items-center gap-2 py-1 px-1 hover:bg-gray-50 ${
                    e.type === "folder" ? "cursor-pointer" : "cursor-pointer"
                  }`}
                  onClick={() => {
                    setFinderOpen(false);
                    if (e.type === "folder") {
                      window.history.pushState({}, "", "#" + e.fullPath);
                      setCurrentPath(e.fullPath);
                    } else {
                      setSelected(e);
                      const isImg = !!e.mimeType && /^image\//.test(e.mimeType);
                      const isVideo = !!e.mimeType && /^video\//.test(e.mimeType);
                      setShowPreview(isImg || isVideo);
                    }
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
      )}
      {settingsOpen && (
        <div
          className="fixed inset-0 bg-black/30 flex items-start justify-center p-4 z-50"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="bg-white rounded shadow-lg w-full max-w-3xl p-4 mt-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4">
              <div className="w-40 border-r border-gray-200 pr-2">
                <div className="text-xs font-medium text-gray-500 mb-2">Sections</div>
                <ul className="space-y-1">
                  <li>
                    <button
                      className={`w-full text-left px-2 py-1 rounded text-xs ${
                        settingsTab === 'general' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setSettingsTab('general')}
                    >
                      General
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-2 py-1 rounded text-xs ${
                        settingsTab === 'server' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setSettingsTab('server')}
                    >
                      Server
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-2 py-1 rounded text-xs ${
                        settingsTab === 'sorting' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setSettingsTab('sorting')}
                    >
                      Sorting
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-2 py-1 rounded text-xs ${
                        settingsTab === 'autotags' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setSettingsTab('autotags')}
                    >
                      Auto-tags
                    </button>
                  </li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Settings</div>
                  <button
                    className="text-gray-500 hover:text-gray-700 text-sm"
                    onClick={() => setSettingsOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                {settingsTab === 'general' && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                      <label className="text-xs text-gray-600">Index root path</label>
                      <input
                        className="border rounded px-2 py-1 text-xs"
                        value={cfgRoot}
                        onChange={(e) => setCfgRoot(e.target.value)}
                        placeholder="./ or /absolute/path"
                      />
                      <label className="text-xs text-gray-600">Reindex interval (sec)</label>
                      <input
                        type="number"
                        min={1}
                        className="border rounded px-2 py-1 text-xs"
                        value={cfgInterval}
                        onChange={(e) => setCfgInterval(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        disabled={cfgBusy}
                        onClick={async () => {
                          try {
                            setCfgBusy(true);
                            setCfgMsg(null);
                            const res = await fetch('/api/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ indexRootPath: cfgRoot, reindexIntervalSec: cfgInterval }),
                            });
                            const json = await res.json();
                            if (!res.ok) throw new Error(JSON.stringify(json));
                            setCfgMsg('Saved');
                            if (json && typeof json.indexRootPath === 'string') {
                              setRootFolder(json.indexRootPath || '/');
                            }
                          } catch (err: any) {
                            setCfgMsg('Save failed: ' + String(err?.message || err));
                          } finally {
                            setCfgBusy(false);
                          }
                        }}
                      >
                        {cfgBusy ? 'Saving…' : 'Save'}
                      </button>
                      {cfgMsg && <span className="text-[11px] text-gray-500">{cfgMsg}</span>}
                    </div>
                  </div>
                )}
                {settingsTab === 'server' && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                      <label className="text-xs text-gray-600">Host</label>
                      <input
                        className="border rounded px-2 py-1 text-xs"
                        value={cfgServerHost}
                        onChange={(e) => setCfgServerHost(e.target.value)}
                        placeholder="127.0.0.1 or 0.0.0.0"
                      />
                      <label className="text-xs text-gray-600">Port</label>
                      <input
                        type="number"
                        min={1}
                        className="border rounded px-2 py-1 text-xs"
                        value={cfgServerPort}
                        onChange={(e) => setCfgServerPort(Math.max(1, Number(e.target.value) || 3000))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        onClick={async () => {
                          try {
                            const body = { serverHost: cfgServerHost, serverPort: cfgServerPort };
                            const res = await fetch('/api/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(body),
                            });
                            const j = await res.json();
                            if (!res.ok) throw new Error(JSON.stringify(j));
                            const needs = !!j.requiresRestart;
                            const nextUrl = `${window.location.protocol}//${cfgServerHost || window.location.hostname}:${cfgServerPort}/`;
                            setCfgMsg(needs ? `Saved. Server will need restart. Open: ${nextUrl}` : 'Saved');
                          } catch (err: any) {
                            setCfgMsg('Save failed: ' + String(err?.message || err));
                          }
                        }}
                      >
                        Save
                      </button>
                      {cfgMsg && <span className="text-[11px] text-gray-500 break-all">{cfgMsg}</span>}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Changing host/port requires restarting the server process or reloading the app with the new URL.
                    </div>
                  </div>
                )}
                {settingsTab === 'sorting' && (
                  <div className="mt-3 space-y-3">
                    <div className="text-xs text-gray-500">Folders</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                      <label className="text-xs text-gray-600">Sort by</label>
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        value={cfgFolderSortKey}
                        onChange={(e) => setCfgFolderSortKey(e.target.value as any)}
                      >
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                        <option value="modified">Modified</option>
                        <option value="created">Created</option>
                      </select>
                      <label className="text-xs text-gray-600">Order</label>
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        value={cfgFolderSortOrder}
                        onChange={(e) => setCfgFolderSortOrder(e.target.value as any)}
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </div>

                    <div className="text-xs text-gray-500 mt-4">Files</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                      <label className="text-xs text-gray-600">Sort by</label>
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        value={cfgFileSortKey}
                        onChange={(e) => setCfgFileSortKey(e.target.value as any)}
                      >
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                        <option value="modified">Modified</option>
                        <option value="created">Created</option>
                      </select>
                      <label className="text-xs text-gray-600">Order</label>
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        value={cfgFileSortOrder}
                        onChange={(e) => setCfgFileSortOrder(e.target.value as any)}
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        onClick={async () => {
                          try {
                            const body = {
                              folderSort: { key: cfgFolderSortKey, order: cfgFolderSortOrder },
                              fileSort: { key: cfgFileSortKey, order: cfgFileSortOrder },
                            };
                            const res = await fetch('/api/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(body),
                            });
                            const j = await res.json();
                            if (!res.ok) throw new Error(JSON.stringify(j));
                            setRuntimeFolderSort({ key: cfgFolderSortKey, order: cfgFolderSortOrder });
                            setRuntimeFileSort({ key: cfgFileSortKey, order: cfgFileSortOrder });
                          } catch {}
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
                {settingsTab === 'autotags' && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">Auto-tags</div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        disabled={reloadBusy}
                        onClick={async () => {
                          try {
                            setReloadBusy(true);
                            setReloadMsg(null);
                            const res = await fetch('/api/reloadAutotags');
                            if (!res.ok) throw new Error(await res.text());
                            setReloadMsg('Rules reloaded');
                          } catch (err: any) {
                            setReloadMsg('Reload failed: ' + String(err?.message || err));
                          } finally {
                            setReloadBusy(false);
                          }
                        }}
                      >
                        {reloadBusy ? 'Reloading…' : 'Reload rules'}
                      </button>
                      {reloadMsg && (
                        <span className="text-[11px] text-gray-500">{reloadMsg}</span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="w-20">Mode</span>
                        <select
                          className="flex-1 border rounded px-2 py-1 text-xs"
                          value={autoMode}
                          onChange={(e) => setAutoMode(e.target.value as any)}
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
                          value={autoType}
                          onChange={(e) => setAutoType(e.target.value as any)}
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
                          value={autoPrefix}
                          onChange={(e) => setAutoPrefix(e.target.value)}
                          placeholder="/absolute/path"
                        />
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-2 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={autoDryRun}
                          onChange={(e) => setAutoDryRun(e.target.checked)}
                        />
                        <span>Dry-run (don’t write to DB)</span>
                      </label>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        disabled={autoBusy}
                        onClick={async () => {
                          try {
                            setAutoBusy(true);
                            setAutoMsg(null);
                            const params = new URLSearchParams();
                            params.set('mode', autoMode);
                            if (autoType) params.set('type', autoType);
                            if (autoPrefix) params.set('pathPrefix', autoPrefix);
                            params.set('dry', String(autoDryRun));
                            const res = await fetch(`/api/applyAutotags?${params.toString()}`);
                            const txt = await res.text();
                            if (!res.ok) throw new Error(txt);
                            setAutoMsg(txt);
                          } catch (err: any) {
                            setAutoMsg('Apply failed: ' + String(err?.message || err));
                          } finally {
                            setAutoBusy(false);
                          }
                        }}
                      >
                        {autoBusy ? 'Applying…' : 'Apply auto-tags'}
                      </button>
                      {autoMsg && (
                        <span className="text-[11px] text-gray-500 break-all">{autoMsg}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded shadow-lg w-full max-w-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center min-w-0">
                {getFileIcon(selected)}
                <div className="truncate text-sm font-medium">
                  {selected.fullPath.split("/").filter(Boolean).pop()}
                </div>
              </div>
              <button
                className="text-gray-500 hover:text-gray-700 text-sm"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="mt-2 space-y-1 text-xs text-gray-600 break-words">
              <div>
                <span className="text-gray-500">Type:</span> {selected.mimeType || "unknown"}
              </div>
              <div>
                <span className="text-gray-500">Size:</span> {humanSize(selected.size)}
              </div>
              {selected.meta?.created && (
                <div>
                  <span className="text-gray-500">Created:</span> {selected.meta.created}
                </div>
              )}
              {selected.meta?.lastModified && (
                <div>
                  <span className="text-gray-500">Modified:</span> {selected.meta.lastModified}
                </div>
              )}
              <div className="truncate" title={selected.fullPath}>
                <span className="text-gray-500">Path:</span> {selected.fullPath}
              </div>
              <div className="pt-2">
                <label className="block text-gray-500 mb-1">Comment</label>
                <textarea
                  className="w-full border rounded p-2 text-xs"
                  rows={3}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Add a note about this file"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Tags</label>
                <input
                  className="w-full border rounded p-2 text-xs"
                  value={tagsDraft}
                  onChange={(e) => setTagsDraft(e.target.value)}
                  placeholder="Comma or space separated (e.g. project, image)"
                />
                {selected.tags && selected.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selected.tags.map((t, i) => (
                      <span key={i} className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <a
                className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                href={`/api/download?path=${encodeURIComponent(selected.fullPath)}`}
              >
                Download
              </a>
              <button
                className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
              <a
                className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                target="_blank"
                rel="noreferrer"
                href={`/api/preview?path=${encodeURIComponent(selected.fullPath)}`}
              >
                Open Preview
              </a>
              <button
                className="ml-auto px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                disabled={saving}
                onClick={async () => {
                  if (!selected) return;
                  try {
                    setSaving(true);
                    setSaveError(null);
                    const res = await fetch('/api/updateEntry', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: selected.id, comment: commentDraft, tags: tagsDraft }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const updated: Entry = await res.json();
                    setSelected(updated);
                    setEntries((prev) => prev.map((e) => (e.id === updated.id ? { ...e, comment: updated.comment, tags: updated.tags } : e)));
                  } catch (err: any) {
                    setSaveError(String(err?.message || err));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {saveError && (
              <div className="mt-2 text-xs text-red-600">{saveError}</div>
            )}
            {showPreview && (
              <div className="mt-3 border rounded bg-gray-50 overflow-hidden">
                {/^image\//.test(selected.mimeType || "") ? (
                  <img
                    src={`/api/preview?path=${encodeURIComponent(selected.fullPath)}`}
                    alt="preview"
                    className="max-h-[60vh] w-full object-contain bg-white"
                  />
                ) : /^video\//.test(selected.mimeType || "") ? (
                  <video
                    className="w-full max-h-[60vh] bg-black"
                    controls
                    src={`/api/preview?path=${encodeURIComponent(selected.fullPath)}`}
                  />
                ) : (
                  <div className="p-3 text-xs text-gray-500">
                    No inline preview available for this type.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
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
