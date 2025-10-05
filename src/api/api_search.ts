import { walker } from "../index";

export async function requestApiSearch(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const limit = Math.min(
      200,
      Math.max(1, Number(url.searchParams.get("limit") || 50))
    );
    const typeParam = url.searchParams.get("type") as
      | "file"
      | "folder"
      | "link"
      | null;
    const type =
      typeParam === "file" || typeParam === "folder" || typeParam === "link"
        ? typeParam
        : undefined;
    const results = walker.db.searchEntries(q, { type, limit }).map((e) => ({
      ...e,
      fullPath: e.path,
      isPasswordProtected:
        e.type === "file" ? walker.db.hasFilePassword(e.id) : false,
    }));
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
