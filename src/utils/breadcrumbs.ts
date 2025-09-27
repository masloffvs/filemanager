import { Breadcrumb } from "../types";

export function makeBreadcrumbs(rel: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ name: "storage", rel: "" }];
  if (!rel) return crumbs;
  const parts = rel.split("/").filter(Boolean); let acc: string[] = [];
  for (const part of parts) { acc.push(part); crumbs.push({ name: part, rel: acc.join("/") }); }
  return crumbs;
}

