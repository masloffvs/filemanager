import { mediaIndex } from "../index";

export async function requestApiGetMediaFrames(req: Request) {
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

  if (entry.mediaType !== "video") {
    return new Response(JSON.stringify({ error: "Not a video file" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const frames = await mediaIndex.getFramesForVideo(id);
  return new Response(JSON.stringify(frames), {
    headers: { "Content-Type": "application/json" },
  });
}
