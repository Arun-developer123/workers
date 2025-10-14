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
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5a4" />

        {/* iOS */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KaamLink" />

        {/* Optional: noindex for staging */}
        {/* <meta name="robots" content="noindex,nofollow" /> */}
      </head>
      <body>
        <main style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>{children}</main>

        {/* PWA registration + install prompt (client component) */}
        <PwaRegister />
      </body>
    </html>
  );
}
