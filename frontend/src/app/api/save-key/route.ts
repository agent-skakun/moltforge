import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/crypto";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

// POST /api/save-key — { walletAddress, apiKey, llmProvider }
export async function POST(req: Request) {
  let body: { walletAddress?: string; apiKey?: string; llmProvider?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { walletAddress, apiKey, llmProvider } = body;
  if (!walletAddress || !apiKey) {
    return NextResponse.json({ error: "walletAddress and apiKey are required" }, { status: 400 });
  }

  const wallet = walletAddress.toLowerCase();

  try {
    const encryptedKey = encrypt(apiKey);
    const supabase = getSupabase();
    const { error } = await supabase
      .from("agent_keys")
      .upsert(
        { wallet_address: wallet, encrypted_api_key: encryptedKey, llm_provider: llmProvider ?? "claude", updated_at: new Date().toISOString() },
        { onConflict: "wallet_address" }
      );
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[save-key]", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
