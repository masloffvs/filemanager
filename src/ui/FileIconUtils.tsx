import React from "react";
import type { Entry } from "./types";
import {
  FolderIcon,
  LinkIcon,
  VideoIcon,
  PhotoIcon,
  ExecIcon,
  PresentationIcon,
  DatabaseIcon,
  RustIcon,
  ShellIcon,
  VMIcon,
  KeyIcon,
  PcapIcon,
  ArchiveIcon,
  CertIcon,
  FileIcon,
} from "./Icons";

const ICON_RULES: { test: (e: Entry) => boolean; icon: React.JSX.Element }[] = [
  { test: (e) => e.type === "folder", icon: FolderIcon },
  { test: (e) => e.type === "link", icon: LinkIcon },
  { test: (e) => !!e.mimeType?.startsWith("video/"), icon: VideoIcon },
  { test: (e) => !!e.mimeType?.startsWith("image/"), icon: PhotoIcon },

  // Executables
  {
    test: (e) =>
      [
        "application/x-executable",
        "application/x-msdownload",
        "application/x-msdos-program",
      ].includes(e.mimeType ?? "") ||
      /\.(exe|bin|dll|so|dylib|app|run|out)$/i.test(e.path),
    icon: ExecIcon,
  },

  // Presentations
  {
    test: (e) =>
      [
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ].includes(e.mimeType ?? "") || /\.(ppt|pptx)$/i.test(e.path),
    icon: PresentationIcon,
  },

  // Databases
  {
    test: (e) =>
      ["application/x-sqlite3", "application/vnd.sqlite3"].includes(
        e.mimeType ?? ""
      ) || /\.(sqlite|db|sqlite3)$/i.test(e.path),
    icon: DatabaseIcon,
  },

  { test: (e) => /Cargo\.toml$|\.rs$/i.test(e.path), icon: RustIcon },

  // Shell
  {
    test: (e) =>
      ["application/x-sh", "application/x-shellscript"].includes(
        e.mimeType ?? ""
      ) || /\.(sh|zsh|bash)$/i.test(e.path),
    icon: ShellIcon,
  },

  { test: (e) => /\.(vmdk|vdi|qcow2|img|iso)$/i.test(e.path), icon: VMIcon },

  {
    test: (e) =>
      /\.(key|pem|crt|cer|p12|pfx|asc)$/i.test(e.path) ||
      (e.mimeType ? /x-pem|x-x509|x-pkcs/.test(e.mimeType) : false),
    icon: KeyIcon,
  },

  { test: (e) => /\.(pcap|cap)$/i.test(e.path), icon: PcapIcon },

  {
    test: (e) =>
      [
        "application/zip",
        "application/x-tar",
        "application/x-7z-compressed",
        "application/x-rar-compressed",
      ].includes(e.mimeType ?? "") ||
      /\.(zip|tar|gz|tgz|bz2|xz|7z|rar|iso)$/i.test(e.path),
    icon: ArchiveIcon,
  },

  { test: (e) => /\.(pem|crt|cer|cert)$/i.test(e.path), icon: CertIcon },
];

export function getFileIcon(e: Entry): React.JSX.Element {
  const rule = ICON_RULES.find((r) => r.test(e));
  return rule ? rule.icon : FileIcon;
}
