import { mediaIndex } from "../index";

export async function requestApiGetMedia(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const entry = await mediaIndex.getMediaById(id);
  if (!entry) {
    return new Response(JSON.stringify({ error: "Media not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(entry), {
    headers: { "Content-Type": "application/json" },
  });
}
