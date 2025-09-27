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

export async function renderHtmlList(base: string, payload: ApiListResponse) {
  const { cwd, dirs, files, breadcrumbs } = payload;
  const groups = groupFilesByDay(files);

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

  const bc = breadcrumbs
    .map((c, i) => {
      const href =
        i === breadcrumbs.length - 1
          ? null
          : `${base}/browse/${encodeRelForUrl(c.rel)}`;
      return href
        ? `<a class="crumb" href="${href}">${escapeHtml(c.name)}</a>`
        : `<span class="crumb current">${escapeHtml(c.name)}</span>`;
    })
    .join('<span class="crumb-sep"> / </span>');

  const upRel =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].rel : null;
  const upLink =
    upRel !== null
      ? `<a class="up" href="${base}/browse/${encodeRelForUrl(
          upRel
        )}">cd ..</a>`
      : "";

  const dirItems = dirs
    .map((d) => {
      const left = `<a class="link" href="${base}/browse/${encodeRelForUrl(
        d.rel
      )}">${FOLDER_SVG}<span class="fname">${escapeHtml(d.name)}/</span></a>`;
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

  const fileGroupsHtml =
    groups.length === 0
      ? ""
      : groups
          .map((g) => {
            const header = `<h2 class="day">${escapeHtml(g.day)}</h2>`;
            const items = g.items
              .map((f) => {
                const icon = (f as any).isLink
                  ? LINK_SVG
                  : (f as any).mediaKind === "image"
                  ? PHOTO_SVG
                  : (f as any).mediaKind === "video"
                  ? VIDEO_SVG
                  : FILE_SVG;
                const downloadAttr =
                  (f as any).mediaKind === "image" ||
                  (f as any).mediaKind === "video"
                    ? ""
                    : " download";
                const left = `<a class="link" href="${base}/files/${encodeRelForUrl(
                  f.rel
                )}"${downloadAttr}>${icon}<span class="fname">${renderNameWithExt(
                  f.name
                )}</span></a>`;
                const right = `<span class="meta">${escapeHtml(
                  prettyBytes(f.size)
                )} · ${escapeHtml(timeHM(f.mtime))}</span>`;
                return `<li class="row"><div class="left">${left}</div><div class="right">${right}</div></li>`;
              })
              .join("");
            return `${header}<ul class="list">${items}</ul>`;
          })
          .join("");

  if (!LIST_TEMPLATE_CACHE) {
    LIST_TEMPLATE_CACHE = await Bun.file("web/list.html").text();
  }

  const filesSection = files.length
    ? `<div class="section-title">Files</div>${fileGroupsHtml}`
    : dirs.length === 0
    ? `<div class="empty">${EMPTY_SVG}<div class="empty-text">This folder is empty</div></div>`
    : "";

  return LIST_TEMPLATE_CACHE.replaceAll(
    "{{TITLE_PATH}}",
    escapeHtml(cwd ? "/" + cwd : "")
  )
    .replaceAll("{{BREADCRUMBS}}", bc)
    .replaceAll("{{UPLINK}}", upLink)
    .replaceAll(
      "{{DIR_SECTION}}",
      dirs.length
        ? `<div class="section-title">Directories</div><ul class="list">${dirItems}</ul>`
        : ""
    )
    .replaceAll("{{FILES_SECTION}}", filesSection)
    .replaceAll("{{BASE}}", base);
}
