import { mediaIndex } from "..";

export async function requestApiMediaSlice(req: Request) {
  const offset = Number(new URL(req.url).searchParams.get("offset") || 0);
  const limit = Number(new URL(req.url).searchParams.get("limit") || 100);

  const slice = await mediaIndex.getMediaSlice(offset, limit);
  return new Response(JSON.stringify(slice), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Last-Modified": new Date().toUTCString(),
    },
  });
}
