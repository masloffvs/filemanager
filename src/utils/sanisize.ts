export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}
export function sanitizeFolderName(folderName: string): string {
  return folderName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

export function sanitizePathTraversal(path: string): string {
  if (!path) return path;

  if (path === "." || path === "..") {
    throw new Error("Invalid path: path cannot be '.' or '..'");
  }

  const segments = path.split(/[/\\]+/);

  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new Error("Invalid path: path cannot contain '.' or '..'");
    }
  }

  if (path.includes("\0")) {
    throw new Error("Invalid path: path cannot contain null bytes");
  }

  path = path.replace(/\\/g, "/");
  path = path.replace(/\/+/g, "/");

  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return path;
}
