// File: src/app/layout.tsx
import "./globals.css";
import RefreshButton from "../components/RefreshButton";

export const metadata = {
  title: "KaamLink",
  description: "KaamLink — connect customers with workers & contractors",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5a4" />

        {/* iOS support */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KaamLink" />
      </head>

      <body className="min-h-screen h-full bg-[var(--background)] text-[var(--foreground)] antialiased">
        <main className="w-full max-w-screen-md mx-auto px-4 py-6">
          <header className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/icons/icon-192.png"
                alt="KaamLink"
                className="w-8 h-8 rounded-sm object-contain"
              />
              <h1 className="text-base sm:text-lg font-semibold leading-tight">KaamLink</h1>
            </div>

            <div className="flex items-center">
              <RefreshButton />
            </div>
          </header>

          <section className="w-full">{children}</section>
        </main>

        {/* Removed PwaRegister from layout so install button won't appear on all pages */}
      </body>
    </html>
  );
}
