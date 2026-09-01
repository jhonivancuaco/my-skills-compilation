# Collecting the evidence

Everything in the report has to trace back to something on this page. Sections:

1. [The crawl](#1-the-crawl)
2. [Rendered DOM and real performance](#2-rendered-dom-and-real-performance)
3. [The codebase](#3-the-codebase)
4. [What only the user has](#4-what-only-the-user-has)
5. [Reading findings.json](#5-reading-findingsjson)

---

## 1. The crawl

```bash
node ~/.claude/skills/dynamic-auditor/scripts/seo-crawl.mjs https://example.com \
  --out audit/example.com/2026-08-27/evidence \
  --max 50 --depth 3
```

| Flag | Default | When to change it |
|---|---|---|
| `--max` | 40 | A site with thousands of pages needs 100–200 to be representative. Past that the return drops sharply — templates repeat. |
| `--depth` | 3 | Raise to 4–5 when the site is a deep catalogue or docs tree. |
| `--concurrency` | 4 | Lower to 1–2 on a small shared host so the audit does not look like an attack. |
| `--ignore-robots` | off | Only when the user owns the site and wants disallowed sections checked too. |
| `--timeout` | 20000 | Raise for a slow origin, so timeouts are not reported as unreachable pages. |

Three files land in `--out`:

- **`site.json`** — origin-level facts: whether the start URL redirected and where it
  landed, robots.txt and its rules, every sitemap and its URL count, the HTTP→HTTPS
  result, the www/apex result, the 404 probe, and the homepage's response headers.
- **`pages.json`** — one record per crawled URL: status, redirect chain, TTFB, bytes,
  title, meta description, canonical, robots directives, headings, word count, image
  and link inventories, JSON-LD types, hreflang, viewport, lang.
- **`findings.json`** — the analysed list. Start here.

### What the crawl cannot tell you

It reads the HTML the server sends. It does not run JavaScript, so a title or canonical
injected client-side reads as missing. It does not measure Core Web Vitals — TTFB and
document size are proxies, not the metric. It sees no rankings and no traffic. Confirm
anything JS-dependent in the browser before reporting it (section 2), and label anything
you could not measure as unmeasured.

---

## 2. Rendered DOM and real performance

Use the Chrome DevTools tools on the homepage plus two or three representative
templates — a listing page, a detail page, and whatever drives the site's money. Three
templates usually cover a whole site; twenty pages of the same template do not tell you
anything the first one didn't.

**Does it render what the crawl missed?** Navigate, then take a snapshot or evaluate a
short script for `document.title`, the canonical `href`, the H1, and whether the main
content exists in the DOM. When the crawl said "no title" and the browser shows one, the
finding is not "missing title" — it is "title is client-rendered", which is a different
problem with a different fix and a much smaller blast radius.

**Real Core Web Vitals.** Run a Lighthouse audit for LCP, CLS, INP and TBT. Report the
numbers with the URL you measured and note that it is a lab measurement — field data
lives in Search Console, and the two often disagree.

**Console and network.** Console errors on a template break tracking and sometimes
rendering. In the network list, look for render-blocking resources, uncompressed
responses, and third-party scripts that cost more than the page they are on.

**Mobile.** Emulate a phone viewport on the same templates. Tap targets, horizontal
overflow and a hidden main nav are real findings, and none of them show up in the HTML.

---

## 3. The codebase

The crawl tells you what is wrong; the code tells you where to fix it. One layout file
usually explains a hundred bad pages, and that is the difference between a 200-item
checklist and a 6-item work order.

First, identify the framework — `package.json` dependencies, then the config file:

| Framework | Where head metadata lives | Where routes/sitemaps come from |
|---|---|---|
| Next.js (app router) | `metadata` / `generateMetadata` exports in `layout.tsx`, `page.tsx` | `app/**/page.tsx`, `app/sitemap.ts`, `app/robots.ts` |
| Next.js (pages router) | `<Head>` from `next/head`, `_document.tsx`, `_app.tsx` | `pages/**`, `public/sitemap.xml` or a generator |
| Astro | frontmatter + a `<BaseHead>`-style component in `src/layouts/` | `src/pages/**`, `@astrojs/sitemap` in `astro.config.*` |
| Nuxt | `useHead` / `definePageMeta`, `app.vue` | `pages/**`, `@nuxtjs/sitemap` |
| SvelteKit | `<svelte:head>` in `+page.svelte`, `+layout.svelte` | `src/routes/**` |
| WordPress / PHP | theme `header.php`, an SEO plugin's settings | permalinks, plugin-generated sitemap |
| Plain HTML | `<head>` in each file | hand-written `sitemap.xml` |

Then the checks worth running, in rough order of what they catch:

```bash
# One title for the whole site — the single most common template-level bug
grep -rn "<title>\|generateMetadata\|useHead\|<svelte:head>\|next/head" src app pages 2>/dev/null | head -40

# Canonicals: absent, or hardcoded to one URL (which de-indexes everything else)
grep -rn "canonical" src app pages components layouts 2>/dev/null

# Accidental noindex left over from staging — check for it in the repo AND in env files
grep -rn "noindex\|nofollow\|NEXT_PUBLIC_NOINDEX\|robots.*none" src app pages public .env* 2>/dev/null

# robots.txt and sitemap: present at all, and generated or stale?
ls -la public/robots.txt public/sitemap*.xml static/robots.txt 2>/dev/null
grep -rn "sitemap" next.config.* astro.config.* nuxt.config.* package.json 2>/dev/null

# Images: raw <img> in a framework that ships an optimised component
grep -rn "<img " src app pages components 2>/dev/null | grep -v "next/image\|astro:assets" | head -30

# Structured data
grep -rn "application/ld+json\|schema.org" src app pages components 2>/dev/null

# Headings: h1 used for styling rather than structure
grep -rn "<h1" src app pages components 2>/dev/null | head -30

# Client-side routing that swallows real URLs
grep -rn "history.pushState\|router.push" src app pages 2>/dev/null | head -20
```

Two things are worth more than any single grep:

**Read the base layout end to end.** Whatever the framework, there is one file every
page passes through. Its `<head>` is where site-wide SEO is either handled or absent,
and reading it once answers a dozen questions the greps only hint at.

**Check the rendering strategy per route.** A page that is client-side rendered with no
SSR or prerender is a page search engines see empty. In Next.js that is the absence of
`generateStaticParams` or a `'use client'` page with no server shell; in Astro it is
`export const prerender = false` without an SSR adapter configured for it.

---

## 4. What only the user has

Ask once, early, while the crawl runs — not at the end, when the report is already
written and the answer would change it.

- **Search Console** — the ground truth for impressions, queries, coverage errors and
  field Core Web Vitals. An export of the Performance and Pages reports is worth more
  than anything the crawl found.
- **Analytics** — landing-page traffic, so findings can be sorted by pages that actually
  earn something.
- **A backlink export** — Ahrefs, Semrush, Moz. There is no way to measure authority from
  the outside.
- **What they think their keywords are**, and who they think their competitors are. Often
  the most useful answer of the four, because it exposes a mismatch between what the site
  is optimised for and what it sells.

If none of it exists, the audit still runs. Say in the report which sections are
inference: technical and on-page findings are measured, anything about rankings,
authority or traffic is not.

---

## 5. Reading findings.json

```json
{
  "id": "duplicate-title",
  "severity": "high",
  "pillar": "on-page",
  "title": "Indexable pages sharing an identical title",
  "detail": "",
  "count": 3,
  "urls": ["\"Home | Acme\" × 12: https://…, https://…"]
}
```

`urls` is capped at 25 entries per finding — the count is the real number. When a finding
matters, open `pages.json` and pull the full list rather than reporting the capped one.

The severities the script assigns are a floor, not a verdict. It cannot know that the
noindex it found sits on the site's main money page, or that the thin pages are
deliberate redirect stubs. Read the URLs, then re-rate. Two adjustments come up
constantly:

- **Raise** anything on a template that covers many pages, and anything on a page the
  business actually depends on.
- **Lower or drop** findings that are correct by design — noindex on a thank-you page,
  thin content on a login screen, a canonical pointing elsewhere on a genuine duplicate.
  A report that flags intentional choices as errors loses the reader's trust for the
  findings that are real.
