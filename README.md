# Mannan Khanzada — Live Projects Portfolio

A responsive dark editorial portfolio inspired by the supplied RK Abir reference video. The visual layout includes the animated welcome banner, staggered hero headline, monochrome portrait treatment, orange light streak, editorial service rows, featured project carousel, image-first project grid, scroll reveals, moving marquee, and animated footer details.

## Project data sources

The project section combines two sources:

- **GitHub MERN importer** (`/api/github-projects`): inspects public repositories from the configured GitHub account and keeps only substantial, documented projects with evidence for React, Express, MongoDB and Node.js plus multiple product-level features. It skips forks, archived repos, small practice demos and unrelated stacks. The importer checks repository README/package metadata, includes GitHub stars and source links, and tries to extract a real project image from the README.
- **Live project collection** (`/api/vercel-projects`): reads the page at `https://demo-projects-4eja.vercel.app/`, extracts project links, titles, descriptions and available thumbnails. Project cards use an extracted image first, then a screenshot of the live URL through `image.thum.io`, and then a CSS fallback.

Only repositories from your configured GitHub profile are imported automatically; other developers' repositories are not presented as your work. Where a matching live deployment exists, the GitHub repo card can use that deployment as its demo URL. The GitHub importer caches results for one hour and inspects up to 18 sizeable candidates per refresh to stay within GitHub API limits.

If the collection page renders tiles entirely in client-side JavaScript, the Vercel route attempts to detect URLs in the embedded page data. You can still add a verified project manually using `/admin`.

### GitHub configuration

Set these variables in `.env.local` or your deployment environment:

```bash
GITHUB_USERNAME=Mannan-khanzada
# Optional, server-only; helps avoid the unauthenticated GitHub API limit.
GITHUB_TOKEN=
```

Keep `GITHUB_TOKEN` server-only and never give it the `NEXT_PUBLIC_` prefix. The default account is `Mannan-khanzada`.

### Configure the project directory

You can change the project catalog URL by setting both variables in `.env.local` and redeploying:

```bash
PROJECTS_SOURCE_URL=https://demo-projects-4eja.vercel.app/
NEXT_PUBLIC_PROJECTS_SOURCE_URL=https://demo-projects-4eja.vercel.app/
```

The first is read by the server route; the second controls website links in the browser UI.

## Animation details

- The hero animation sequence is deliberately triggered after the first hydrated paint, so the welcome banner/headline reveal is not consumed before the browser is ready.
- Welcome banner entrance with an animated orange accent line and pulsing indicator
- Staggered headline line reveals, followed by a repeating typewriter animation for “Digital Experiences”, “MERN Applications”, and “Scalable Web Apps” with a blinking cursor
- Portrait wipe-in and slow motion drift, plus the orange light streak sweep and breathing glow
- IntersectionObserver-driven scroll reveals, with a safety fallback to keep content visible
- Project carousel transitions, screenshot zoom, project-card entrance stagger, hover lift, and animated CTA interactions
- Floating process artwork and continuous marquee ticker
- Reduced-motion preferences are respected

## Stack

- Next.js App Router, React, TypeScript
- Custom CSS keyframes and IntersectionObserver reveal effects
- Lucide icons
- Server-side GitHub MERN repo filtering and Vercel gallery parsing, both cached

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. For a production build, run `npm run build` and then `npm start`.

## Notes

- Six live deployments shared directly by Mannan are pinned into the project catalog: Dynamic Resume Builder, Client Demo Platform, Fuad Care, Refit Aesthetic Journey, Merck Builders, and Demo Projects. They remain visible even if the discovery endpoint is offline or older browser-side project data exists.
- This is a coded recreation, not an export of the original Framer source.
- The project source can only be verified against the actual Vercel page at runtime. This build environment did not have working external DNS/network access, so the GitHub and Vercel importers could not be live-tested against their remote APIs here.
- Remote screenshot service or origin images can fail for some sites; every project card keeps a CSS-generated fallback so it remains visible.
- Hourly prices are placeholders retained from the reference styling; replace them with your real rates before publishing.

## Protected Portfolio Admin Panel

`/admin` is protected by a server-side session check and redirects visitors who are not signed in to `/admin/login`. Login credentials are read only from server environment variables. Successful sign-in sets a signed, HTTP-only, SameSite=Strict cookie that expires after eight hours; the sign-out button clears it.

Set these in `.env.local` for local development and in the hosting provider environment settings (such as Vercel Project → Settings → Environment Variables) before deploying:

```bash
ADMIN_USERNAME=your-private-admin-username
ADMIN_PASSWORD=use-a-long-unique-password
# Make a new random secret; do not copy this example string.
ADMIN_SESSION_SECRET=your-random-secret-at-least-32-characters-long
```

Generate the session secret with `openssl rand -base64 48`. Do not commit `.env.local` or real secrets. If these values are missing or invalid, login is disabled rather than falling back to a default password. After setting them in Vercel, redeploy.

The admin dashboard has been redesigned with a responsive left sidebar, overview statistics, quick actions, searchable project management, profile editing, journey management, and backup/restore. The six known live deployments are preloaded in the project manager, and the first visit also attempts to import the GitHub/Vercel project catalogs so they can be edited together. Saving a managed catalog makes the portfolio use that catalog instead of appending hard-coded deployments.

Inside the protected dashboard you can edit:

- **Profile & copy:** display name, role, hero introduction and About text.
- **Projects:** the six live deployments shared by Mannan are pinned in the public portfolio; add/remove custom projects, descriptions, live URLs, source URLs, technology labels and explicit image/cover URLs.
- **Journey:** add milestones such as education, learning, jobs, launches, achievements or client work.
- **Backup:** export content as JSON and import it later.

Important storage limitation: portfolio edits are still saved in that browser's `localStorage`, not a central database. The login protects the admin route, but the content changes appear only in the same browser/device unless you export/import JSON. For changes made in the admin panel to publish for every visitor and across devices, connect a shared database and server-side content API (for example MongoDB or Supabase). The GitHub and portfolio pages remain public by design. The real `.env` file is not included in the redistributed source archive; use `.env.example` as a template and keep secrets in `.env.local` or hosting environment variables.

## Motion and hero sizing

The hero type is slightly smaller on desktop and mobile. The page keeps its staggered hero line reveal, typewriter/caret effect, animated welcome marker, portrait reveal/drift, softened orange streak, scroll-triggered reveals, featured-work entrance, project-card hover transitions, process artwork drift and marquee animation. Reduced-motion preferences are respected.
