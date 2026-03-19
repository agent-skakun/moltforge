import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseEther, isAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const FAUCET_KEY = (process.env.FAUCET_PRIVATE_KEY || "") as `0x${string}`;
const MOLT_USDC = "0x221f261106C0a9D18Cc4dF024686f990015F7438" as `0x${string}`;
const ETH_AMOUNT = parseEther("0.005");
const USDC_AMOUNT = BigInt(10_000 * 1_000_000); // 10,000 mUSDC
const MINT_ABI = [{ name: "mint", type: "function", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }] as const;

const claimedEth = new Map<string, number>();
const claimedUsdc = new Map<string, number>();

export async function POST(req: Request) {
  try {
    if (!FAUCET_KEY || FAUCET_KEY.length < 10) {
      return NextResponse.json({ error: "Faucet not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { address, token } = body; // token: "ETH" | "mUSDC" | undefined (both)

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const account = privateKeyToAccount(FAUCET_KEY);
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http("https://sepolia.base.org") });
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
    const now = Date.now();
    const result: Record<string, unknown> = { address, network: "base-sepolia", chainId: 84532 };

    const wantEth = !token || token === "ETH";
    const wantUsdc = !token || token === "mUSDC";

    // ETH
    if (wantEth) {
      const last = claimedEth.get(address.toLowerCase());
      if (last && now - last < 24 * 3600 * 1000) {
        const h = Math.ceil((24 * 3600 * 1000 - (now - last)) / 3600000);
        result.eth = { error: `Already claimed ETH. Try again in ${h}h` };
      } else {
        const balance = await publicClient.getBalance({ address: account.address });
        if (balance < ETH_AMOUNT) {
          result.eth = { error: "ETH faucet empty" };
        } else {
          const hash = await walletClient.sendTransaction({ to: address as `0x${string}`, value: ETH_AMOUNT });
          claimedEth.set(address.toLowerCase(), now);
          result.eth = { amount: "0.005 ETH", txHash: hash, explorerUrl: `https://sepolia.basescan.org/tx/${hash}` };
        }
      }
    }

    // mUSDC — независимо от ETH
    if (wantUsdc) {
      const last = claimedUsdc.get(address.toLowerCase());
      if (last && now - last < 24 * 3600 * 1000) {
        const h = Math.ceil((24 * 3600 * 1000 - (now - last)) / 3600000);
        result.usdc = { error: `Already claimed mUSDC. Try again in ${h}h` };
      } else {
        const hash = await walletClient.writeContract({
          address: MOLT_USDC, abi: MINT_ABI, functionName: "mint",
          args: [address as `0x${string}`, USDC_AMOUNT],
        });
        claimedUsdc.set(address.toLowerCase(), now);
        result.usdc = { amount: "10,000 mUSDC", contract: MOLT_USDC, txHash: hash, explorerUrl: `https://sepolia.basescan.org/tx/${hash}` };
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
