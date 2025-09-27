import { ApiError, ApiListResponse, ApiUploadResponse } from "../types";

export function baseSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), usb=(), payment=()",
    "Cache-Control": "no-store",
  } as Record<string, string>;
}

export function htmlSecurityHeaders() {
  return {
    ...baseSecurityHeaders(),
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  };
}

export function wantsJson(req: Request, url: URL) {
  const accept = (req.headers.get("accept") || "").toLowerCase();
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  return accept.includes("application/json") || ua.includes("curl") || url.searchParams.get("format") === "json";
}

export function sendJson(data: ApiListResponse | ApiUploadResponse | ApiError, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...baseSecurityHeaders() },
  });
}

export function sendHtml(html: string, status = 200) {
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...htmlSecurityHeaders() } });
}

export function sendText(text: string, status = 200) {
  return new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...baseSecurityHeaders() } });
}

