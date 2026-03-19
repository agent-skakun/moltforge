import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseEther, isAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const FAUCET_AMOUNT = parseEther("0.01");
const FAUCET_KEY = (process.env.FAUCET_PRIVATE_KEY || "") as `0x${string}`;

// Simple in-memory rate limit (per address, 1 per 24h)
const claimed = new Map<string, number>();

export async function POST(req: Request) {
  try {
    if (!FAUCET_KEY || FAUCET_KEY.length < 10) {
      return NextResponse.json({ error: "Faucet not configured" }, { status: 503 });
    }

    const { address } = await req.json();
    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Rate limit: 1 per 24h per address
    const lastClaim = claimed.get(address.toLowerCase());
    const now = Date.now();
    if (lastClaim && now - lastClaim < 24 * 60 * 60 * 1000) {
      const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now - lastClaim)) / 3600000);
      return NextResponse.json({ error: `Already claimed. Try again in ${hoursLeft}h` }, { status: 429 });
    }

    const account = privateKeyToAccount(FAUCET_KEY);
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http("https://sepolia.base.org") });
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

    // Check faucet balance
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance < FAUCET_AMOUNT) {
      return NextResponse.json({ error: "Faucet empty. Contact team." }, { status: 503 });
    }

    const hash = await walletClient.sendTransaction({
      to: address as `0x${string}`,
      value: FAUCET_AMOUNT,
    });

    claimed.set(address.toLowerCase(), now);

    return NextResponse.json({
      success: true,
      amount: "0.01 ETH",
      network: "base-sepolia",
      txHash: hash,
      explorerUrl: `https://sepolia.basescan.org/tx/${hash}`,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
