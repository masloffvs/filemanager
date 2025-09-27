export type FsStats = { total: number; used: number; available: number; usedPercent?: number };

export async function getFsStats(targetPath: string): Promise<FsStats | null> {
  try {
    const p = Bun.spawn(["df", "-k", targetPath]);
    const { stdout } = await p.exited;
    const text = await new Response(p.stdout).text();
    const lines = text.trim().split(/\r?\n/);
    const line = lines[lines.length - 1];
    const parts = line.trim().split(/\s+/);
    // Try macOS/BSD layout: Filesystem 1024-blocks Used Available Capacity Mounted on
    // parts: [fs, blocks, used, avail, capacity, ...]
    if (parts.length >= 5) {
      const kbTotal = parseInt(parts[1], 10);
      const kbUsed = parseInt(parts[2], 10);
      const kbAvail = parseInt(parts[3], 10);
      const capStr = parts[4];
      const usedPercent = /([0-9]+)%/.exec(capStr)?.[1];
      return {
        total: kbTotal * 1024,
        used: kbUsed * 1024,
        available: kbAvail * 1024,
        usedPercent: usedPercent ? Number(usedPercent) : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

