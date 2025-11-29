// app/robots.txt/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const txt = `User-agent: *
Allow: /

Sitemap: https://workers-taupe.vercel.app/sitemap.xml
Host: https://workers-taupe.vercel.app
`;
  return new NextResponse(txt, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
