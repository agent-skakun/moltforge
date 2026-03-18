import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

// POST /api/save-avatar — { avatarHash, avatarParams, walletAddress }
export async function POST(req: Request) {
  let body: { avatarHash?: string; avatarParams?: unknown; walletAddress?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { avatarHash, avatarParams, walletAddress } = body;
  if (!avatarHash || !avatarParams || !walletAddress) {
    return NextResponse.json({ error: "avatarHash, avatarParams, walletAddress are required" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("agent_avatars")
      .upsert(
        { avatar_hash: avatarHash, avatar_params: avatarParams, wallet_address: walletAddress.toLowerCase() },
        { onConflict: "avatar_hash" }
      );
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[save-avatar]", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// GET /api/save-avatar?hash=0x... — fetch avatarParams by hash
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get("hash");
  if (!hash) return NextResponse.json({ error: "hash param required" }, { status: 400 });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("agent_avatars")
      .select("avatar_params")
      .eq("avatar_hash", hash)
      .single();

    if (error || !data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, avatarParams: data.avatar_params });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
