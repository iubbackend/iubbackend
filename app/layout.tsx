import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PWARegistration from "../components/PWARegistration";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IUB Result Portal",
  description: "A premium, lightning-fast academic tracking platform.",
  manifest: "/manifest.json", // <-- Must start with a forward slash
};

export const viewport: Viewport = {
  themeColor: "#00122a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark selection:bg-emerald-500/30 selection:text-emerald-200">
      <body 
        className={`${inter.className} bg-slate-950 text-slate-50 antialiased min-h-screen relative overflow-x-hidden`}
      >
        {/* Background background process to install the service worker */}
        <PWARegistration />

        {/* Universal Ambient Dynamic Lighting Grid */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03),transparent_50%)]" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-full blur-[160px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]" />
        </div>
        
        {/* Dynamic App Shell */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
