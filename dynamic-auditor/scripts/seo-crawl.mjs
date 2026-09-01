#!/usr/bin/env node
// seo-crawl.mjs — collect the evidence an SEO audit runs on, so the audit argues from
// measurements instead of impressions.
//
//   node seo-crawl.mjs https://example.com --out ./evidence
//   node seo-crawl.mjs https://example.com --out ./evidence --max 80 --depth 4
//   node seo-crawl.mjs https://example.com --out ./evidence --ignore-robots
//
// Writes site.json, pages.json and findings.json into --out, and prints a short summary.
// findings.json is the one to read first: a flat, deduplicated list of issues, each with
// a severity, the pillar it belongs to, and the exact URLs that prove it.
//
// Everything here is a fact about the response, never a judgement. "17 pages share one
// title" belongs in this file; "your content strategy is thin" does not — that is the
// audit's job, and it should be reading these numbers when it says it.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const arg = (k, d = null) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d)
const START = argv.find((a) => /^https?:\/\//i.test(a))
if (!START) { console.error('usage: seo-crawl.mjs <url> --out <dir> [--max N] [--depth N] [--ignore-robots]'); process.exit(1) }

const OUT = arg('--out', './seo-evidence')
const MAX = Number(arg('--max', 40))
const MAX_DEPTH = Number(arg('--depth', 3))
const CONCURRENCY = Number(arg('--concurrency', 4))
const IGNORE_ROBOTS = argv.includes('--ignore-robots')
const UA = arg('--ua', 'Mozilla/5.0 (compatible; dynamic-auditor/1.0; +seo-audit)')
const TIMEOUT = Number(arg('--timeout', 20_000))

// The host you were given is not always the host the site lives on — plenty of sites
// send www to apex or the reverse. Everything downstream keys off SCOPE rather than the
// start URL, because getting this wrong makes every internal link look external and the
// crawl stops dead at one page.
let origin = new URL(START).origin
let host = new URL(START).host
const SCOPE = new Set([host])
const inScope = (h) => SCOPE.has(h)

// ---------------------------------------------------------------------------
// fetching
// ---------------------------------------------------------------------------

async function raw(url, method = 'GET') {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT)
  const started = Date.now()
  try {
    const res = await fetch(url, { method, headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, redirect: 'manual', signal: ac.signal })
    return { res, ms: Date.now() - started }
  } finally { clearTimeout(t) }
}

// Redirects are followed by hand so the chain itself becomes evidence. A 302 that lands
// on the right page still costs crawl budget and dilutes link signals, and you cannot
// report that if the fetch layer quietly resolved it for you.
async function fetchWithChain(url, maxHops = 5) {
  const chain = []
  let current = url
  let ttfb = 0
  for (let hop = 0; hop <= maxHops; hop++) {
    let out
    try { out = await raw(current) } catch (e) { return { error: e.name === 'AbortError' ? 'timeout' : e.message, chain, finalUrl: current } }
    const { res, ms } = out
    if (hop === 0) ttfb = ms
    const loc = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && loc) {
      chain.push({ url: current, status: res.status, to: new URL(loc, current).href })
      current = new URL(loc, current).href
      continue
    }
    const ct = res.headers.get('content-type') || ''
    const body = ct.includes('html') || ct.includes('xml') || ct.includes('text') ? await res.text() : ''
    return {
      finalUrl: current, status: res.status, chain, ttfb, body,
      bytes: body ? Buffer.byteLength(body) : Number(res.headers.get('content-length') || 0),
      headers: Object.fromEntries(res.headers),
    }
  }
  return { error: 'too many redirects', chain, finalUrl: current }
}

// ---------------------------------------------------------------------------
// html parsing — regex is enough for head metadata and link/image inventories
// ---------------------------------------------------------------------------

const attrs = (tag) => {
  const o = {}
  for (const m of tag.matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    o[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? ''
  }
  return o
}
const decode = (s = '') => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
const textOf = (s = '') => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

function parsePage(url, html) {
  const p = { url }
  p.title = textOf((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1])
  p.titleLength = p.title.length
  p.lang = (html.match(/<html[^>]*\blang\s*=\s*["']([^"']+)/i) || [, ''])[1] || null

  p.metaDescription = null; p.metaRobots = null; p.viewport = null
  p.og = {}; p.twitter = {}
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0])
    const key = (a.name || a.property || a['http-equiv'] || '').toLowerCase()
    const val = decode(a.content || '')
    if (key === 'description') p.metaDescription = val
    else if (key === 'robots') p.metaRobots = val.toLowerCase()
    else if (key === 'viewport') p.viewport = val
    else if (key.startsWith('og:')) p.og[key] = val
    else if (key.startsWith('twitter:')) p.twitter[key] = val
  }
  p.metaDescriptionLength = p.metaDescription ? p.metaDescription.length : 0

  p.canonical = null; p.hreflang = []
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0])
    const rel = (a.rel || '').toLowerCase()
    if (rel === 'canonical' && a.href) p.canonical = new URL(a.href, url).href
    if (rel.includes('alternate') && a.hreflang) p.hreflang.push({ lang: a.hreflang, href: a.href ? new URL(a.href, url).href : null })
  }

  p.headings = { h1: [], h2: [], h3: [] }
  for (const m of html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const t = textOf(m[2])
    if (t) p.headings[`h${m[1]}`].push(t.slice(0, 160))
  }

  // Word count over the body with script/style/nav chrome removed. It is a rough number
  // and treated as one — the point is spotting a 40-word page, not grading prose.
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|header|footer|noscript)[\s\S]*?<\/\1>/gi, ' ')
  p.wordCount = textOf(body).split(/\s+/).filter(Boolean).length

  p.images = { total: 0, missingAlt: 0, emptyAlt: 0, missingDimensions: 0, lazy: 0 }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(m[0])
    p.images.total++
    if (a.alt === undefined) p.images.missingAlt++
    else if (a.alt.trim() === '') p.images.emptyAlt++
    if (a.width === undefined || a.height === undefined) p.images.missingDimensions++
    if ((a.loading || '').toLowerCase() === 'lazy') p.images.lazy++
  }

  p.links = { internal: [], external: 0, nofollow: 0, emptyAnchor: 0 }
  for (const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const a = attrs(m[0])
    if (!a.href || /^(#|mailto:|tel:|javascript:)/i.test(a.href)) continue
    let abs
    try { abs = new URL(a.href, url) } catch { continue }
    if ((a.rel || '').toLowerCase().includes('nofollow')) p.links.nofollow++
    if (!textOf(m[1]) && !/<img/i.test(m[1])) p.links.emptyAnchor++
    if (inScope(abs.host)) { abs.hash = ''; p.links.internal.push(abs.href) }
    else p.links.external++
  }
  p.links.internal = [...new Set(p.links.internal)]

  p.jsonLd = []
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim())
      const collect = (n) => {
        if (Array.isArray(n)) return n.forEach(collect)
        if (n && typeof n === 'object') {
          if (n['@type']) p.jsonLd.push(Array.isArray(n['@type']) ? n['@type'].join('/') : String(n['@type']))
          if (n['@graph']) collect(n['@graph'])
        }
      }
      collect(data)
    } catch { p.jsonLd.push('INVALID_JSON') }
  }
  return p
}

// ---------------------------------------------------------------------------
// site-level checks
// ---------------------------------------------------------------------------

async function siteChecks() {
  // Resolve the real home first. Every check below is aimed at the host the site
  // actually answers on, not the one that was typed into the prompt.
  const home = await fetchWithChain(START)
  const landed = new URL(home.finalUrl || START)
  const startRedirected = landed.origin !== origin
  origin = landed.origin
  host = landed.host
  SCOPE.add(host)

  const site = { origin, host, startUrl: START, startRedirected, startRedirectChain: home.chain || [], checkedAt: new Date().toISOString() }
  site.homepage = { status: home.status ?? home.error, ttfbMs: home.ttfb ?? null, bytes: home.bytes ?? 0 }
  site.headers = {}
  for (const k of ['strict-transport-security', 'content-encoding', 'cache-control', 'x-robots-tag', 'content-security-policy', 'server', 'vary']) {
    if (home.headers && home.headers[k]) site.headers[k] = home.headers[k]
  }

  const robots = await fetchWithChain(`${origin}/robots.txt`)
  site.robots = { status: robots.status ?? null, found: robots.status === 200, sitemaps: [], disallowAll: false }
  if (robots.status === 200 && robots.body) {
    site.robots.body = robots.body.slice(0, 4000)
    for (const line of robots.body.split('\n')) {
      const sm = line.match(/^\s*sitemap:\s*(\S+)/i)
      if (sm) site.robots.sitemaps.push(sm[1].trim())
    }
    site.robots.disallowAll = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/im.test(robots.body)
    site.robots.rules = parseRobots(robots.body)
  }

  const sitemapUrls = site.robots.sitemaps.length ? site.robots.sitemaps : [`${origin}/sitemap.xml`]
  site.sitemaps = []
  const discovered = new Set()
  for (const sm of sitemapUrls.slice(0, 5)) {
    const r = await fetchWithChain(sm)
    const entry = { url: sm, status: r.status ?? null, urlCount: 0, isIndex: false }
    if (r.status === 200 && r.body) {
      entry.isIndex = /<sitemapindex/i.test(r.body)
      const locs = [...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decode(m[1]))
      if (entry.isIndex) {
        for (const child of locs.slice(0, 5)) {
          const cr = await fetchWithChain(child)
          if (cr.status === 200 && cr.body) {
            for (const m of cr.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) discovered.add(decode(m[1]))
          }
        }
        entry.childSitemaps = locs.length
      } else {
        for (const l of locs) discovered.add(l)
      }
      entry.urlCount = entry.isIndex ? locs.length : locs.length
    }
    site.sitemaps.push(entry)
  }
  site.sitemapUrls = [...discovered].filter((u) => { try { return inScope(new URL(u).host) } catch { return false } })

  // HTTP must land on HTTPS, and one host must win. Both are single fetches and both are
  // the kind of thing that silently halves a site's indexed pages when they are wrong.
  if (origin.startsWith('https://')) {
    const http = await fetchWithChain(origin.replace(/^https:/, 'http:'), 3)
    site.httpsRedirect = { chain: http.chain, endsHttps: (http.finalUrl || '').startsWith('https://') }
  }
  // The alternate is the OTHER form of the host the site settled on. Comparing against
  // the typed-in host instead would flag a correctly-redirecting www as duplication.
  const altHost = host.startsWith('www.') ? host.slice(4) : `www.${host}`
  const alt = await fetchWithChain(`https://${altHost}/`, 3)
  let altLandedHost = null
  try { altLandedHost = new URL(alt.finalUrl).host } catch { /* unreachable alternate */ }
  site.hostCanonicalization = { primaryHost: host, altHost, status: alt.status ?? alt.error, finalUrl: alt.finalUrl, redirectsToPrimary: altLandedHost === host }

  const notFound = await fetchWithChain(`${origin}/dynamic-auditor-404-probe-${Date.now()}`, 3)
  site.softFourOhFour = { status: notFound.status ?? null, correct: notFound.status === 404 }

  return { site, homeUrl: landed.href }
}

function parseRobots(body) {
  const rules = []
  let agents = []
  for (const rawLine of body.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const ua = line.match(/^user-agent:\s*(.+)$/i)
    if (ua) { agents = [ua[1].trim().toLowerCase()]; continue }
    const dis = line.match(/^disallow:\s*(.*)$/i)
    if (dis && agents.includes('*') && dis[1].trim()) rules.push(dis[1].trim())
  }
  return rules
}

const blockedByRobots = (rules, url) => {
  if (IGNORE_ROBOTS || !rules?.length) return false
  const path = new URL(url).pathname
  return rules.some((r) => path.startsWith(r.replace(/\*$/, '')))
}

// ---------------------------------------------------------------------------
// crawl
// ---------------------------------------------------------------------------

async function crawl(seeds, rules) {
  const queued = new Map()
  const pages = []
  for (const [url, depth] of seeds) if (!queued.has(url)) queued.set(url, depth)
  const pending = [...queued.entries()]
  const seen = new Set()

  async function worker() {
    while (pending.length && pages.length < MAX) {
      const [url, depth] = pending.shift()
      if (seen.has(url)) continue
      seen.add(url)
      if (blockedByRobots(rules, url)) { pages.push({ url, depth, skipped: 'robots-disallow' }); continue }
      const r = await fetchWithChain(url)
      if (r.error) { pages.push({ url, depth, error: r.error }); continue }
      const base = { depth, status: r.status, redirectChain: r.chain, finalUrl: r.finalUrl, ttfbMs: r.ttfb, bytes: r.bytes, xRobotsTag: r.headers?.['x-robots-tag'] || null }
      if (r.status >= 400 || !r.body || !/<html/i.test(r.body)) { pages.push({ url, ...base }); continue }
      const parsed = parsePage(r.finalUrl, r.body)
      pages.push({ url, ...base, ...parsed })
      if (depth < MAX_DEPTH) {
        for (const link of parsed.links.internal) {
          if (!seen.has(link) && !queued.has(link) && pages.length + pending.length < MAX * 3) {
            queued.set(link, depth + 1); pending.push([link, depth + 1])
          }
        }
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return pages
}

// ---------------------------------------------------------------------------
// findings — facts with a severity, each carrying the URLs that prove it
// ---------------------------------------------------------------------------

const findings = []
// Every finding is evidence-backed: no URLs means nothing was observed, so there is
// nothing to report. A finding with a note but no URLs would read as a real problem.
const add = (severity, pillar, id, title, urls, detail = '') => {
  if (!urls || !urls.length) return
  findings.push({ id, severity, pillar, title, detail, count: urls.length, urls: urls.slice(0, 25) })
}

function analyze(site, pages) {
  const html = pages.filter((p) => p.title !== undefined && p.status === 200)
  const indexable = html.filter((p) => !/noindex/.test(p.metaRobots || '') && !/noindex/.test(p.xRobotsTag || ''))

  // Crawlability & indexation
  if (site.startRedirected) {
    add('low', 'crawlability', 'start-redirects', `The audited URL redirects to ${site.origin}`, [site.startUrl],
      'not a fault on its own — noted so every finding below is read as being about the host that actually serves the site')
  }
  if (!site.robots.found) add('medium', 'crawlability', 'no-robots', 'No robots.txt', [`${site.origin}/robots.txt`], `returned ${site.robots.status}`)
  if (site.robots.disallowAll) add('critical', 'crawlability', 'robots-blocks-all', 'robots.txt disallows the whole site for all crawlers', [`${site.origin}/robots.txt`])
  if (!site.sitemaps.some((s) => s.status === 200)) add('high', 'crawlability', 'no-sitemap', 'No reachable XML sitemap', site.sitemaps.map((s) => s.url))
  if (site.httpsRedirect && !site.httpsRedirect.endsHttps) add('critical', 'security', 'no-https-redirect', 'HTTP does not redirect to HTTPS', [site.origin])
  if (!site.hostCanonicalization.redirectsToPrimary && site.hostCanonicalization.status === 200) {
    add('high', 'crawlability', 'host-duplication', `Both ${site.host} and ${site.hostCanonicalization.altHost} serve 200 — the same pages exist on two hosts`, [`https://${site.hostCanonicalization.altHost}/`])
  }
  if (!site.softFourOhFour.correct) add('medium', 'crawlability', 'soft-404', `A missing URL returns ${site.softFourOhFour.status} instead of 404`, [site.origin])
  if (!site.headers['strict-transport-security']) add('low', 'security', 'no-hsts', 'No Strict-Transport-Security header', [site.origin])
  if (!site.headers['content-encoding']) add('medium', 'performance', 'no-compression', 'Homepage response is not compressed (no content-encoding)', [site.origin])

  const noindexed = html.filter((p) => /noindex/.test(p.metaRobots || '') || /noindex/.test(p.xRobotsTag || ''))
  add('high', 'indexation', 'noindex', 'Pages set to noindex', noindexed.map((p) => p.url), 'confirm each of these is meant to stay out of the index')

  const errors = pages.filter((p) => p.status >= 400)
  add('critical', 'crawlability', 'broken-pages', 'Internally linked URLs returning 4xx/5xx', errors.map((p) => `${p.url} → ${p.status}`))

  const redirected = pages.filter((p) => p.redirectChain?.length)
  add(redirected.some((p) => p.redirectChain.length > 1) ? 'medium' : 'low', 'crawlability', 'internal-redirects',
    'Internal links point at URLs that redirect', redirected.map((p) => `${p.url} → ${p.finalUrl} (${p.redirectChain.length} hop${p.redirectChain.length > 1 ? 's' : ''})`))

  const timeouts = pages.filter((p) => p.error)
  add('high', 'performance', 'unreachable', 'URLs that failed to respond', timeouts.map((p) => `${p.url} — ${p.error}`))

  // On-page
  add('high', 'on-page', 'missing-title', 'Pages with no <title>', html.filter((p) => !p.title).map((p) => p.url))
  add('medium', 'on-page', 'title-length', 'Titles outside the ~30–60 character range that renders fully in results',
    html.filter((p) => p.title && (p.titleLength < 30 || p.titleLength > 60)).map((p) => `${p.url} (${p.titleLength})`))
  add('high', 'on-page', 'missing-meta-description', 'Pages with no meta description', html.filter((p) => !p.metaDescription).map((p) => p.url))
  add('low', 'on-page', 'meta-description-length', 'Meta descriptions outside ~70–160 characters',
    html.filter((p) => p.metaDescription && (p.metaDescriptionLength < 70 || p.metaDescriptionLength > 160)).map((p) => `${p.url} (${p.metaDescriptionLength})`))

  for (const [field, label, sev] of [['title', 'title', 'high'], ['metaDescription', 'meta description', 'medium']]) {
    const groups = new Map()
    for (const p of indexable) {
      const v = (p[field] || '').trim()
      if (!v) continue
      groups.set(v, [...(groups.get(v) || []), p.url])
    }
    const dupes = [...groups.entries()].filter(([, urls]) => urls.length > 1)
    add(sev, 'on-page', `duplicate-${field}`, `Indexable pages sharing an identical ${label}`,
      dupes.map(([v, urls]) => `"${v.slice(0, 60)}" × ${urls.length}: ${urls.slice(0, 3).join(', ')}`))
  }

  add('medium', 'on-page', 'h1-missing', 'Pages with no H1', html.filter((p) => !p.headings?.h1?.length).map((p) => p.url))
  add('low', 'on-page', 'h1-multiple', 'Pages with more than one H1', html.filter((p) => p.headings?.h1?.length > 1).map((p) => `${p.url} (${p.headings.h1.length})`))

  // Canonicals
  add('medium', 'indexation', 'no-canonical', 'Pages with no canonical link', html.filter((p) => !p.canonical).map((p) => p.url))
  add('high', 'indexation', 'cross-canonical', 'Pages whose canonical points at a different URL',
    html.filter((p) => p.canonical && p.canonical.replace(/\/$/, '') !== p.finalUrl.replace(/\/$/, '')).map((p) => `${p.url} → ${p.canonical}`),
    'legitimate for true duplicates; a mistake when it silently de-indexes a real page')

  // Content
  add('high', 'content', 'thin-content', 'Pages under 300 words', indexable.filter((p) => p.wordCount < 300).map((p) => `${p.url} (${p.wordCount}w)`))

  // Images & accessibility
  const noAlt = html.filter((p) => p.images?.missingAlt > 0)
  add('medium', 'accessibility', 'img-missing-alt', 'Pages with images missing an alt attribute',
    noAlt.map((p) => `${p.url} (${p.images.missingAlt}/${p.images.total})`))
  add('low', 'performance', 'img-no-dimensions', 'Pages with images lacking width/height (layout shift risk)',
    html.filter((p) => p.images?.missingDimensions > 0).map((p) => `${p.url} (${p.images.missingDimensions})`))

  // Structured data
  add('medium', 'structured-data', 'no-json-ld', 'Pages with no JSON-LD structured data', html.filter((p) => !p.jsonLd?.length).map((p) => p.url))
  add('high', 'structured-data', 'invalid-json-ld', 'Pages with unparseable JSON-LD', html.filter((p) => p.jsonLd?.includes('INVALID_JSON')).map((p) => p.url))

  // Mobile & i18n
  add('high', 'mobile', 'no-viewport', 'Pages with no viewport meta tag', html.filter((p) => !p.viewport).map((p) => p.url))
  add('low', 'international', 'no-lang', 'Pages with no lang attribute on <html>', html.filter((p) => !p.lang).map((p) => p.url))

  // Architecture
  const crawledSet = new Set(pages.map((p) => p.finalUrl || p.url))
  const linkedTo = new Set(html.flatMap((p) => p.links?.internal || []))
  const orphans = site.sitemapUrls.filter((u) => crawledSet.has(u) && !linkedTo.has(u) && u.replace(/\/$/, '') !== site.origin)
  add('medium', 'architecture', 'orphan-pages', 'Sitemap URLs that no crawled page links to', orphans)
  add('low', 'architecture', 'deep-pages', `Pages more than ${MAX_DEPTH - 1} clicks from the start URL`,
    html.filter((p) => p.depth >= MAX_DEPTH).map((p) => `${p.url} (depth ${p.depth})`))

  const slow = pages.filter((p) => p.ttfbMs > 800)
  add('medium', 'performance', 'slow-ttfb', 'Pages with time-to-first-byte over 800ms', slow.map((p) => `${p.url} (${p.ttfbMs}ms)`))
  const heavy = html.filter((p) => p.bytes > 500_000)
  add('low', 'performance', 'heavy-html', 'HTML documents over 500KB before assets', heavy.map((p) => `${p.url} (${Math.round(p.bytes / 1024)}KB)`))

  // Social — not a ranking factor, but it is what a shared link looks like
  add('low', 'on-page', 'no-og', 'Pages with no Open Graph title', html.filter((p) => !p['og']?.['og:title']).map((p) => p.url))

  return findings
}

// ---------------------------------------------------------------------------

mkdirSync(OUT, { recursive: true })
console.error(`crawling ${START} (max ${MAX} pages, depth ${MAX_DEPTH})…`)

const { site, homeUrl } = await siteChecks()
const seeds = [[homeUrl, 0], ...site.sitemapUrls.slice(0, MAX).map((u) => [u, 1])]
const pages = await crawl(seeds, site.robots.rules)
const issues = analyze(site, pages)

writeFileSync(join(OUT, 'site.json'), JSON.stringify(site, null, 2))
writeFileSync(join(OUT, 'pages.json'), JSON.stringify(pages, null, 2))
writeFileSync(join(OUT, 'findings.json'), JSON.stringify({ start: START, crawled: pages.length, findings: issues }, null, 2))

const bySeverity = issues.reduce((a, f) => ({ ...a, [f.severity]: (a[f.severity] || 0) + 1 }), {})
console.log(JSON.stringify({
  start: START,
  crawled: pages.length,
  sitemapUrls: site.sitemapUrls.length,
  robots: site.robots.found,
  bySeverity,
  out: OUT,
  topFindings: issues
    .sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.severity) - ['critical', 'high', 'medium', 'low'].indexOf(b.severity))
    .slice(0, 12)
    .map((f) => `[${f.severity}] ${f.title} (${f.count})`),
}, null, 2))
