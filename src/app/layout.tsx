// File: src/app/layout.tsx
import "./globals.css";
import PwaRegister from "../components/PwaRegister";
import RefreshButton from "../components/RefreshButton";

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
        <main className="mx-auto max-w-[900px] p-4">
          {/* Top row: title + refresh button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/icons/icon-192.png" alt="KaamLink" className="w-8 h-8 rounded-sm" />
              <h1 className="text-lg font-semibold">KaamLink</h1>
            </div>

            {/* Client-side Refresh button component */}
            <RefreshButton />
          </div>

          {children}
        </main>

        {/* PWA registration */}
        <PwaRegister />
      </body>
    </html>
  );
}
