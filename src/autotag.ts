import * as fs from "fs";
import * as path from "path";

export type TagRule = {
  patterns: string[];
  tags: string[];
  regexes: RegExp[]; // compiled from patterns (anchored)
  segmentPatterns: string[]; // plain segment equals match (lowercased)
};

function globToRegExp(glob: string, flags: string = "i"): RegExp {
  // Very small glob -> regex: * -> .*, ? -> . ; anchor whole string
  // Escape regex specials except * and ?
  const esc = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  let pattern = "^";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*") pattern += ".*";
    else if (ch === "?") pattern += ".";
    else pattern += esc(ch);
  }
  pattern += "$";
  return new RegExp(pattern, flags);
}

function normalizeTag(tag: string): string {
  const t = tag.trim();
  if (!t) return t;
  return t.replace(/^#+/, "").trim();
}

export class AutoTagger {
  private rules: TagRule[] = [];
  private configPath: string | null = null;

  constructor(configPath?: string) {
    if (configPath) this.configPath = configPath;
  }

  load(filePath?: string) {
    const p = filePath ?? this.configPath ?? path.resolve(process.cwd(), ".autotags");
    this.configPath = p;
    this.rules = [];
    if (!fs.existsSync(p)) return;
    const text = fs.readFileSync(p, "utf8");
    const lines = text.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      // pattern[,pattern2]: [#tag, #tag2]  (allow trailing comments)
      const m = line.match(/^(.+?):\s*\[(.+?)\]\s*(?:#.*)?$/);
      if (!m) continue;
      const patterns = m[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const tags = m[2]
        .split(",")
        .map((s) => normalizeTag(s))
        .filter(Boolean);
      if (patterns.length === 0 || tags.length === 0) continue;
      const regexes = patterns.map((p) => globToRegExp(p, "i"));
      const segmentPatterns = patterns
        .filter((p) => !/[\\/]/.test(p) && !/[\*\?]/.test(p))
        .map((p) => p.toLowerCase());
      this.rules.push({ patterns, tags, regexes, segmentPatterns });
    }
  }

  loadDefault() {
    this.load();
  }

  tagsFor(filePath: string, mimeType?: string | null): string[] {
    const base = path.basename(filePath);
    const full = filePath;
    const normFull = full.replace(/\\/g, "/");
    const segments = normFull.split("/").filter(Boolean).map((s) => s.toLowerCase());
    const tags: string[] = [];
    for (const rule of this.rules) {
      const matched =
        rule.regexes.some((rx) => rx.test(base) || rx.test(full)) ||
        (rule.segmentPatterns.length > 0 &&
          rule.segmentPatterns.some((seg) => segments.includes(seg)));
      if (matched) {
        for (const t of rule.tags) if (!tags.includes(t)) tags.push(t);
      }
    }
    // Optionally, derive from mime type (simple hints)
    if (mimeType) {
      if (/^image\//i.test(mimeType) && !tags.includes("image")) tags.push("image");
      if (/^video\//i.test(mimeType) && !tags.includes("video")) tags.push("video");
      if (/^audio\//i.test(mimeType) && !tags.includes("audio")) tags.push("audio");
    }
    return tags;
  }
}

export default AutoTagger;
