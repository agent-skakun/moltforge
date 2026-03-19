import { NextResponse } from "next/server";

// Proxy a HEAD/GET to /health for webhook validation — needed to bypass CORS
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    const r = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json({ ok: r.ok, status: r.status }, { status: r.ok ? 200 : 502 });
  } catch {
    // Fallback: try GET
    try {
      const r = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return NextResponse.json({ ok: r.ok, status: r.status }, { status: r.ok ? 200 : 502 });
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
    }
  }
}
