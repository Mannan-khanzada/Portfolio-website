import { NextResponse } from 'next/server';

/** Imports the owner's own public repos, excluding small demos and non-MERN work. */
const USERNAME = process.env.GITHUB_USERNAME || process.env.NEXT_PUBLIC_GITHUB_USERNAME || 'Mannan-khanzada';
const API = 'https://api.github.com';
const MIN_REPO_SIZE_KB = 120;
const MAX_CANDIDATES_TO_INSPECT = 18;
const CACHE_SECONDS = 3600;

type GitHubRepo = {
  id: number; name: string; full_name: string; description: string | null;
  html_url: string; homepage: string | null; language: string | null; topics?: string[];
  size: number; stargazers_count: number; forks_count: number; updated_at: string;
  default_branch: string; fork: boolean; archived: boolean;
};
type GitHubFile = { content?: string; encoding?: string; download_url?: string | null };
type PortfolioProject = {
  id: number; name: string; description: string | null; html_url: string;
  homepage: string | null; image_url: string | null; language: string | null;
  topics: string[]; source: 'github'; stars: number; forks: number; size: number; updated_at: string;
};

const requestHeaders: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'Mannan-Portfolio-Project-Importer',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function githubJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: requestHeaders, next: { revalidate: CACHE_SECONDS } });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch { return null; }
}

function decodeGithubFile(file: GitHubFile | null): string {
  if (!file?.content || file.encoding !== 'base64') return '';
  try { return Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8'); }
  catch { return ''; }
}

function markdownCover(readme: string, repo: GitHubRepo): string | null {
  const images = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)]
    .map(match => match[1].trim().replace(/^<|>$/g, '').split(/\s+["']/)[0])
    .filter(Boolean);
  const candidate = images.find(value =>
    !/(?:shields\.io|badge|github\.com\/.*\/actions|codecov|sonarcloud|img\.shields)/i.test(value)
    && /\.(?:png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i.test(value));
  if (!candidate) return null;
  try {
    if (/^https?:\/\//i.test(candidate)) return new URL(candidate).toString();
    const relative = candidate.replace(/^\.\//, '').replace(/^\//, '');
    return `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${relative.split('/').map(encodeURIComponent).join('/')}`;
  } catch { return null; }
}

const FEATURE_GROUPS: RegExp[] = [
  /e[ -]?commerce|shopping cart|checkout|product catalog/i,
  /marketplace|multi[ -]?vendor|seller dashboard/i,
  /stripe|razorpay|payment gateway|billing|subscription/i,
  /authentication|authorization|jwt|oauth|role[ -]?based access/i,
  /admin dashboard|admin panel|content management/i,
  /social network|social media|feed|follow system/i,
  /real[ -]?time|socket\.io|websocket|live chat|messaging/i,
  /booking|reservation|appointment|scheduling/i,
  /delivery|order tracking|logistics|dispatch/i,
  /learning management|\blms\b|course platform|classroom/i,
  /invoice|invoicing|accounting|\bcrm\b|\berp\b/i,
  /artificial intelligence|\bai\b|image generation|recommendation system/i,
  /analytics|reporting|data visualization|business intelligence/i,
  /inventory|warehouse|stock management/i,
  /job portal|job board|recruitment|applicant tracking/i,
  /search engine|recommendations|reviews|ratings/i,
];

function meaningfulMernProject(repo: GitHubRepo, readme: string, packageText: string): boolean {
  const metadata = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`;
  const combined = `${metadata}\n${readme}\n${packageText}`;
  const hasReact = /\breact(?:\.?js)?\b|react-dom/i.test(combined);
  const hasExpress = /\bexpress(?:\.?js)?\b/i.test(combined);
  const hasMongo = /\bmongodb\b|\bmongoose\b|\bmongo db\b/i.test(combined);
  const hasNode = /\bnode(?:\.?js)?\b|nodejs/i.test(combined);
  const mernTopic = /\bmern\b|mern-stack|mernstack/i.test(metadata);
  const completeStack = hasReact && hasExpress && hasMongo && hasNode;
  const featureCount = FEATURE_GROUPS.reduce((count, expression) => count + (expression.test(combined) ? 1 : 0), 0);
  const enoughDocumentation = readme.trim().length >= 650;
  const substantial = repo.size >= MIN_REPO_SIZE_KB;
  const stackVerified = completeStack || (mernTopic && hasReact && hasExpress && hasMongo);
  return substantial && enoughDocumentation && stackVerified && featureCount >= 2;
}

export async function GET() {
  const cacheHeaders = { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600` };
  const repos = await githubJson<GitHubRepo[]>(`${API}/users/${encodeURIComponent(USERNAME)}/repos?type=owner&sort=updated&direction=desc&per_page=100`);
  if (!repos) {
    return NextResponse.json({ projects: [], source: 'github', username: USERNAME, warning: 'GitHub repository list is temporarily unavailable.' }, { headers: cacheHeaders });
  }

  const metadataPriority = (repo: GitHubRepo) => {
    const metadata = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`;
    let score = /\bmern\b|mern-stack|mernstack/i.test(metadata) ? 8 : 0;
    if (/react|express|mongo|mongoose|node\.js|full[ -]?stack/i.test(metadata)) score += 3;
    if (/e[ -]?commerce|marketplace|dashboard|payment|booking|social|chat|delivery|invoice|crm|erp|lms|analytics|ai|admin|inventory|job portal/i.test(metadata)) score += 2;
    return score;
  };
  const candidates = repos
    .filter(repo => !repo.fork && !repo.archived && repo.size >= MIN_REPO_SIZE_KB)
    .filter(repo => ['JavaScript', 'TypeScript'].includes(repo.language || ''))
    .sort((a, b) => metadataPriority(b) - metadataPriority(a) || b.size - a.size || b.stargazers_count - a.stargazers_count)
    .slice(0, MAX_CANDIDATES_TO_INSPECT);

  const inspected = await Promise.all(candidates.map(async repo => {
    const base = `${API}/repos/${repo.full_name}`;
    const [readmeFile, packageFile] = await Promise.all([
      githubJson<GitHubFile>(`${base}/readme`),
      githubJson<GitHubFile>(`${base}/contents/package.json`),
    ]);
    const readme = decodeGithubFile(readmeFile);
    const packageText = decodeGithubFile(packageFile);
    if (!meaningfulMernProject(repo, readme, packageText)) return null;

    const topics = [...new Set(['MERN Stack', ...(repo.topics || []).slice(0, 5)])];
    const readmeSummary = readme.replace(/^#+\s.*$/gm, ' ').replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/[*_`>#]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
    return {
      id: repo.id,
      name: repo.name,
      description: repo.description || `Substantial full-stack MERN project. ${readmeSummary}`,
      html_url: repo.html_url,
      homepage: repo.homepage?.trim() || null,
      image_url: markdownCover(readme, repo),
      language: repo.language || 'JavaScript',
      topics,
      source: 'github' as const,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      size: repo.size,
      updated_at: repo.updated_at,
    } satisfies PortfolioProject;
  }));

  const projects = inspected.filter(project => project !== null);
  return NextResponse.json({ projects, source: 'github', username: USERNAME, filtered: true, minRepoSizeKb: MIN_REPO_SIZE_KB }, { headers: cacheHeaders });
}
