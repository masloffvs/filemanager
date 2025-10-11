import { logger } from "./logger";
import * as fs from "fs";
import * as path from "path";
import FileDatabase, { type EntryType, type Entry } from "./fileDatabase";
import AutoTagger from "./autotag";
import type { AppConfig } from "./config";

function isShouldBeIgnored(
  entryPath: string,
  entryName: string,
  config: AppConfig | null
): boolean {
  if (!config?.walkerOptions?.ignoreNames) return false;
  for (const ignored of config.walkerOptions.ignoreNames) {
    if (config.walkerOptions.ignorePolicy === "fullPath") {
      if (entryPath.includes(ignored)) {
        logger.info(`Ignoring ${entryPath} due to ignore policy (fullPath)`, {
          path: entryPath,
          ignored,
          ignorePolicy: config.walkerOptions.ignorePolicy,
        });
        return true;
      }
    } else if (config.walkerOptions.ignorePolicy === "substring") {
      if (entryName.includes(ignored)) {
        logger.info(`Ignoring ${entryName} due to ignore policy (substring)`, {
          path: entryName,
          ignored,
          ignorePolicy: config.walkerOptions.ignorePolicy,
        });
        return true;
      }
    }
  }
  return false;
}

export default class Walker {
  parentPath: string = "";
  db: FileDatabase;
  autoTagger: AutoTagger;
  applicationConfig: AppConfig | null = null;

  constructor(db?: FileDatabase, applicationConfig: AppConfig | null = null) {
    this.db =
      db ??
      new FileDatabase(
        applicationConfig?.walkerOptions?.dbPath || ".index/walk.db"
      );
    this.autoTagger = new AutoTagger();
    this.autoTagger.loadDefault();
    this.applicationConfig = applicationConfig;
  }

  init(path = "") {
    this.parentPath = path;
    logger.debug(`Walker initialized with path: ${path}`);
  }

  async *walkWithParent(
    dirPath: string,
    parentId: string | null
  ): AsyncGenerator<any, number, void> {
    // Before creating dirEntry, check if it exists in DB and use its id if so
    const absDirPath = path.resolve(dirPath);
    let dirDbEntry = this.db.getEntryByPath(absDirPath);
    let dirId: string;
    if (dirDbEntry) {
      dirId = dirDbEntry.id;
    } else {
      dirId = this.db["idGenerator"]();
    }

    const stat = await fs.promises.stat(dirPath);
    const meta = {
      created: stat.birthtime?.toISOString?.() ?? null,
      lastModified: stat.mtime?.toISOString?.() ?? null,
    };

    const dirEntry = {
      id: dirId,
      type: "folder" as EntryType,
      path: absDirPath,
      size: null,
      mimeType: null,
      meta,
      parentId,
    };
    // First yield ensures parent exists in DB before children (FK safety)
    yield dirEntry;

    let folderSize = 0;
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (isShouldBeIgnored(dirPath, entry.name, this.applicationConfig)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      let entryType: EntryType;
      let size: number | null = null;
      let mimeType: string | null = null;
      let fileMeta: any = null;

      if (entry.isDirectory()) {
        // Recurse; add returned subfolder size to this folder
        const subSize = yield* this.walkWithParent(fullPath, dirId);
        folderSize += subSize;
      } else if (entry.isFile()) {
        entryType = "file";
        const stat = await fs.promises.stat(fullPath);
        try {
          mimeType = Bun.file(fullPath).type || null;
        } catch {
          mimeType = null;
        }
        size = stat.size;
        folderSize += size ?? 0;
        fileMeta = {
          created: stat.birthtime?.toISOString?.() ?? null,
          lastModified: stat.mtime?.toISOString?.() ?? null,
        };
        const fileEntry = {
          id: this.db["idGenerator"](),
          type: entryType,
          path: path.resolve(fullPath),
          size,
          mimeType,
          meta: fileMeta,
          parentId: dirId,
        };
        yield fileEntry;
      } else if (entry.isSymbolicLink()) {
        try {
          // Try to resolve the symlink and check what it points to
          const resolvedPath = await fs.promises.realpath(fullPath);
          const resolvedStat = await fs.promises.stat(resolvedPath);

          if (resolvedStat.isDirectory()) {
            // Symlink points to a directory - treat it as a phantom folder
            logger.info(
              `Processing symlink to directory: ${fullPath} -> ${resolvedPath}`
            );

            // Create phantom folder entry for the symlink itself
            const symlinkStat = await fs.promises.lstat(fullPath);
            const symlinkMeta = {
              created: symlinkStat.birthtime?.toISOString?.() ?? null,
              lastModified: symlinkStat.mtime?.toISOString?.() ?? null,
              symlinkTarget: resolvedPath, // Store the target path in meta
            };

            let symlinkDirId: string;
            const existingSymlinkEntry = this.db.getEntryByPath(
              path.resolve(fullPath)
            );
            if (existingSymlinkEntry) {
              symlinkDirId = existingSymlinkEntry.id;
            } else {
              symlinkDirId = this.db["idGenerator"]();
            }

            const phantomFolderEntry = {
              id: symlinkDirId,
              type: "folder" as EntryType,
              path: path.resolve(fullPath),
              size: null,
              mimeType: null,
              meta: symlinkMeta,
              parentId: dirId,
              isPhantomSymlink: true, // Mark as phantom symlink folder
            };
            yield phantomFolderEntry;

            // Now recursively index the contents of the symlink target
            // but using the symlink path as the virtual path
            const subSize = yield* this.walkSymlinkContents(
              resolvedPath,
              fullPath,
              symlinkDirId
            );
            folderSize += subSize;

            // Update the phantom folder with calculated size
            const updatedPhantomEntry = {
              ...phantomFolderEntry,
              size: subSize,
            };
            yield updatedPhantomEntry;
          } else {
            // Symlink points to a file - treat as regular symlink
            entryType = "link";
            const stat = await fs.promises.lstat(fullPath);
            fileMeta = {
              created: stat.birthtime?.toISOString?.() ?? null,
              lastModified: stat.mtime?.toISOString?.() ?? null,
              symlinkTarget: resolvedPath,
            };
            const linkEntry = {
              id: this.db["idGenerator"](),
              type: entryType,
              path: path.resolve(fullPath),
              size: null,
              mimeType: null,
              meta: fileMeta,
              parentId: dirId,
            };
            yield linkEntry;
          }
        } catch (err) {
          // Broken symlink or permission error - treat as regular link
          logger.warn(`Failed to resolve symlink ${fullPath}: ${err}`);
          entryType = "link";
          const stat = await fs.promises.lstat(fullPath);
          fileMeta = {
            created: stat.birthtime?.toISOString?.() ?? null,
            lastModified: stat.mtime?.toISOString?.() ?? null,
            broken: true,
          };
          const linkEntry = {
            id: this.db["idGenerator"](),
            type: entryType,
            path: path.resolve(fullPath),
            size: null,
            mimeType: null,
            meta: fileMeta,
            parentId: dirId,
          };
          yield linkEntry;
        }
      }
    }

    // Emit an updated directory entry with the computed recursive size
    const updatedDirEntry = {
      ...dirEntry,
      size: folderSize,
    };
    yield updatedDirEntry;

    // Return this folder's total size to the caller
    return folderSize;
  }

  async *walkSymlinkContents(
    realPath: string,
    virtualPath: string,
    parentId: string
  ): AsyncGenerator<any, number, void> {
    // Walk the real path but use virtual paths for DB entries
    let totalSize = 0;

    try {
      const entries = await fs.promises.readdir(realPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (isShouldBeIgnored(realPath, entry.name, this.applicationConfig)) {
          continue;
        }

        const realFullPath = path.join(realPath, entry.name);
        const virtualFullPath = path.join(virtualPath, entry.name);

        if (entry.isDirectory()) {
          // Create virtual directory entry
          const stat = await fs.promises.stat(realFullPath);
          const meta = {
            created: stat.birthtime?.toISOString?.() ?? null,
            lastModified: stat.mtime?.toISOString?.() ?? null,
            realPath: realFullPath, // Store real path in meta
          };

          let dirId: string;
          const existingDir = this.db.getEntryByPath(
            path.resolve(virtualFullPath)
          );
          if (existingDir) {
            dirId = existingDir.id;
          } else {
            dirId = this.db["idGenerator"]();
          }

          const dirEntry = {
            id: dirId,
            type: "folder" as EntryType,
            path: path.resolve(virtualFullPath),
            size: null,
            mimeType: null,
            meta,
            parentId,
            isPhantomSymlink: true, // Mark as phantom since it's from symlink
          };
          yield dirEntry;

          // Recursively walk subdirectory
          const subSize = yield* this.walkSymlinkContents(
            realFullPath,
            virtualFullPath,
            dirId
          );
          totalSize += subSize;

          // Update directory with calculated size
          const updatedDirEntry = {
            ...dirEntry,
            size: subSize,
          };
          yield updatedDirEntry;
        } else if (entry.isFile()) {
          // Create virtual file entry
          const stat = await fs.promises.stat(realFullPath);
          let mimeType: string | null = null;
          try {
            mimeType = Bun.file(realFullPath).type || null;
          } catch {
            mimeType = null;
          }

          const fileMeta = {
            created: stat.birthtime?.toISOString?.() ?? null,
            lastModified: stat.mtime?.toISOString?.() ?? null,
            realPath: realFullPath, // Store real path in meta
          };

          const fileEntry = {
            id: this.db["idGenerator"](),
            type: "file" as EntryType,
            path: path.resolve(virtualFullPath),
            size: stat.size,
            mimeType,
            meta: fileMeta,
            parentId,
            isPhantomSymlink: true, // Mark as phantom since it's from symlink
          };
          yield fileEntry;
          totalSize += stat.size ?? 0;
        } else if (entry.isSymbolicLink()) {
          // Handle nested symlinks - for now treat as regular links
          try {
            const nestedTarget = await fs.promises.realpath(realFullPath);
            const stat = await fs.promises.lstat(realFullPath);
            const linkMeta = {
              created: stat.birthtime?.toISOString?.() ?? null,
              lastModified: stat.mtime?.toISOString?.() ?? null,
              symlinkTarget: nestedTarget,
              realPath: realFullPath,
            };

            const linkEntry = {
              id: this.db["idGenerator"](),
              type: "link" as EntryType,
              path: path.resolve(virtualFullPath),
              size: null,
              mimeType: null,
              meta: linkMeta,
              parentId,
              isPhantomSymlink: true,
            };
            yield linkEntry;
          } catch (err) {
            logger.warn(
              `Failed to resolve nested symlink ${realFullPath}: ${err}`
            );
          }
        }
      }
    } catch (err) {
      logger.error(`Failed to read symlink contents ${realPath}: ${err}`);
    }

    return totalSize;
  }

  async entrypoint() {
    if (!this.parentPath) {
      logger.error("No path set. Call init(path) first.");
      return;
    }
    const absRoot = path.resolve(this.parentPath);
    logger.info(`Indexing path: ${absRoot}`);
    const seen = new Set<string>();
    for await (const entry of this.walkWithParent(absRoot, null)) {
      try {
        const existing: Entry | null = this.db.getEntryByPath(entry.path);
        seen.add(entry.path);
        if (existing != null) {
          // Ignore user-managed fields (comment, tags) for change detection and updates
          const incoming: any = { ...entry };
          delete incoming.comment;
          delete incoming.tags;
          const changed =
            existing.type !== incoming.type ||
            existing.size !== incoming.size ||
            existing.mimeType !== incoming.mimeType ||
            JSON.stringify(existing.meta) !== JSON.stringify(incoming.meta) ||
            existing.parentId !== incoming.parentId ||
            existing.isPhantomSymlink !== (incoming.isPhantomSymlink ?? false);
          if (changed) {
            const payload = { ...existing, ...incoming, id: existing.id };
            this.db.updateEntry(payload as Entry);
            //logger.info(`Updated Entry in DB:`, payload);
          }
        } else {
          // New entry: apply auto-tags once (non-destructive; user edits are preserved later)
          let tags: string[] | null = null;
          try {
            tags = this.autoTagger.tagsFor(
              entry.path,
              (entry as any).mimeType ?? null
            );
          } catch {}
          const createInput =
            tags && tags.length > 0
              ? { ...(entry as any), tags }
              : (entry as any);
          this.db.createEntry(createInput);
          logger.info(`Created Entry in DB:`, entry);
        }
      } catch (err) {
        logger.error(`Failed to write entry for ${entry.path}: ${err}`);
      }
    }

    // Remove entries from DB that are under absRoot but were not seen AND no longer exist on disk
    try {
      const candidates = this.db.listByPathPrefix(absRoot);
      let removed = 0;
      for (const e of candidates) {
        if (seen.has(e.path)) continue;
        // If path still exists (e.g., permission denied subfolder), keep it
        const exists = fs.existsSync(e.path);
        if (!exists) {
          if (this.db.deleteEntry(e.id)) {
            removed++;
            logger.info(`Removed stale entry: ${e.path}`);
          }
        }
      }
      if (removed > 0) {
        logger.info(
          `Cleanup complete. Removed ${removed} stale entr${
            removed === 1 ? "y" : "ies"
          }.`
        );
      }
    } catch (err) {
      logger.error(`Cleanup failed: ${err}`);
    }
  }
}
