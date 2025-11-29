// app/sitemap.xml/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 0;


export async function GET() {
  const baseUrl = "https://workers-taupe.vercel.app";

  const pages = [
    { url: "/", priority: 1.0, changefreq: "daily" },
    { url: "/about", priority: 0.8, changefreq: "weekly" },
    { url: "/auth/sign-up", priority: 0.7, changefreq: "monthly" },
    { url: "/auth/sign-in", priority: 0.7, changefreq: "monthly" },
    // add other important routes here
  ];

  const urlset = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${pages
      .map(
        (p) => `
      <url>
        <loc>${baseUrl}${p.url}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>${p.changefreq}</changefreq>
        <priority>${p.priority}</priority>
      </url>`
      )
      .join("")}
  </urlset>`.trim();

  return new NextResponse(urlset, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
