import path from "path";

export type FileKind = "archive" | "executable" | "database" | "script" | "network" | "key" | "i18n" | "encrypted" | "design";

export function classifyFileKind(absPath: string, mode: number): { kind?: FileKind; isExec?: boolean } {
  const ext = path.extname(absPath).toLowerCase().replace(/^\./, "");
  const isExec = (mode & 0o111) !== 0;

  const inSet = (s: string[], v: string) => s.includes(v);

  const archives = ["zip","tar","gz","bz2","xz","7z","rar","tgz","tbz","txz","tar.gz","tar.bz2","tar.xz"];
  const scripts = ["sh","bash","zsh","fish","ps1","bat","cmd"];
  const dbs = ["sqlite","db","sql","mdb","accdb","sqlite3","ldb","ndb","parquet","feather","orc","mdb","dbf"];
  const nets = ["pcap","pcapng","cap","har"];
  const keys = ["pem","crt","cer","der","p7b","pfx","p12","key","pub","asc","gpg","age","cert"];
  const i18n = ["po","pot","mo","arb"];
  const encrypted = ["gpg","age","enc","crypt","kdbx"];
  const design = ["fig","sketch","psd","ai","xd","cdr","afdesign","afphoto","afpub"];

  if (inSet(archives, ext)) return { kind: "archive", isExec };
  if (isExec) return { kind: "executable", isExec };
  if (inSet(scripts, ext)) return { kind: "script", isExec };
  if (inSet(dbs, ext)) return { kind: "database", isExec };
  if (inSet(nets, ext)) return { kind: "network", isExec };
  if (inSet(keys, ext)) return { kind: "key", isExec };
  if (inSet(i18n, ext)) return { kind: "i18n", isExec };
  if (inSet(encrypted, ext)) return { kind: "encrypted", isExec };
  if (inSet(design, ext)) return { kind: "design", isExec };
  return { isExec };
}

