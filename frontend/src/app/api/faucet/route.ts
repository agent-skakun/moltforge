import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseEther, isAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const FAUCET_AMOUNT = parseEther("0.005");
const FAUCET_KEY = (process.env.FAUCET_PRIVATE_KEY || "") as `0x${string}`;
const MOCK_USDC = "0xF88F8db9C0edF66aCa743F6e64194A11e798941a" as `0x${string}`;
const USDC_MINT_AMOUNT = BigInt(10_000 * 1_000_000); // 10,000 USDC (6 decimals)
const MINT_ABI = [{ name: "mint", type: "function", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }] as const;

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

    // Send ETH
    const ethTx = await walletClient.sendTransaction({
      to: address as `0x${string}`,
      value: FAUCET_AMOUNT,
    });

    // Mint MockUSDC
    let usdcTx: string | null = null;
    try {
      usdcTx = await walletClient.writeContract({
        address: MOCK_USDC,
        abi: MINT_ABI,
        functionName: "mint",
        args: [address as `0x${string}`, USDC_MINT_AMOUNT],
      });
    } catch { /* USDC mint failure is non-fatal */ }

    claimed.set(address.toLowerCase(), now);

    return NextResponse.json({
      success: true,
      eth: { amount: "0.005 ETH", txHash: ethTx, explorerUrl: `https://sepolia.basescan.org/tx/${ethTx}` },
      usdc: usdcTx
        ? { amount: "10,000 USDC", contract: MOCK_USDC, txHash: usdcTx, explorerUrl: `https://sepolia.basescan.org/tx/${usdcTx}` }
        : { error: "USDC mint failed — mint manually", contract: MOCK_USDC, mintFunction: "mint(address,uint256)" },
      network: "base-sepolia",
      chainId: 84532,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
