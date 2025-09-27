import { ApiListResponse, Breadcrumb, FileInfo } from "../src/types";
import { encodeRelForUrl } from "../src/utils/path";
import { makeBreadcrumbs } from "../src/utils/breadcrumbs";

export function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ]!)
  );
}

export function prettyBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do {
    n /= 1024;
    i++;
  } while (n >= 1024 && i < units.length - 1);
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

export function timeHM(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function dayLabel(isoMidnight: string) {
  return new Date(isoMidnight).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function renderNameWithExt(name: string) {
  const i = name.lastIndexOf(".");
  if (i <= 0 || i === name.length - 1) return escapeHtml(name);
  const base = escapeHtml(name.slice(0, i));
  const ext = escapeHtml(name.slice(i));
  return `${base}<span class="ext">${ext}</span>`;
}

type FileGroups = Array<{ day: string; items: FileInfo[] }>;
function groupFilesByDay(files: FileInfo[]): FileGroups {
  const map = new Map<string, FileInfo[]>();
  for (const f of files) {
    const dt = new Date(f.mtime);
    const stamp = new Date(
      dt.getFullYear(),
      dt.getMonth(),
      dt.getDate()
    ).toISOString();
    const label = dayLabel(stamp);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(f);
  }
  const groups = Array.from(map.entries()).map(([day, items]) => {
    items.sort((a, b) => +new Date(b.mtime) - +new Date(a.mtime));
    return { day, items };
  });
  groups
    .sort(
      (a, b) =>
        +new Date(b.items[0]?.mtime ?? 0) - +new Date(a.items[0]?.mtime ?? 0)
    )
    .reverse();
  return groups;
}

export { makeBreadcrumbs };

let LIST_TEMPLATE_CACHE: string | null = null;
let DISKS_TEMPLATE_CACHE: string | null = null;

export async function renderHtmlList(
  base: string,
  payload: ApiListResponse,
  opts: { browsePrefix?: string; filePrefix?: string } = {}
) {
  const { browsePrefix = "", filePrefix = "" } = opts;
  const { cwd, dirs, files, breadcrumbs } = payload;

  const FOLDER_SVG =
    '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9c-.546 0-1.059.146-1.5.401V3.5ZM2 9.5v3A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 12.5 8h-9A1.5 1.5 0 0 0 2 9.5Z"/></svg>';
  const FILE_SVG =
    '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h4.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12a1.5 1.5 0 0 1 .439 1.061V12.5A1.5 1.5 0 0 1 12 14H4a1.5 1.5 0 0 1-1.5-1.5v-9Z"/></svg>';
  const EMPTY_SVG =
    '<svg class="icon-xl" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M15 11a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6ZM7.25 7.5a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0-.5.5V8a.5.5 0 0 0 .5.5h3.75a.5.5 0 0 0 .5-.5v-.5Zm1.5 3a.5.5 0 0 1 .5-.5H13a.5.5 0 0 1 .5.5v.5a.5.5 0 0 1-.5.5H9.25a.5.5 0 0 1-.5-.5v-.5ZM13.5 8v-.5A.5.5 0 0 0 13 7H9.25a.5.5 0 0 0-.5.5V8a.5.5 0 0 0 .5.5H13a.5.5 0 0 0 .5-.5Zm-6.75 3.5a.5.5 0 0 0 .5-.5v-.5a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0-.5.5v.5a.5.5 0 0 0 .5.5h3.75Z" clip-rule="evenodd"/></svg>';
  const LINK_SVG =
    '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.396-4.402.75.75 0 0 1 1.251.827 2 2 0 0 0 3.085 2.514l2-2a2 2 0 0 0 0-2.828.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 5.396 4.402.75.75 0 0 1-1.251-.827 2 2 0 0 0-3.085-2.514l-2 2a2 2 0 0 0 0 2.828.75.75 0 0 1 0 1.06Z" clip-rule="evenodd"/></svg>';
  const VIDEO_SVG =
    '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H3ZM15 4.75a.75.75 0 0 0-1.28-.53l-2 2a.75.75 0 0 0-.22.53v2.5c0 .199.079.39.22.53l2 2a.75.75 0 0 0 1.28-.53v-6.5Z"/></svg>';
  const PHOTO_SVG =
    '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/><path fill-rule="evenodd" d="M2.5 5A1.5 1.5 0 0 0 1 6.5v5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 13.5 5h-.879a1.5 1.5 0 0 1-1.06-.44l-1.122-1.12A1.5 1.5 0 0 0 9.38 3H6.62a1.5 1.5 0 0 0-1.06.44L4.439 4.56A1.5 1.5 0 0 1 3.38 5H2.5ZM11 8.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clip-rule="evenodd"/></svg>';
  const AUDIO_SVG =
    '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M14 1.75a.75.75 0 0 0-.89-.737l-7.502 1.43a.75.75 0 0 0-.61.736v2.5c0 .018 0 .036.002.054V9.73a1 1 0 0 1-.813.983l-.58.11a1.978 1.978 0 0 0 .741 3.886l.603-.115c.9-.171 1.55-.957 1.55-1.873v-1.543l-.001-.043V6.3l6-1.143v3.146a1 1 0 0 1-.813.982l-.584.111a1.978 1.978 0 0 0 .74 3.886l.326-.062A2.252 2.252 0 0 0 14 11.007V1.75Z"/></svg>';
  const ARCHIVE_SVG = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3Z"/><path fill-rule="evenodd" d="M3 6h10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm3 2.75A.75.75 0 0 1 6.75 8h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 8.75Z" clip-rule="evenodd"/></svg>';
  const EXEC_SVG = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9.58 1.077a.75.75 0 0 1 .405.82L9.165 6h4.085a.75.75 0 0 1 .567 1.241l-6.5 7.5a.75.75 0 0 1-1.302-.638L6.835 10H2.75a.75.75 0 0 1-.567-1.241l6.5-7.5a.75.75 0 0 1 .897-.182Z" clip-rule="evenodd"/></svg>';
  const DB_SVG = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 7c3.314 0 6-1.343 6-3s-2.686-3-6-3-6 1.343-6 3 2.686 3 6 3Z"/><path d="M8 8.5c1.84 0 3.579-.37 4.914-1.037A6.33 6.33 0 0 0 14 6.78V8c0 1.657-2.686 3-6 3S2 9.657 2 8V6.78c.346.273.72.5 1.087.683C4.42 8.131 6.16 8.5 8 8.5Z"/><path d="M8 12.5c1.84 0 3.579-.37 4.914-1.037.366-.183.74-.41 1.086-.684V12c0 1.657-2.686 3-6 3s-6-1.343-6-3v-1.22c.346.273.72.5 1.087.683C4.42 12.131 6.16 12.5 8 12.5Z"/></svg>';
  const SCRIPT_SVG = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm2.22 1.97a.75.75 0 0 0 0 1.06l.97.97-.97.97a.75.75 0 1 0 1.06 1.06l1.5-1.5a.75.75 0 0 0 0-1.06l-1.5-1.5a.75.75 0 0 0-1.06 0ZM8.75 8.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clip-rule="evenodd"/></svg>';
  const NET_SVG = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M3.757 4.5c.18.217.376.42.586.608.153-.61.354-1.175.596-1.678A5.53 5.53 0 0 0 3.757 4.5ZM8 1a6.994 6.994 0 0 0-7 7 7 7 0 1 0 7-7Zm0 1.5c-.476 0-1.091.386-1.633 1.427-.293.564-.531 1.267-.683 2.063A5.48 5.48 0 0 0 8 6.5a5.48 5.48 0 0 0 2.316-.51c-.152-.796-.39-1.499-.683-2.063C9.09 2.886 8.476 2.5 8 2.5Zm3.657 2.608a8.823 8.823 0 0 0-.596-1.678c.444.298.842.659 1.182 1.07-.18.217-.376.42-.586.608Zm-1.166 2.436A6.983 6.983 0 0 1 8 8a6.983 6.983 0 0 1-2.49-.456 10.703 10.703 0 0 0 .202 2.6c.72.231 1.49.356 2.288.356.798 0 1.568-.125 2.29-.356a10.705 10.705 0 0 0 .2-2.6Zm1.433 1.85a12.652 12.652 0 0 0 .018-2.609c.405-.276.78-.594 1.117-.947a5.48 5.48 0 0 1 .44 2.262 7.536 7.536 0 0 1-1.575 1.293Zm-2.172 2.435a9.046 9.046 0 0 1-3.504 0c.039.084.078.166.12.244C6.907 13.114 7.523 13.5 8 13.5s1.091-.386 1.633-1.427c.04-.078.08-.16.12-.244Zm1.31.74a8.5 8.5 0 0 0 .492-1.298c.457-.197.893-.43 1.307-.696a5.526 5.526 0 0 1-1.8 1.995Zm-6.123 0a8.507 8.507 0 0 1-.493-1.298 8.985 8.985 0 0 1-1.307-.696 5.526 5.526 0 0 0 1.8 1.995ZM2.5 8.1c.463.5.993.935 1.575 1.293a12.652 12.652 0 0 1-.018-2.608 7.037 7.037 0 0 1-1.117-.947 5.48 5.48 0 0 0-.44 2.262Z" clip-rule="evenodd"/></svg>';
  const KEY_SVG = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z" clip-rule="evenodd"/></svg>';
  const I18N_SVG = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M11 5a.75.75 0 0 1 .688.452l3.25 7.5a.75.75 0 1 1-1.376.596L12.89 12H9.109l-.67 1.548a.75.75 0 1 1-1.377-.596l3.25-7.5A.75.75 0 0 1 11 5Zm-1.24 5.5h2.48L11 7.636 9.76 10.5ZM5 1a.75.75 0 0 1 .75.75v1.261a25.27 25.27 0 0 1 2.598.211.75.75 0 1 1-.2 1.487c-.22-.03-.44-.056-.662-.08A12.939 12.939 0 0 1 5.92 8.058c.237.304.488.595.752.873a.75.75 0 0 1-1.086 1.035A13.075 13.075 0 0 1 5 9.307a13.068 13.068 0 0 1-2.841 2.546.75.75 0 0 1-.827-1.252A11.566 11.566 0 0 0 4.08 8.057a12.991 12.991 0 0 1-.554-.938.75.75 0 1 1 1.323-.707c.049.09.099.181.15.271.388-.68.708-1.405.952-2.164a23.941 23.941 0 0 0-4.1.19.75.75 0 0 1-.2-1.487c.853-.114 1.72-.185 2.598-.211V1.75A.75.75 0 0 1 5 1Z" clip-rule="evenodd"/></svg>';
  const ENCRYPTED_SVG = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clip-rule="evenodd"/></svg>';
  const DESIGN_SVG = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M12.613 1.258a1.535 1.535 0 0 1 2.13 2.129l-1.905 2.856a8 8 0 0 1-3.56 2.939 4.011 4.011 0 0 0-2.46-2.46 8 8 0 0 1 2.94-3.56l2.855-1.904ZM5.5 8A2.5 2.5 0 0 0 3 10.5a.5.5 0 0 1-.7.459.75.75 0 0 0-.983 1A3.5 3.5 0 0 0 8 10.5 2.5 2.5 0 0 0 5.5 8Z"/></svg>';

  const bc = breadcrumbs
    .map((c, i) => {
      const href =
        i === breadcrumbs.length - 1
          ? null
          : `${base}/browse${browsePrefix}/${encodeRelForUrl(c.rel)}`;
      return href
        ? `<a class="crumb" href="${href}">${escapeHtml(c.name)}</a>`
        : `<span class="crumb current">${escapeHtml(c.name)}</span>`;
    })
    .join('<span class="crumb-sep"> / </span>');

  const upRel =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].rel : null;
  const upLink =
    upRel !== null
      ? `<a class="up" href="${base}/browse${browsePrefix}/${encodeRelForUrl(upRel)}">cd ..</a>`
      : "";

  const dirItems = dirs
    .map((d) => {
      const left = `<a class="link" data-kind="dir" data-rel="${encodeRelForUrl(d.rel)}" href="${base}/browse${browsePrefix}/${encodeRelForUrl(d.rel)}">${FOLDER_SVG}<span class="fname">${escapeHtml(d.name)}/</span></a>`;
      const size =
        (d as any).size != null ? prettyBytes(Number((d as any).size)) : "";
      const right = size
        ? `<span class="meta">${escapeHtml(size)} · ${escapeHtml(
            timeHM(d.mtime)
          )}</span>`
        : `<span class="meta">${escapeHtml(timeHM(d.mtime))}</span>`;
      return `<li class="row dir"><div class="left">${left}</div><div class="right">${right}</div></li>`;
    })
    .join("");

  const fileItems = files
    .map((f) => {
      const icon = (f as any).isLink
        ? LINK_SVG
        : (f as any).mediaKind === "image"
        ? PHOTO_SVG
        : (f as any).mediaKind === "video"
        ? VIDEO_SVG
        : (f as any).mediaKind === "audio"
        ? AUDIO_SVG
        : (f as any).fileKind === 'archive' ? ARCHIVE_SVG
        : (f as any).fileKind === 'executable' ? EXEC_SVG
        : (f as any).fileKind === 'database' ? DB_SVG
        : (f as any).fileKind === 'script' ? SCRIPT_SVG
        : (f as any).fileKind === 'network' ? NET_SVG
        : (f as any).fileKind === 'key' ? KEY_SVG
        : (f as any).fileKind === 'i18n' ? I18N_SVG
        : (f as any).fileKind === 'encrypted' ? ENCRYPTED_SVG
        : (f as any).fileKind === 'design' ? DESIGN_SVG
        : FILE_SVG;
      const downloadAttr =
        (f as any).mediaKind === "image" || (f as any).mediaKind === "video"
          ? ""
          : " download";
      const left = `<a class="link" data-kind="file" href="${base}/files${filePrefix}/${encodeRelForUrl(f.rel)}"${downloadAttr}>${icon}<span class="fname">${renderNameWithExt(
        f.name
      )}</span></a>`;
      const right = `<span class="meta">${escapeHtml(prettyBytes(f.size))} · ${escapeHtml(
        timeHM(f.mtime)
      )}</span>`;
      return `<li class="row"><div class="left">${left}</div><div class="right">${right}</div></li>`;
    })
    .join("");

  if (!LIST_TEMPLATE_CACHE) {
    LIST_TEMPLATE_CACHE = await Bun.file("web/list.html").text();
  }

  const gap = (dirItems && fileItems) ? '<li class="gap" aria-hidden="true"></li>' : '';
  const allRows = (dirItems + gap + fileItems).trim();
  const listSection = allRows
    ? `<ul class="list" id="list">${allRows}</ul>`
    : `<div class="empty">${EMPTY_SVG}<div class="empty-text">This folder is empty</div></div>`;

  return LIST_TEMPLATE_CACHE.replaceAll(
    "{{TITLE_PATH}}",
    escapeHtml(cwd ? "/" + cwd : "")
  )
    .replaceAll("{{BREADCRUMBS}}", bc)
    .replaceAll("{{UPLINK}}", upLink)
    .replaceAll("{{CWD}}", cwd)
    .replaceAll("{{DISK}}", (browsePrefix || "/storage").replace(/^\//, "") || "storage")
    .replaceAll("{{DIR_SECTION}}", listSection)
    .replaceAll("{{FILES_SECTION}}", "")
    .replaceAll("{{BASE}}", base);
}

export async function renderDisks(base: string, disks: Array<{ name: string; path: string; size?: number; builtAt?: number; total?: number; used?: number; available?: number; usedPercent?: number }>) {
  if (!DISKS_TEMPLATE_CACHE) DISKS_TEMPLATE_CACHE = await Bun.file("web/disks.html").text();
  const items = disks.map(d => {
    const indexed = d.size != null ? `indexed ${prettyBytes(d.size)}` : '';
    const built = d.builtAt ? ` • ${new Date(d.builtAt).toLocaleString()}` : '';
    const fs = (d.total && d.used != null && d.available != null)
      ? ` • FS ${prettyBytes(d.used)} used / ${prettyBytes(d.total)} total • ${prettyBytes(d.available)} free${d.usedPercent!=null?` (${d.usedPercent}%)`:''}`
      : '';
    return `<li><a class="link name" href="${base}/browse/${encodeRelForUrl(d.name)}">${escapeHtml(d.name)}</a><span class="path">${escapeHtml(d.path)}</span><span class="meta">${escapeHtml([indexed, built, fs].filter(Boolean).join(''))}</span></li>`;
  }).join("\n");
  return DISKS_TEMPLATE_CACHE.replace("{{DISK_ITEMS}}", items);
}
