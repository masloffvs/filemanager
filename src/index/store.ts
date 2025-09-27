import { promises as fs } from "fs";
import path from "path";
import { DiskIndex } from "./types";
import { INDEX_DIR } from "../config";
import { log } from "../utils/log";

const indices = new Map<string, DiskIndex>();

export function setIndex(disk: string, index: DiskIndex) {
  indices.set(disk, index);
}

export function getIndex(disk: string): DiskIndex | undefined {
  return indices.get(disk);
}

export async function saveIndex(index: DiskIndex) {
  await fs.mkdir(INDEX_DIR, { recursive: true });
  const file = path.join(INDEX_DIR, `${index.disk}.json`);
  await fs.writeFile(file, JSON.stringify(index));
  log("indexer", "store", "saved index", { disk: index.disk, file });
}

export async function loadIndex(disk: string): Promise<DiskIndex | null> {
  try {
    const file = path.join(INDEX_DIR, `${disk}.json`);
    const txt = await fs.readFile(file, "utf-8");
    const idx = JSON.parse(txt) as DiskIndex;
    indices.set(disk, idx);
    return idx;
  } catch {
    return null;
  }
}

