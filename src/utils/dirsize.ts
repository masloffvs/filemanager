import { promises as fs } from "fs";
import path from "path";
import { DIR_SIZE_TTL_MS } from "../config";

type CacheEntry = { size: number; expires: number; dirMtimeMs: number };
const cache = new Map<string, CacheEntry>();

async function getDirMtimeMs(absDir: string): Promise<number> {
  try {
    const st = await fs.stat(absDir);
    return st.mtimeMs;
  } catch {
    return 0;
  }
}

export async function getDirSize(absDir: string): Promise<number> {
  const now = Date.now();
  const dirMtimeMs = await getDirMtimeMs(absDir);
  const hit = cache.get(absDir);
  if (hit && hit.expires > now && hit.dirMtimeMs === dirMtimeMs) return hit.size;

  // iterative DFS to avoid deep recursion
  let total = 0;
  const stack: string[] = [absDir];
  while (stack.length) {
    const current = stack.pop()!;
    let entries: any[] = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(current, ent.name);
      try {
        if (ent.isDirectory()) {
          stack.push(p);
        } else if (ent.isFile()) {
          const st = await fs.stat(p);
          total += st.size;
        }
      } catch {
        // ignore unreadable entries
      }
    }
  }

  cache.set(absDir, { size: total, expires: now + DIR_SIZE_TTL_MS, dirMtimeMs });
  return total;
}

