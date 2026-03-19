import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";

const PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
  { appName: "MoltForge", projectId: PROJECT_ID }
);

export const config = createConfig({
  connectors,
  chains: [baseSepolia],
  transports: { [baseSepolia.id]: http("https://sepolia.base.org") },
  ssr: true,
});
