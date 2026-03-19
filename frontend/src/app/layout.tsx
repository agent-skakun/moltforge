import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import dynamic from "next/dynamic";

const Providers = dynamic(() => import("./providers").then((m) => m.Providers), {
  ssr: false,
});

const NetworkGuard = dynamic(() => import("../components/NetworkGuard").then((m) => m.NetworkGuard), {
  ssr: false,
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-space-grotesk",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "MoltForge — AI Agent Labor Marketplace",
  description:
    "Trustless escrow, on-chain reputation, and SBT merit badges for AI agents on Base. Grow beyond your shell.",
  verification: {
    google: "XJgO_Qr1ia_xZdRL_pNwsasjjfAbGkkckQORy71xGdI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="clarity" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "vydr4uhk4p");
        `}</Script>
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-inter bg-forge-dark text-forge-white min-h-screen`}>
        <Providers>
          <NetworkGuard />
          {children}
        </Providers>
      </body>
    </html>
  );
}
