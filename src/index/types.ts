export interface IndexedFile {
  id: string;
  name: string;
  rel: string; // relative to disk root
  size: number;
  mtime: number; // ms epoch
  isLink?: boolean;
  mediaKind?: "image" | "video" | "audio";
}

export interface IndexedDir {
  rel: string; // '' for root
  mtime: number; // ms epoch
  size: number; // aggregated size of all descendant files
  childrenDirs: string[]; // names
  childrenFiles: string[]; // names
}

export interface DiskIndex {
  disk: string; // disk name
  root: string; // absolute path
  builtAt: number;
  files: Record<string, IndexedFile>; // key: rel
  dirs: Record<string, IndexedDir>; // key: rel
}

