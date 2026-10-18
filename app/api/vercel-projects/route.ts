import { NextResponse } from 'next/server';

/**
 * Project directory source chosen by the portfolio owner.
 * The list is read server-side so visitor browsers do not run into CORS limits.
 */
const SOURCE_URL = process.env.PROJECTS_SOURCE_URL || process.env.NEXT_PUBLIC_PROJECTS_SOURCE_URL || 'https://demo-projects-4eja.vercel.app/';
const CACHE_SECONDS = 1800;

export type PortfolioProject = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  image_url: string | null;
  language: string | null;
  topics: string[];
};

type Candidate = {
  url: string;
  name?: string;
  description?: string;
  image?: string;
  language?: string;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;|&#47;/g, '/')
    .replace(/&#x([\da-f]{1,6});/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function plainText(value: string): string {
  return decodeEntities(value.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u002f/gi, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(tag: string, names: string[]): string | null {
  for (const name of names) {
    const expression = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
    const match = tag.match(expression);
    const value = match?.[1] ?? match?.[2] ?? match?.[3];
    if (value) return decodeEntities(value.trim());
  }
  return null;
}

function normalizeUrl(raw: string, base: string): string | null {
  const cleaned = decodeEntities(raw).replace(/\\u0026/g, '&').trim();
  if (!cleaned || /^(#|mailto:|tel:|javascript:|data:|blob:)/i.test(cleaned)) return null;
  try {
    const url = new URL(cleaned, base);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    // Drop common tracking values but preserve functional query parameters.
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return null;
  }
}

function stableId(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash) + 1;
}

function titleFromUrl(value: string): string {
  const url = new URL(value);
  const last = url.pathname.split('/').filter(Boolean).pop();
  const source = last || url.hostname.replace(/^www\./, '').split('.')[0];
  return decodeURIComponent(source).replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function isNoiseUrl(value: string, source: URL): boolean {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  if (host === source.hostname.toLowerCase() && (path === '/' || path === '')) return true;
  if (/\.(?:png|jpe?g|gif|webp|svg|ico|css|js|map|woff2?|ttf|pdf|zip|mp4|webm)$/i.test(path)) return true;
  if (/^\/(?:_next|api|favicon|robots\.txt|sitemap\.xml|manifest\.json|icons?)(?:\/|$)/i.test(path)) return true;
  if (/(?:^|\.)(?:github\.com|githubusercontent\.com|gitlab\.com|bitbucket\.org|linkedin\.com|instagram\.com|facebook\.com|x\.com|twitter\.com|youtube\.com|tiktok\.com|discord\.com|discord\.gg|vercel\.com|nextjs\.org|framer\.com|framerusercontent\.com|google\.com|googleapis\.com|gstatic\.com|cloudflare\.com)$/i.test(host)) return true;
  if (/^(?:about|contact|services|pricing|privacy|terms|login|logout|sign-in|sign-up|register|blog|posts|tags|categories|work|projects|portfolio|resume|cv|home)\/?$/i.test(path.replace(/^\//, ''))) return true;
  return false;
}

function isLikelyHostedProject(url: URL, source: URL): boolean {
  if (url.hostname.toLowerCase() === source.hostname.toLowerCase()) return false;
  const host = url.hostname.toLowerCase();
  return /(?:^|\.)(?:vercel\.app|netlify\.app|pages\.dev|github\.io|web\.app|firebaseapp\.com|onrender\.com|render\.com|railway\.app|fly\.dev|surge\.sh|herokuapp\.com|glitch\.me|replit\.app|repl\.co|stackblitz\.io)$/i.test(host)
    || /(?:^|\.)[a-z0-9-]+\.vercel\.app$/i.test(host);
}

function findEnclosingBlock(html: string, index: number): string {
  // Walk the container stack around this anchor and prefer a compact card that
  // contains its heading, description and thumbnail rather than a whole page.
  const tokenRx = /<\/?(article|li|div|section|main|a)\b[^>]*>/gi;
  const stack: Array<{ tag: string; start: number }> = [];
  let token: RegExpExecArray | null;
  while ((token = tokenRx.exec(html)) && token.index < index) {
    const full = token[0];
    const closing = /^<\//.test(full);
    const tag = token[1].toLowerCase();
    if (!closing && !/\/\s*>$/.test(full)) stack.push({ tag, start: token.index });
    else if (closing) {
      for (let j = stack.length - 1; j >= 0; j -= 1) {
        if (stack[j].tag === tag) { stack.splice(j); break; }
      }
    }
  }

  let bestBlock = '';
  let bestScore = -1;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const parent = stack[i];
    if (!['article', 'li', 'div', 'section', 'a'].includes(parent.tag)) continue;
    const openRx = new RegExp(`<${parent.tag}\\b[^>]*>|<\\/${parent.tag}\\s*>`, 'gi');
    openRx.lastIndex = parent.start;
    let depth = 0;
    let end = html.length;
    let current: RegExpExecArray | null;
    while ((current = openRx.exec(html))) {
      if (new RegExp(`^<\\/${parent.tag}`, 'i').test(current[0])) depth -= 1;
      else if (!/\/\s*>$/.test(current[0])) depth += 1;
      if (depth === 0) { end = openRx.lastIndex; break; }
    }
    const block = html.slice(parent.start, end);
    if (block.length > 12000) continue;
    const hasHeading = /<h[1-5]\b/i.test(block);
    const hasDescription = /<p\b/i.test(block);
    const hasImage = /<img\b/i.test(block);
    const score = (hasHeading ? 4 : 0) + (hasDescription ? 2 : 0) + (hasImage ? 1 : 0);
    if (score > bestScore) { bestBlock = block; bestScore = score; }
    if (score >= 6) return block;
  }
  return bestBlock || html.slice(Math.max(0, index - 1000), Math.min(html.length, index + 3000));
}

function candidateFromBlock(url: string, block: string, linkText: string, base: string): Candidate {
  const headings = [...block.matchAll(/<h[1-5]\b[^>]*>([\s\S]*?)<\/h[1-5]>/gi)].map(match => plainText(match[1])).filter(text => text.length > 1 && text.length < 100);
  const descriptions = [...block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match => plainText(match[1])).filter(text => text.length > 20 && text.length < 380);
  const imgTags = [...block.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
  let image: string | undefined;
  for (const tag of imgTags) {
    const raw = attr(tag, ['src', 'data-src', 'data-lazy-src', 'data-original']);
    if (!raw || /^(data:|blob:)/i.test(raw)) continue;
    const normalized = normalizeUrl(raw, base);
    if (normalized && !/\/(?:logo|favicon|icon|avatar|vercel|next)(?:[-_.\/]|$)/i.test(new URL(normalized).pathname)) { image = normalized; break; }
  }
  const text = [linkText, ...headings].filter(Boolean).join(' ');
  const possibleLanguage = ['TypeScript', 'JavaScript', 'Java', 'Python', 'React', 'Next.js', 'Vue', 'Svelte', 'HTML', 'CSS', 'Node.js', 'Tailwind CSS'].find(label => new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(block));
  return {
    url,
    name: headings[0] || (linkText && !/^(?:view|live demo|visit|open|preview|website|view project|live preview|learn more)$/i.test(linkText) ? linkText : undefined),
    description: descriptions.sort((a, b) => b.length - a.length)[0],
    image,
    language: possibleLanguage,
  };
}

function extractCandidates(html: string, sourceUrl: string): Candidate[] {
  const source = new URL(sourceUrl);
  const decodedHtml = html
    .replace(/\\u0026/g, '&').replace(/\\u003d/gi, '=').replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/');
  const result: Candidate[] = [];
  const seen = new Map<string, number>();
  const anchorRx = /<a\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRx.exec(decodedHtml))) {
    const tag = match[0];
    const rawHref = attr(tag, ['href']);
    if (!rawHref) continue;
    const url = normalizeUrl(rawHref, sourceUrl);
    if (!url || isNoiseUrl(url, source)) continue;
    const block = findEnclosingBlock(decodedHtml, match.index);
    const afterAnchor = decodedHtml.indexOf('>', match.index) + 1;
    const anchorEnd = decodedHtml.indexOf('</a>', afterAnchor);
    const innerText = anchorEnd >= afterAnchor ? plainText(decodedHtml.slice(afterAnchor, Math.min(anchorEnd, afterAnchor + 1200))) : '';
    const label = attr(tag, ['aria-label', 'title', 'data-title']);
    const text = innerText || (label ? plainText(label) : '');
    const candidate = candidateFromBlock(url, block, text, sourceUrl);
    if (!candidate.name || /^(home|about|services|contact|menu|close|next|previous|back|more)$/i.test(candidate.name)) candidate.name = titleFromUrl(url);
    if (!seen.has(url)) {
      seen.set(url, result.length);
      result.push(candidate);
    } else {
      const existingIndex = seen.get(url);
      if (existingIndex !== undefined) {
        const existing = result[existingIndex];
        if ((!existing.image || existing.image.length === 0) && candidate.image) existing.image = candidate.image;
        if ((!existing.description || existing.description.length < 20) && candidate.description) existing.description = candidate.description;
        if (existing.name === titleFromUrl(url) && candidate.name) existing.name = candidate.name;
        if (!existing.language && candidate.language) existing.language = candidate.language;
      }
    }
  }

  // Some galleries render project cards client-side and serialize their URLs
  // into Next/React hydration data. Supplement anchor links with likely hosted
  // preview domains when the visible anchors alone yielded only a short list.
  // This pass is intentionally conservative so analytics/CDN URLs are not shown.
  if (result.length < 3) {
    const rawUrlRx = /https?:\/\/[^"'<>\s\\]+/gi;
    const strings = decodedHtml.match(rawUrlRx) || [];
    for (const raw of strings) {
      const cleaned = raw.replace(/\\\//g, '/').replace(/[),.;\]}]+$/g, '');
      const normalized = normalizeUrl(cleaned, sourceUrl);
      if (!normalized || seen.has(normalized)) continue;
      let parsed: URL;
      try { parsed = new URL(normalized); } catch { continue; }
      if (isNoiseUrl(normalized, source) || !isLikelyHostedProject(parsed, source)) continue;
      seen.set(normalized, result.length);
      result.push({ url: normalized, name: titleFromUrl(normalized) });
    }
  }
  return result;
}

function collectionFallback(message: string) {
  const id = stableId(SOURCE_URL);
  const project: PortfolioProject = {
    id,
    name: 'Live Project Collection',
    description: 'Browse the live collection to see all of the deployed projects. Individual cards will populate when the source page is reachable and exposes its project links.',
    html_url: SOURCE_URL,
    homepage: SOURCE_URL,
    image_url: null,
    language: 'Website',
    topics: ['Live website', 'Project collection'],
  };
  return NextResponse.json({ sourceUrl: SOURCE_URL, projects: [project], error: message }, {
    headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=3600` },
  });
}

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; MannanPortfolio/1.0; +https://demo-projects-4eja.vercel.app/)',
      },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) {
      return collectionFallback(`Project collection returned HTTP ${response.status}. Showing a link to the collection as a fallback.`);
    }
    const html = await response.text();
    const candidates = extractCandidates(html, response.url || SOURCE_URL);
    const projects: PortfolioProject[] = candidates.slice(0, 60).map(candidate => {
      const name = candidate.name || titleFromUrl(candidate.url);
      return {
        id: stableId(candidate.url),
        name,
        description: candidate.description || 'Open this project to explore the live website and its interactive experience.',
        html_url: candidate.url,
        homepage: candidate.url,
        image_url: candidate.image || null,
        language: candidate.language || null,
        topics: ['Live website', ...(candidate.language ? [candidate.language] : [])],
      };
    });

    const title = plainText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') || 'Mannan Khanzada Projects';
    let extractionError: string | null = null;
    if (projects.length === 0) {
      // Keep the work section useful even if the source gallery renders cards client-side.
      // In this case the collection itself remains the safe fallback destination.
      projects.push({
        id: stableId(SOURCE_URL),
        name: 'Live Project Collection',
        description: 'Browse the full Vercel project collection. Individual projects will appear here once their links are available in the collection markup.',
        html_url: SOURCE_URL,
        homepage: SOURCE_URL,
        image_url: null,
        language: 'Website',
        topics: ['Live website', 'Project collection'],
      });
      extractionError = 'The gallery page did not expose individual project links to the server, so the collection is shown as a fallback card.';
    }
    return NextResponse.json({ sourceUrl: SOURCE_URL, sourceTitle: title, projects, error: extractionError }, {
      headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=3600` },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown network error';
    return collectionFallback(`Could not read the Vercel project collection (${detail}). Showing a link to the collection as a fallback.`);
  }
}
