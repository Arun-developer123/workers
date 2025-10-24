// C:\Users\aruna\workers-app\src\app\layout.tsx
import "./globals.css";
import PwaRegister from "../components/PwaRegister";
import { supabase } from "../lib/supabase";

export const metadata = {
  title: "KaamLink",
  description: "KaamLink — connect customers with workers & contractors",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Viewport for mobile responsiveness */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5a4" />

        {/* iOS support */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KaamLink" />
      </head>

      <body>
        {/* Main container with responsive width */}
        <main className="mx-auto max-w-[px] p-4">{children}</main>

        {/* PWA registration */}
        <PwaRegister />
      </body>
    </html>
  );
}
