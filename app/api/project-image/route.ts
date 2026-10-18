import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validPublicUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1' || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('169.254.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
    return url;
  } catch { return null; }
}

function screenshotUrl(target: URL, width: number): string {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(target.toString())}?w=${width}`;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url') || '';
  const target = validPublicUrl(raw);
  const width = Math.max(480, Math.min(1600, Number(request.nextUrl.searchParams.get('width')) || 1200));
  if (!target) return new NextResponse('Invalid project URL', { status: 400 });

  try {
    const response = await fetch(target.toString(), {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioPreview/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
      next: { revalidate: 21600 },
    });
    const finalUrl = validPublicUrl(response.url) || target;
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('text/html')) {
      const html = (await response.text()).slice(0, 1_500_000);
      const match = html.match(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*content=["']([^"']+)["'][^>]*>/i)
        || html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*>/i);
      if (match?.[1]) {
        const imageValue = match[1].replace(/&amp;/g, '&').trim();
        try {
          const imageUrl = new URL(imageValue, finalUrl);
          if (['http:', 'https:'].includes(imageUrl.protocol)) {
            return NextResponse.redirect(imageUrl.toString(), { status: 307, headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } });
          }
        } catch { /* use screenshot fallback */ }
      }
    }
  } catch { /* site may block server fetch; screenshot provider is the fallback */ }

  return NextResponse.redirect(screenshotUrl(target, width), {
    status: 307,
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
  });
}
