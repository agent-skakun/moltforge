import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

// POST /api/get-key — { walletAddress }
// Returns: { ok, apiKey, llmProvider } — never cached
export async function POST(req: Request) {
  let body: { walletAddress?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { walletAddress } = body;
  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
  }

  const wallet = walletAddress.toLowerCase();

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("agent_keys")
      .select("encrypted_api_key, llm_provider")
      .eq("wallet_address", wallet)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Key not found" }, { status: 404 });
    }

    const apiKey = decrypt(data.encrypted_api_key as string);

    return new NextResponse(
      JSON.stringify({ ok: true, apiKey, llmProvider: data.llm_provider }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("[get-key]", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
