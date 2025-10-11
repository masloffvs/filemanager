import { musicIndex } from "../index";

export async function requestApiMusicAlbums(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    const albums = await musicIndex.getAllAlbums(limit, offset);

    return new Response(JSON.stringify({ albums }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch albums" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function requestApiMusicArtists(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    const artists = await musicIndex.getAllArtists(limit, offset);

    return new Response(JSON.stringify({ artists }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch artists" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function requestApiMusicGenres(req: Request): Promise<Response> {
  try {
    const genres = await musicIndex.getAllGenres();

    return new Response(JSON.stringify({ genres }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch genres" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function requestApiMusicAlbumTracks(
  req: Request
): Promise<Response> {
  const url = new URL(req.url);
  const albumName = url.searchParams.get("album");
  const artist = url.searchParams.get("artist");

  if (!albumName || !artist) {
    return new Response(
      JSON.stringify({ error: "Album name and artist are required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const tracks = await musicIndex.getAlbumTracks(albumName, artist);

    return new Response(JSON.stringify({ tracks }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch album tracks" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function requestApiMusicArtistAlbums(
  req: Request
): Promise<Response> {
  const url = new URL(req.url);
  const artist = url.searchParams.get("artist");

  if (!artist) {
    return new Response(JSON.stringify({ error: "Artist name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const albums = await musicIndex.getArtistAlbums(artist);

    return new Response(JSON.stringify({ albums }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch artist albums" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function requestApiMusicSearch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const query = url.searchParams.get("q");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  if (!query) {
    return new Response(JSON.stringify({ error: "Search query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const tracks = await musicIndex.searchTracks(query, limit);

    return new Response(JSON.stringify({ tracks }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to search tracks" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function requestApiMusicTrack(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "Track ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const track = await musicIndex.getTrackById(id);

    if (!track) {
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ track }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch track" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
