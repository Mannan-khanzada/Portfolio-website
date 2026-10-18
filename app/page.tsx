'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type FormEvent, type CSSProperties } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check,
  Code2, ExternalLink, Globe2, Mail, Menu, Plus, Send, X,
} from 'lucide-react';

const USERNAME = 'Mannan-khanzada';
const PROJECTS_SOURCE_URL = process.env.NEXT_PUBLIC_PROJECTS_SOURCE_URL || 'https://demo-projects-4eja.vercel.app/';
const CTA_GLOW = 'https://framerusercontent.com/images/tu25maYcTrrQ4R1iysXAk2gcY.png?height=1356&width=4800';

type PortfolioProject = {
  id: number; name: string; description: string | null;
  html_url: string; homepage: string | null; image_url?: string | null; language: string | null;
  topics: string[];
  source?: 'github' | 'vercel' | 'manual';
  stars?: number;
  forks?: number;
  size?: number;
  updated_at?: string;
};
type JourneyItem = { id: string; date: string; title: string; subtitle: string; description: string; link?: string };
type PortfolioConfig = { name?: string; role?: string; heroIntro?: string; aboutLead?: string; aboutBody?: string; projects?: PortfolioProject[]; journey?: JourneyItem[]; managedProjects?: boolean; managedJourney?: boolean; experienceEyebrow?: string; experienceTitle?: string; experienceLead?: string };
const CONFIG_KEY = 'mannan-portfolio-config-v1';
const TYPING_PHRASES = ['Digital Experiences', 'MERN Applications', 'Scalable Web Apps'];
// Explicit live deployments supplied by Mannan. These are kept in the
// portfolio even when the source gallery or GitHub API is temporarily offline.
const PROVIDED_DEPLOYMENTS: PortfolioProject[] = [
  { id: 880001, name: 'Dynamic Resume Builder', description: 'A live resume-building web application. Open the deployment to explore its current features and interface.', html_url: '', homepage: 'https://dynamic-resume-builder-zeta-ivory.vercel.app/', language: 'Web App', topics: ['Resume Builder', 'Web App'], source: 'vercel' },
  { id: 880002, name: 'Client Demo Platform', description: 'A client demo platform deployment, shared directly by Mannan for the selected project collection.', html_url: '', homepage: 'https://client-demo-platform.vercel.app/', language: 'Web Platform', topics: ['Client Demos', 'Platform'], source: 'vercel' },
  { id: 880003, name: 'Fuad Care', description: 'A live care-focused website. Visit the deployment to see the published user experience.', html_url: '', homepage: 'https://fuad.care/', language: 'Website', topics: ['Care', 'Website'], source: 'vercel' },
  { id: 880004, name: 'Refit Aesthetic Journey', description: 'A live aesthetic and wellness website shared as part of Mannan’s selected work.', html_url: '', homepage: 'https://refitaestheticjourney.com/', language: 'Website', topics: ['Aesthetic', 'Wellness'], source: 'vercel' },
  { id: 880005, name: 'Merck Builders', description: 'A live builder/construction-oriented website deployment. Explore the published pages and responsive design.', html_url: '', homepage: 'https://merck-builders.vercel.app/', language: 'Website', topics: ['Builders', 'Business Website'], source: 'vercel' },
  { id: 880006, name: 'Demo Projects', description: 'A live project demos deployment, included directly as requested.', html_url: '', homepage: 'https://demo-projects-4eja.vercel.app/', language: 'Project Collection', topics: ['Live Demos', 'Portfolio'], source: 'vercel' },
];
const GITHUB_PROFILE_URL = `https://github.com/${USERNAME}?tab=repositories`;
const fmt = (value: number) => new Intl.NumberFormat('en', { notation: value > 999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
const nice = (name: string) => name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const withProtocol = (url?: string | null) => !url?.trim() ? null : /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
const deploymentKey = (project: PortfolioProject) => {
  const candidate = withProtocol(project.homepage || project.html_url);
  if (candidate) { try { const url = new URL(candidate); return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, '')}`; } catch {} }
  return project.name.toLowerCase().replace(/[^a-z0-9]/g, '');
};
const withProvidedDeployments = (items: PortfolioProject[], preferCustom = false) => {
  const ordered = preferCustom ? [...items, ...PROVIDED_DEPLOYMENTS] : [...PROVIDED_DEPLOYMENTS, ...items];
  const seen = new Set<string>();
  return ordered.filter(project => { const key = deploymentKey(project); if (!key || seen.has(key)) return false; seen.add(key); return true; });
};


function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={`reveal ${className}`} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>{children}</div>;
}
function Counter({ value, suffix = '+' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) { setActive(true); io.disconnect(); } }, { threshold: .3 });
    io.observe(ref.current); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!active) return;
    let raf = 0; const start = performance.now(); const duration = 1050;
    const tick = (now: number) => { const p = Math.min(1, (now - start) / duration); setCount(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [active, value]);
  return <span ref={ref}>{fmt(count)}{suffix}</span>;
}
function SectionEyebrow({ children }: { children: ReactNode; number?: string }) {
  return <div className="eyebrow"><span className="eyebrow-dot">•</span><span>{children}</span></div>;
}
function repoPreview(project: PortfolioProject, preferredWidth = 1200) {
  const homepage = withProtocol(project.homepage || project.html_url);
  if (!homepage) return '';
  // Server route first uses the live site's own Open Graph image, then a page screenshot.
  return `/api/project-image?url=${encodeURIComponent(homepage)}&width=${preferredWidth}`;
}
function ProjectImage({ repo, className = '', showOpen = true }: { repo: PortfolioProject; className?: string; showOpen?: boolean }) {
  const [mode, setMode] = useState<'catalog' | 'live' | 'cover'>(repo.image_url ? 'catalog' : 'live');
  const homepage = withProtocol(repo.homepage || repo.html_url);
  const source = mode === 'catalog' && repo.image_url
    ? repo.image_url
    : mode === 'live' ? repoPreview(repo, 1280) : '';
  const fallbackTopics = repo.topics?.length ? repo.topics.slice(0, 3) : [repo.language || 'Live website', (() => { try { return new URL(homepage || PROJECTS_SOURCE_URL).hostname.replace(/^www\./, ''); } catch { return 'Web project'; } })()];
  const accent = '#ff4a14';
  return <div className={`project-image ${className}`}>
    {source ? <img key={`${repo.id}-${mode}`} src={source} alt={`${nice(repo.name)} website preview`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setMode(current => current === 'catalog' && homepage ? 'live' : 'cover')} /> : <div className="project-image-fallback project-cover-art" style={{ '--cover-accent': accent } as CSSProperties}>
      <div className="cover-browser-bar"><span/><span/><span/><small>LIVE WEBSITE</small></div>
      <div className="cover-art-content"><small>PROJECT PREVIEW / {String(repo.id).slice(-3)}</small><strong>{nice(repo.name)}</strong><p>{repo.description || 'Open this project to explore the live website and its interactive experience.'}</p><div className="cover-art-tags">{fallbackTopics.map(topic => <i key={topic}>{topic}</i>)}</div></div>
      <div className="cover-art-orb" aria-hidden="true"/><Code2 className="cover-art-code" size={42} aria-hidden="true"/>
    </div>}
    <div className="project-image-shade"/><span className="project-index">{repo.source === 'github' ? 'GITHUB REPO' : 'LIVE PROJECT'} / {String(repo.id).slice(-2)}</span>
    {showOpen && <a className="image-open" href={homepage || PROJECTS_SOURCE_URL} target="_blank" rel="noreferrer" aria-label={`Open ${repo.name}`}><ArrowUpRight size={20}/></a>}
  </div>;
}

export default function PortfolioPage() {
  const [liveProjects, setLiveProjects] = useState<PortfolioProject[]>([]);
  const [journey, setJourney] = useState<JourneyItem[]>([]);
  const [profileConfig, setProfileConfig] = useState<PortfolioConfig>({});
  const [loading, setLoading] = useState(true);
  const [heroIntroReady, setHeroIntroReady] = useState(false);
  const [typedTitle, setTypedTitle] = useState(TYPING_PHRASES[0]);
  const [error, setError] = useState('');
  const [serviceOpen, setServiceOpen] = useState<number | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [projectIndex, setProjectIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [formStatus, setFormStatus] = useState('');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const savedRaw = localStorage.getItem(CONFIG_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw) as PortfolioConfig;
        // Only an actual non-empty manual list overrides the automatic imports.
        if (saved.managedProjects && Array.isArray(saved.projects)) {
          setLiveProjects(saved.projects.map(project => ({ ...project, source: project.source || 'vercel' })));
          setProjectIndex(0);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore invalid saved admin data and continue with automatic imports */ }

    const [githubResult, vercelResult] = await Promise.allSettled([
      fetch('/api/github-projects', { cache: 'no-store' }).then(async response => {
        if (!response.ok) throw new Error(`GitHub importer returned ${response.status}`);
        return await response.json() as { projects?: PortfolioProject[]; warning?: string };
      }),
      fetch('/api/vercel-projects', { cache: 'no-store' }).then(async response => {
        if (!response.ok) throw new Error(`Vercel collection returned ${response.status}`);
        return await response.json() as { projects?: PortfolioProject[]; error?: string; sourceUrl?: string };
      }),
    ]);

    const githubProjects = githubResult.status === 'fulfilled' && Array.isArray(githubResult.value.projects)
      ? githubResult.value.projects.filter(item => Boolean(item?.name && item?.html_url)).map(item => ({ ...item, source: 'github' as const }))
      : [];
    const importedVercelProjects = vercelResult.status === 'fulfilled' && Array.isArray(vercelResult.value.projects)
      ? vercelResult.value.projects.filter(item => Boolean(item?.name && (item?.homepage || item?.html_url))).map(item => ({ ...item, source: item.source || 'vercel' as const }))
      : [];
    const normalizedUrl = (value?: string | null) => {
      const safe = withProtocol(value);
      if (!safe) return '';
      try { const url = new URL(safe); return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, '')}`; } catch { return safe.toLowerCase(); }
    };
    const providedUrls = new Set(PROVIDED_DEPLOYMENTS.map(project => normalizedUrl(project.homepage)));
    // Don't duplicate the explicitly supplied URLs if the discovery page also
    // happens to list them; the curated entries have better, human-readable names.
    const vercelProjects = importedVercelProjects.filter(project => !providedUrls.has(normalizedUrl(project.homepage || project.html_url)));

    // Match same-name items so a personal GitHub repo can inherit its deployment
    // URL/thumbnail from the live collection rather than appear twice.
    const normalizedName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const combinedGithub = githubProjects.map(repo => {
      const deployedMatch = vercelProjects.find(item => normalizedName(item.name) === normalizedName(repo.name));
      return deployedMatch ? { ...repo, homepage: repo.homepage || deployedMatch.homepage, image_url: repo.image_url || deployedMatch.image_url } : repo;
    });
    const githubNames = new Set(combinedGithub.map(repo => normalizedName(repo.name)));
    const remainingDeployments = vercelProjects.filter(repo => !githubNames.has(normalizedName(repo.name)));
    // Show projects handed directly to us first, then substantial GitHub MERN
    // repositories and any additional deployments discovered from the gallery.
    const merged = withProvidedDeployments([...combinedGithub, ...remainingDeployments]);
    setLiveProjects(merged);
    setProjectIndex(0);

    const githubFailed = githubResult.status === 'rejected';
    const vercelFailed = vercelResult.status === 'rejected';
    if (!merged.length) {
      setError(githubFailed && vercelFailed
        ? 'Could not load GitHub MERN repositories or the live project collection. Check the deployed server connection, then retry.'
        : 'No substantial MERN repositories or live projects matched the import filters. Add projects from the admin panel or check the source configuration.');
    } else if (githubFailed || vercelFailed) {
      setError(githubFailed ? 'GitHub could not be reached; showing projects from the live collection instead.' : 'The live collection could not be reached; showing qualifying GitHub MERN repositories instead.');
    } else {
      setError('');
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void fetchProjects();
    try { const raw = localStorage.getItem(CONFIG_KEY); if (raw) { const config = JSON.parse(raw) as PortfolioConfig; setProfileConfig(config); if (Array.isArray(config.projects) && config.projects.length > 0) { setLiveProjects(withProvidedDeployments(config.projects, true)); setLoading(false); setError(''); } if (Array.isArray(config.journey)) setJourney(config.journey); } } catch { /* keep live defaults if local config is malformed */ }
    const sync = (event: StorageEvent) => { if (event.key !== CONFIG_KEY) return; try { const config = event.newValue ? JSON.parse(event.newValue) as PortfolioConfig : {}; setProfileConfig(config); if (Array.isArray(config.projects) && config.projects.length > 0) setLiveProjects(withProvidedDeployments(config.projects, true)); else void fetchProjects(); if (Array.isArray(config.journey)) setJourney(config.journey); } catch {} };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, [fetchProjects]);
  useEffect(() => {
    // Start the hero sequence only after the first paint. This avoids animations
    // being consumed before hydration and makes the welcome reveal repeatable.
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setHeroIntroReady(true));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);
  useEffect(() => {
    if (!heroIntroReady) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedTitle(TYPING_PHRASES[0]);
      return;
    }
    let phraseIndex = 0;
    let characterIndex = TYPING_PHRASES[0].length;
    let deleting = true;
    let timer = 0;
    const tick = () => {
      const phrase = TYPING_PHRASES[phraseIndex];
      if (deleting) {
        characterIndex = Math.max(0, characterIndex - 1);
        setTypedTitle(phrase.slice(0, characterIndex));
        if (characterIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % TYPING_PHRASES.length;
          timer = window.setTimeout(tick, 260);
        } else {
          timer = window.setTimeout(tick, 34);
        }
        return;
      }
      const nextPhrase = TYPING_PHRASES[phraseIndex];
      characterIndex = Math.min(nextPhrase.length, characterIndex + 1);
      setTypedTitle(nextPhrase.slice(0, characterIndex));
      if (characterIndex === nextPhrase.length) {
        deleting = true;
        timer = window.setTimeout(tick, 1450);
      } else {
        timer = window.setTimeout(tick, 72);
      }
    };
    timer = window.setTimeout(tick, 1450);
    return () => window.clearTimeout(timer);
  }, [heroIntroReady]);
  useEffect(() => {
    // Default styles keep all content visible. Once hydration succeeds, enable
    // scroll reveals and observe each rendered section/card.
    document.documentElement.classList.add('has-motion');
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'));
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const reveal = (element: Element) => element.classList.add('is-visible');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    }), { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    elements.forEach(el => observer.observe(el));

    // Safety net: an observer issue must never leave text/cards hidden forever.
    const safetyTimer = window.setTimeout(() => {
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.35 && rect.bottom > -100) reveal(el);
      });
    }, 1300);
    return () => { observer.disconnect(); window.clearTimeout(safetyTimer); };
  }, [loading, liveProjects.length, projectIndex, testimonialIndex]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  const name = profileConfig.name?.trim() || 'Mannan Khanzada';
  const firstName = name.split(/\s+/)[0] || 'Mannan';
  const avatar = `https://github.com/${USERNAME}.png`;
  const email = '';
  const projectCount = liveProjects.length;
  const liveLinkCount = liveProjects.filter(repo => Boolean(withProtocol(repo.homepage))).length;
  const languages = useMemo(() => Array.from(new Set(liveProjects.map(repo => repo.language).filter((value): value is string => Boolean(value)))), [liveProjects]);
  const projects = useMemo(() => liveProjects.slice(0, Math.max(4, liveProjects.length)), [liveProjects]);
  const activeProject = projects.length ? projects[projectIndex % projects.length] : null;
  const proofProjects = projects.length ? [projects[testimonialIndex % projects.length], projects[(testimonialIndex + 1) % projects.length], projects[(testimonialIndex + 2) % projects.length]] : [];
  const topRecent = projects.slice(0, 4);
  const experienceRows = profileConfig.managedJourney ? journey : journey.length ? journey : projects.slice(0, 4).map((repo, index) => ({ id: String(repo.id), date: 'LIVE PROJECT', title: nice(repo.name), subtitle: repo.language || 'LIVE WEBSITE', description: repo.description || 'Explore this live website and the interactive experience behind the project.', link: repo.homepage || repo.html_url }));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = `Portfolio inquiry for ${name}`;
    const body = `Hello ${name}, I would like to discuss a project.\n\nPlease reply to: ${contactEmail}`;
    if (email) { setFormStatus('Opening your email app…'); window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }
    else { const copy = `${subject}\n\n${body}\n\nProjects: ${PROJECTS_SOURCE_URL}`; void navigator.clipboard?.writeText(copy).catch(() => undefined); setFormStatus('Your message details are ready to copy. Opening your live project collection.'); window.open(PROJECTS_SOURCE_URL, '_blank', 'noopener,noreferrer'); }
  };

  const services = [
    { before: 'Framer', emphasis: 'Development', intro: 'Fast, responsive Framer websites built around the needs of a brand or product.', detail: 'Responsive layouts, CMS setup, performance improvements and practical SEO foundations.' },
    { before: 'Landing Page', emphasis: 'Design', intro: 'Focused landing pages designed to explain a product and guide visitors toward action.', detail: 'Clear visual hierarchy, mobile-first layouts, thoughtful content flow and intentional calls to action.' },
    { before: 'Website', emphasis: 'Redesign', intro: 'Modernising an existing website with a clearer structure and more considered interaction.', detail: 'Review information architecture, refine the visual system, improve accessibility and optimise performance.' },
    { before: 'Webflow', emphasis: 'Development', intro: 'Polished Webflow builds that balance a flexible editing workflow with a consistent visual system.', detail: 'Custom responsive sections, reusable components, animation and CMS-friendly implementation.' },
  ];
  const faqs = [
    { q: "What's your background and how did you get started?", a: 'I am a developer who learns by building real projects. My live projects showcase the tools, interfaces and experiments that make up my development journey.' },
    { q: 'What services do you offer?', a: 'Website development, frontend interfaces, web applications and integrations. I tailor the technology and scope to the needs of each project.' },
    { q: 'What makes your work different?', a: 'I care about both the experience people use and the code behind it: responsive details, clear structure, maintainability and useful outcomes.' },
    { q: 'Do you work with clients remotely or only in person?', a: 'I am open to remote collaboration. Use the contact links below to share the goal, timeline and any useful reference material.' },
    { q: 'Can I see examples of your past work or projects?', a: 'Yes. The featured work and project cards link directly to my live projects collection.' },
  ];

  return <main className={`portfolio ${heroIntroReady ? 'hero-intro-start' : ''}`} id="top">
    <header className="site-header">
      <div className="nav-wrap">
        <a className="logo" href="#top" aria-label={`${name} home`}><span className="logo-mark">{firstName[0]}<i>.</i></span><span className="logo-name">{name}<small>DEVELOPER & DIGITAL BUILDER</small></span></a>
        <nav className={menuOpen ? 'nav-links nav-links-open' : 'nav-links'} aria-label="Main navigation">
          <a href="#work" onClick={() => setMenuOpen(false)}>Work</a><a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <a className="nav-talk" href="#contact">Let&apos;s Talk <ArrowUpRight size={14}/></a>
        <button className="nav-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button>
      </div>
    </header>

    <section className="hero" id="home">
      <div className="hero-stage content-width">
        <div className="hero-light-streak" aria-hidden="true"/>
        <div className="hero-copy">
          <span className="hero-welcome-banner"><i className="welcome-orbit"/><span>WELCOME TO MY PORTFOLIO</span><b>SCROLL TO EXPLORE</b></span>
          <span className="hero-role"><i/> {profileConfig.role || 'Software Developer'}</span>
          <h1 aria-label={`Hi, I am ${firstName}. Building premium digital experiences.`}>
            <span className="hero-line"><span className="hero-line-inner">Hi, I&apos;m <b>{firstName}.</b></span></span>
            <span className="hero-line"><span className="hero-line-inner">Building Premium</span></span>
            <span className="hero-line hero-line-emphasis"><span className="hero-line-inner"><em>{typedTitle}</em><i>.</i><span className="typing-caret" aria-hidden="true"/></span></span>
          </h1>
          <p>{profileConfig.heroIntro || 'I build modern websites, web applications and practical software with a focus on thoughtful details and useful outcomes.'}</p>
          <div className="hero-actions"><a className="text-action action-orange" href="#contact">Let&apos;s Build Together <ArrowUpRight size={18}/></a><a className="text-action" href="#work">Explore Projects <ArrowRight size={18}/></a></div>
        </div>
        <div className="hero-portrait" aria-hidden="true">
          <img src={avatar} alt="" fetchPriority="high"/>
          <span className="hero-portrait-shade"/>
          <span className="hero-portrait-label">{name.toUpperCase()} <i/> DEVELOPER</span>
        </div>
        <div className="hero-bottom" aria-label="Scroll to explore"><span>SCROLL TO EXPLORE</span><ArrowDown size={20}/></div>
      </div>
    </section>

    <section className="about content-width" id="about">
      <div className="section-side-label"><SectionEyebrow number="01">About Me</SectionEyebrow></div>
      <div className="about-grid">
        <Reveal className="about-portrait"><div className="portrait-frame"><img src={avatar} alt={`${name} profile portrait`} loading="lazy"/><span className="portrait-edge portrait-edge-a"/><span className="portrait-edge portrait-edge-b"/></div><div className="portrait-caption"><span>BASED IN PAKISTAN</span><span>AVAILABLE FOR COLLABORATION <i/></span></div></Reveal>
        <Reveal className="about-copy" delay={100}><h2>I&apos;m <em>{firstName}</em>, crafting<br/>meaningful digital<br/>experiences.</h2><p className="about-lead">{profileConfig.aboutLead || 'A developer who likes turning ideas into useful, well-made digital products.'}</p><p className="about-body">{profileConfig.aboutBody || 'I enjoy building websites, exploring software ideas and making interfaces feel clear and considered. Have a look through my projects to see the work and code behind them.'}</p><div className="about-stats"><div><strong>{loading ? '—' : <Counter value={liveProjects.length}/>}</strong><span>SELECTED PROJECTS</span></div><div><strong>{loading ? '—' : <Counter value={languages.length} suffix=""/>}</strong><span>TECH TAGS</span></div><div><strong>{loading ? '—' : <Counter value={liveLinkCount} suffix=""/>}</strong><span>LIVE DEMOS</span></div></div><a className="subtle-link" href={PROJECTS_SOURCE_URL} target="_blank" rel="noreferrer">Explore live projects <ArrowUpRight size={14}/></a></Reveal>
      </div>
    </section>

    <section className="services content-width" id="services">
      <div className="services-heading"><div><SectionEyebrow number="02">Services</SectionEyebrow><h2>My <em>services</em></h2><p>Helping turn ideas into focused, high-performing digital experiences.</p></div><a className="book-link" href="#contact">Book a call <ArrowUpRight size={14}/></a></div>
      <div className="service-list">{services.map((service, index) => <article className={`service-row ${serviceOpen === index ? 'service-row-open' : ''}`} key={service.before + service.emphasis}><button onClick={() => setServiceOpen(serviceOpen === index ? null : index)} aria-expanded={serviceOpen === index}><span className="service-title"><span>{service.before}</span> <em>{service.emphasis}</em></span><ArrowUpRight className="service-row-arrow" size={24}/></button><div className="service-details"><p>{service.intro}</p>{serviceOpen === index && <div className="service-detail-expanded"><p>{service.detail}</p><a href="#contact">Discuss this service <ArrowUpRight size={16}/></a></div>}</div></article>)}</div>
    </section>

    <section className="work content-width" id="work">
      <div className="work-heading"><SectionEyebrow number="03">Work</SectionEyebrow><h2>My latest <em>work</em></h2><p>Larger MERN-stack builds from GitHub, alongside live deployments and selected web projects.</p></div>
      {loading ? <div className="work-loading"><span className="loading-dot"/> Finding substantial MERN repositories on GitHub and loading live projects…</div> : activeProject ? <div className="project-showcase" key={activeProject.id}><Reveal className="project-showcase-visual"><div className="project-browser-frame"><ProjectImage repo={activeProject} className="project-large-image"/><div className="project-overlay-arrows"><button onClick={() => setProjectIndex(value => (value - 1 + projects.length) % projects.length)} aria-label="Previous project" disabled={projects.length < 2}><ArrowLeft size={17}/></button><button onClick={() => setProjectIndex(value => (value + 1) % projects.length)} aria-label="Next project" disabled={projects.length < 2}><ArrowRight size={17}/></button></div><div className="project-image-bottom"><span>SELECTED PROJECT / {String(projectIndex + 1).padStart(2, '0')}</span><span>{activeProject.language || (activeProject.homepage ? 'LIVE WEBSITE' : 'GITHUB REPOSITORY')}</span></div></div></Reveal><Reveal className="project-showcase-copy" delay={100}><div className="project-type"><span className="orange-dot"/> FEATURED PROJECT</div><h3>{nice(activeProject.name)}</h3><p>{activeProject.description || 'A live website from my project collection. Open it to explore the interface, features and experience.'}</p><div className="project-facts"><div><span>PROJECT TYPE</span><b><Globe2 size={14}/>{activeProject.language || 'Live website'}</b></div><div><span>HOST</span><b>{(() => { try { return new URL(withProtocol(activeProject.homepage) || activeProject.html_url).hostname.replace(/^www\./, ''); } catch { return 'Web'; } })()}</b></div><div><span>{activeProject.source === 'github' && !activeProject.homepage ? 'REPOSITORY' : 'PREVIEW'}</span><b><Check size={14}/>{activeProject.homepage ? 'Live demo available' : 'Source code available'}</b></div>{activeProject.source === 'github' && typeof activeProject.stars === 'number' && <div><span>GITHUB STARS</span><b><Code2 size={14}/>{fmt(activeProject.stars)} stars</b></div>}</div><div className="project-controls"><a className="project-view" href={withProtocol(activeProject.homepage) || activeProject.html_url} target="_blank" rel="noreferrer">{activeProject.homepage ? 'Visit live demo' : activeProject.source === 'github' ? 'Open GitHub repo' : 'Visit project'} <ArrowUpRight size={15}/></a><a className="project-view project-live" href={activeProject.source === 'github' ? activeProject.html_url : PROJECTS_SOURCE_URL} target="_blank" rel="noreferrer">{activeProject.source === 'github' ? 'View source code' : 'Project collection'} <ExternalLink size={14}/></a></div></Reveal></div> : <div className="work-empty"><p>{error || 'Projects are temporarily unavailable.'}</p><a href={PROJECTS_SOURCE_URL} target="_blank" rel="noreferrer">Open project collection <ArrowUpRight size={15}/></a><button onClick={() => void fetchProjects()}>Retry loading</button></div>}
      {error && !loading && <div className="api-note">{error} <button onClick={() => void fetchProjects()}>Retry</button></div>}
      {!loading && liveProjects.length > 1 && <div className="work-pagination"><span>{String(projectIndex + 1).padStart(2, '0')} <i/> {String(projects.length).padStart(2, '0')}</span><div className="pagination-track"><span style={{ width: `${((projectIndex + 1) / projects.length) * 100}%` }}/></div><a href={PROJECTS_SOURCE_URL} target="_blank" rel="noreferrer">All projects <ArrowUpRight size={14}/></a></div>}
      {!loading && projects.length > 0 && <div className="project-library" aria-label="All live project cards">
        <div className="project-library-heading"><div><SectionEyebrow number="03.1">Project library</SectionEyebrow><h3>More <em>projects</em></h3></div><a href={GITHUB_PROFILE_URL} target="_blank" rel="noreferrer">View GitHub repositories <ArrowUpRight size={15}/></a></div>
        <div className="project-library-grid">{projects.map((repo, index) => <article className="project-card reveal" key={repo.id} style={{ '--reveal-delay': `${Math.min(index, 8) * 65}ms` } as CSSProperties}>
          <a className="project-card-media" href={withProtocol(repo.homepage) || repo.html_url} target="_blank" rel="noreferrer" aria-label={`Open ${nice(repo.name)}`}>
            <ProjectImage repo={repo} className="project-card-preview" showOpen={false}/>
            <span className="project-card-number">{String(index + 1).padStart(2, '0')}</span><span className="project-card-open"><ArrowUpRight size={18}/></span>
          </a>
          <div className="project-card-body"><div className="project-card-meta"><span><Globe2 size={13}/>{repo.language || 'Web project'}</span><span><Check size={13}/>{repo.homepage ? 'Live demo' : repo.source === 'github' ? 'GitHub repo' : 'Project'}</span>{repo.source === 'github' && typeof repo.stars === 'number' ? <span><ExternalLink size={13}/>{fmt(repo.stars)} stars</span> : <span><ExternalLink size={13}/>Preview</span>}</div>
            <h3><a href={withProtocol(repo.homepage) || repo.html_url} target="_blank" rel="noreferrer">{nice(repo.name)}</a></h3><p>{repo.description || 'Open this project to explore the live website and its interactive experience.'}</p>
            <div className="project-card-footer"><span>{repo.source === 'github' ? 'GITHUB PROJECT' : repo.homepage ? 'LIVE WEBSITE' : 'PROJECT'}</span><div>{repo.source === 'github' && <a href={repo.html_url} target="_blank" rel="noreferrer">SOURCE CODE <ExternalLink size={12}/></a>}<a href={withProtocol(repo.homepage) || repo.html_url} target="_blank" rel="noreferrer">{repo.homepage ? 'OPEN DEMO' : repo.source === 'github' ? 'OPEN REPO' : 'OPEN PROJECT'} <ArrowUpRight size={12}/></a></div></div>
          </div>
        </article>)}</div>
      </div>}
    </section>

    <section className="contact-strip" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.34) 52%, rgba(0,0,0,.82) 100%), url(${CTA_GLOW})` }}><div className="contact-strip-inner content-width"><div><span className="strip-label">✳ Let&apos;s connect</span><h2>Have an idea?<br/>Let&apos;s get <em>in touch.</em></h2><p>Let&apos;s build something thoughtful, useful and memorable together.</p></div><a className="circle-cta" href="#contact">Get in touch <ArrowUpRight size={19}/></a></div></section>

    <section className="experience content-width" id="experience"><div className="center-heading"><SectionEyebrow number="04">{profileConfig.experienceEyebrow || 'Experience'}</SectionEyebrow><h2>{(profileConfig.experienceTitle || 'Take a look at my past experience').split('\n').map((line, i) => { const pos = line.toLowerCase().lastIndexOf('experience'); return <span key={i}>{i > 0 && <br/>}{pos >= 0 ? <>{line.slice(0, pos)}<em>{line.slice(pos)}</em></> : line}</span>; })}</h2><p>{profileConfig.experienceLead || 'Project activity and learning through building in public.'}</p></div><div className="experience-list">{experienceRows.map((item, index) => <Reveal key={item.id} className="experience-row" delay={index * 55}><div className="experience-date">{item.date}</div><div className="experience-main"><h3>{item.title}</h3><span>{item.subtitle} <i/> JOURNEY</span><p>{item.description}</p></div>{item.link && <a href={withProtocol(item.link) || '#experience'} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}><ArrowUpRight size={17}/></a>}</Reveal>)}</div></section>

    <section className="collaboration content-width" id="collaboration">
      <div className="collab-heading"><SectionEyebrow number="05">Collaboration</SectionEyebrow><h2>Ready to build<br/>your next <em>project?</em></h2><p>Let&apos;s create a modern digital experience that helps your idea stand out.</p></div>
      <div className="collab-card">
        <div className="collab-left"><span className="collab-count">{loading ? '—' : fmt(liveProjects.length)}<i>+</i></span><span className="collab-count-label">PROJECTS IN COLLECTION</span><div className="collab-image-grid">{(loading ? [] : topRecent).slice(0, 4).map((repo, index) => <a href={withProtocol(repo.homepage) || repo.html_url} target="_blank" rel="noreferrer" key={repo.id} className={`collab-img collab-img-${index + 1}`}><ProjectImage repo={repo} showOpen={false}/><span>{nice(repo.name)}</span></a>)}{loading && <div className="collab-image-loading">Loading project previews…</div>}{!loading && !topRecent.length && <div className="collab-image-loading">Open live projects · {name}</div>}</div></div>
        <div className="collab-right"><span className="call-label">BOOK A FREE 30 MIN STRATEGY CALL</span><h3>What you&apos;ll <em>get</em></h3><p>A focused first conversation to understand what you want to build and identify the clearest next steps.</p><div className="what-you-get"><span><Check size={17}/> Discuss your goals</span><span><Check size={17}/> Explore possible solutions</span><span><Check size={17}/> Outline next steps</span></div><a className="orange-button" href="#contact">Schedule a call <ArrowUpRight size={17}/></a></div>
      </div>
    </section>

    <section className="process content-width"><div className="process-heading"><SectionEyebrow number="06">Process</SectionEyebrow><h2>My <em>process</em></h2><p>A simple, considered workflow that takes an idea from first questions to a working experience.</p></div><div className="process-grid">{[{ title: 'Research', copy: 'Understanding business goals, audience needs, and opportunities to build a strong strategic foundation.', asset: '/process/01-research.png' }, { title: 'Design', copy: 'Crafting intuitive, visually engaging experiences that balance usability, branding, and conversion goals.', asset: '/process/02-design.png' }, { title: 'Development', copy: 'Building fast, responsive websites and applications with performance and scalability.', asset: '/process/03-development.png' }].map((item, index) => <Reveal key={item.title} className="process-card" delay={index * 90}><div className="process-art" aria-hidden="true"><img src={item.asset} alt="" loading="lazy"/></div><div className="process-card-title"><span>0{index + 1}</span><h3>{item.title}</h3></div><p>{item.copy}</p></Reveal>)}</div></section>

    <section className="pricing content-width"><div className="pricing-heading"><SectionEyebrow number="07">Pricing</SectionEyebrow><h2>Pricing & <em>Engagements</em></h2><p>Flexible engagement options tailored for different project goals and levels of complexity.</p></div><div className="pricing-grid"><Reveal><article className="price-card"><span className="price-label">STANDARD PLAN</span><h3>Standard <em>Plan</em></h3><p>For startups and businesses with a ready design.</p><div className="price"><strong>$35</strong><span>/ Hour</span></div><div className="price-includes">WHAT&apos;S INCLUDED</div><ul>{['Framer Development', 'Responsive Optimization', 'Basic Animations', 'SEO Essentials', 'Fast Turnaround'].map(text => <li key={text}><Check size={14}/>{text}</li>)}</ul><a href="#contact" className="price-link">Start a Project <ArrowUpRight size={15}/></a><p className="price-description">Ideal for design-ready projects that need fast, reliable development with responsive optimization, SEO, and smooth animations.</p></article></Reveal><Reveal delay={90}><article className="price-card price-card-premium"><span className="price-label">PREMIUM PLAN</span><h3>Premium <em>Plan</em></h3><p>For brands seeking design and development solutions.</p><div className="price"><strong>$75</strong><span>/ Hour</span></div><div className="price-includes">WHAT&apos;S INCLUDED</div><ul>{['Custom Strategy & Planning', 'Design + Development', 'Advanced Animations', 'Custom Integrations', 'Dedicated Support'].map(text => <li key={text}><Check size={14}/>{text}</li>)}</ul><a href="#contact" className="price-link">Start a Project <ArrowUpRight size={15}/></a><p className="price-description">Perfect for ambitious brands requiring a premium digital experience with strategy, scalability, and long-term growth.</p></article></Reveal></div></section>

    <section className="faq content-width"><div className="faq-title"><SectionEyebrow number="08">Pricing</SectionEyebrow><h2>Frequently<br/>asked <em>question</em></h2><p>Answers to common questions about projects and collaboration.</p></div><div className="faq-list">{faqs.map((faq, index) => <article className={`faq-item ${faqOpen === index ? 'faq-item-open' : ''}`} key={faq.q}><button onClick={() => setFaqOpen(faqOpen === index ? null : index)} aria-expanded={faqOpen === index}><strong>{faq.q}</strong><span className="faq-chevron"><Plus size={16}/></span></button><div className="faq-answer"><p>{faq.a}</p></div></article>)}</div></section>

    <section className="proof content-width"><div className="proof-heading"><SectionEyebrow number="09">Feedbacks</SectionEyebrow><h2>Why clients<br/><em>trust my work</em></h2><p>Explore my live websites, interface experiments and digital projects.</p></div><div className="proof-layout"><div className="proof-photo"><img src={avatar} alt={`${name} portrait`} loading="lazy"/><div className="proof-photo-caption"><span>{name}</span><small>DEVELOPER / BUILDER</small></div></div><article className="proof-project-card"><div className="proof-card-top"><span>PROJECT OVERVIEW</span><span className="proof-live"><i/> LIVE WEBSITE</span></div><p>{proofProjects[0]?.description || 'Explore the live website and interactive experience from this project collection.'}</p><div className="proof-project-bottom"><div><b>{proofProjects[0] ? nice(proofProjects[0].name) : 'Live Project Collection'}</b><small>{proofProjects[0]?.language || 'Live website'} · Project preview available</small></div><div className="proof-arrows"><button onClick={() => setTestimonialIndex((testimonialIndex - 1 + Math.max(1, projects.length)) % Math.max(1, projects.length))} aria-label="Previous project proof"><ArrowLeft size={15}/></button><button onClick={() => setTestimonialIndex((testimonialIndex + 1) % Math.max(1, projects.length))} aria-label="Next project proof"><ArrowRight size={15}/></button></div></div></article><aside className="proof-stat"><span>PROJECT COLLECTION</span><strong>{loading ? '—' : <><Counter value={liveProjects.length} suffix=""/><i>+</i></>}</strong><p>Live websites, experiments and digital experiences in the project collection.</p><div className="proof-stat-foot"><span><Globe2 size={13}/> {fmt(projectCount)} PROJECTS</span><span><ExternalLink size={13}/> {fmt(liveLinkCount)} LIVE LINKS</span></div></aside></div></section>

    <div className="marquee" aria-label="Let's build together"><div className="marquee-track">{Array.from({ length: 6 }, (_, i) => <span key={i}>LET&apos;S BUILD <em>TOGETHER</em> <i>✳</i></span>)}</div></div>

    <footer className="footer" id="contact"><div className="footer-glow" aria-hidden="true"/><div className="footer-top content-width"><div className="footer-contact"><a className="footer-brand" href="#top">{name}<sup>®</sup></a><h2>Let&apos;s work <em>together!</em></h2><a className="footer-email" href={email ? `mailto:${email}` : PROJECTS_SOURCE_URL} target={email ? undefined : '_blank'} rel={email ? undefined : 'noreferrer'}>{email || 'demo-projects-4eja.vercel.app'}</a><form className="footer-form" onSubmit={onSubmit}><input type="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} placeholder="Enter Email" aria-label="Your email address" required/><button type="submit">Send <ArrowUpRight size={15}/></button></form>{formStatus && <p className="form-status">{formStatus}</p>}<p className="footer-credits">Designed &amp; developed by {name}<br/>Built with Next.js &amp; React</p></div><nav className="footer-nav" aria-label="Footer navigation"><a href="#top"><span>↗ &nbsp; Home</span><i>01</i></a><a href="#about"><span>↗ &nbsp; About</span><i>02</i></a><a href="#services"><span>↗ &nbsp; Services</span><i>03</i></a><a href="#work"><span>↗ &nbsp; Projects</span><i>04</i></a><a href="#contact"><span>↗ &nbsp; Contact</span><i>05</i></a></nav></div><div className="footer-bottom content-width"><span>© {new Date().getFullYear()} {name.toUpperCase()} · ALL RIGHTS RESERVED</span><a href="/admin" className="admin-footer-link">ADMIN</a><span className="footer-social"><a href={PROJECTS_SOURCE_URL} target="_blank" rel="noreferrer" aria-label="Project collection"><Globe2 size={16}/></a>{email && <a href={`mailto:${email}`} aria-label="Email"><Mail size={16}/></a>}</span><button onClick={() => void fetchProjects()}>↻ REFRESH PROJECTS</button></div></footer>
  </main>;
}
