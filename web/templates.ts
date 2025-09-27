import { ApiListResponse, Breadcrumb, FileInfo } from "../src/types";
import { encodeRelForUrl } from "../src/utils/path";
import { makeBreadcrumbs } from "../src/utils/breadcrumbs";

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function prettyBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"]; let i = -1; do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

export function timeHM(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function dayLabel(isoMidnight: string) {
  return new Date(isoMidnight).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function renderNameWithExt(name: string) {
  const i = name.lastIndexOf("."); if (i <= 0 || i === name.length - 1) return escapeHtml(name);
  const base = escapeHtml(name.slice(0, i)); const ext = escapeHtml(name.slice(i));
  return `${base}<span class="ext">${ext}</span>`;
}

type FileGroups = Array<{ day: string; items: FileInfo[] }>;
function groupFilesByDay(files: FileInfo[]): FileGroups {
  const map = new Map<string, FileInfo[]>();
  for (const f of files) {
    const dt = new Date(f.mtime);
    const stamp = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toISOString();
    const label = dayLabel(stamp);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(f);
  }
  const groups = Array.from(map.entries()).map(([day, items]) => {
    items.sort((a, b) => +new Date(b.mtime) - +new Date(a.mtime));
    return { day, items };
  });
  groups.sort((a, b) => +new Date(b.items[0]?.mtime ?? 0) - +new Date(a.items[0]?.mtime ?? 0)).reverse();
  return groups;
}

export { makeBreadcrumbs };

let LIST_TEMPLATE_CACHE: string | null = null;

export async function renderHtmlList(base: string, payload: ApiListResponse) {
  const { cwd, dirs, files, breadcrumbs } = payload;
  const groups = groupFilesByDay(files);

  const bc = breadcrumbs.map((c, i) => {
    const href = i === breadcrumbs.length - 1 ? null : `${base}/browse/${encodeRelForUrl(c.rel)}`;
    return href ? `<a class="crumb" href="${href}">${escapeHtml(c.name)}</a>` : `<span class="crumb current">${escapeHtml(c.name)}</span>`;
  }).join('<span class="crumb-sep"> / </span>');

  const upRel = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].rel : null;
  const upLink = upRel !== null ? `<a class="up" href="${base}/browse/${encodeRelForUrl(upRel)}">cd ..</a>` : "";

  const dirItems = dirs.map((d) => {
    const left = `<a class="link" href="${base}/browse/${encodeRelForUrl(d.rel)}">📁 ${escapeHtml(d.name)}/</a>`;
    const right = `<span class="meta">${escapeHtml(dayLabel(new Date(d.mtime).toISOString()))} · ${escapeHtml(timeHM(d.mtime))}</span>`;
    return `<li class="row dir"><div class="left">${left}</div><div class="right">${right}</div></li>`;
  }).join("\n");

  const fileGroupsHtml = groups.length === 0 ? "" : groups.map((g) => {
    const header = `<h2 class="day">${escapeHtml(g.day)}</h2>`;
    const items = g.items.map((f) => {
      const left = `<a class="link" href="${base}/files/${encodeRelForUrl(f.rel)}" download>${renderNameWithExt(f.name)}</a>`;
      const right = `<span class="meta">${escapeHtml(prettyBytes(f.size))} · ${escapeHtml(timeHM(f.mtime))}</span>`;
      return `<li class="row"><div class="left">${left}</div><div class="right">${right}</div></li>`;
    }).join("\n");
    return `${header}\n<ul class="list">${items}</ul>`;
  }).join("\n");

  if (!LIST_TEMPLATE_CACHE) {
    LIST_TEMPLATE_CACHE = await Bun.file("web/list.html").text();
  }

  return LIST_TEMPLATE_CACHE
    .replaceAll("{{TITLE_PATH}}", escapeHtml(cwd ? "/" + cwd : ""))
    .replaceAll("{{BREADCRUMBS}}", bc)
    .replaceAll("{{UPLINK}}", upLink)
    .replaceAll("{{DIR_SECTION}}", dirs.length ? `<div class="section-title">Directories</div><ul class="list">${dirItems}</ul>` : "")
    .replaceAll("{{FILES_SECTION}}", files.length ? `<div class="section-title">Files</div>${fileGroupsHtml}` : `<div class="empty">— empty —</div>`)
    .replaceAll("{{BASE}}", base);
}
