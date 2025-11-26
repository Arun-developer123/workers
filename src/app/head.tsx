// app/head.tsx
export default function Head() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Google verification */}
      <meta name="google-site-verification" content="z1zXo8E_dO7ytdudD-i3_lyEthqakLDPmmj6fCiggl4" />

      <title>KaamLink — Digital Rozgaar for Every Worker</title>
      <meta
        name="description"
        content="KaamLink connects verified local workers directly to customers — escrow payments, SOS, verified profiles and fair pay. Join as worker or hire trusted talent."
      />

      {/* Open Graph */}
      <meta property="og:title" content="KaamLink — Digital Rozgaar for Every Worker" />
      <meta
        property="og:description"
        content="Verified workers • Escrow payments • SOS • Transparent reviews. KaamLink — local-first, mobile-first."
      />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://workers-taupe.vercel.app/" />
      <meta property="og:image" content="/workers-og.png" />

      {/* Canonical */}
      <link rel="canonical" href="https://workers-taupe.vercel.app/" />
      <link rel="icon" href="/favicon.ico" />
    </>
  );
}
