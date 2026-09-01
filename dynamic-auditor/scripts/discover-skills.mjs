#!/usr/bin/env node
// discover-skills.mjs — find every SEO-relevant skill that could help this audit.
//
//   node discover-skills.mjs                 # local + the eight open-source sources
//   node discover-skills.mjs --no-remote     # local only (offline / fast path)
//   node discover-skills.mjs --json          # machine-readable, nothing else on stdout
//   node discover-skills.mjs --out plan.json # also write the plan to a file
//
// Local ranking is delegated to ~/.claude/skills/tulong/find-skill.mjs so there is
// exactly one ranker on this machine. If tulong is missing we fall back to a small
// built-in scan — the audit must never stall because a helper skill was uninstalled.
//
// Remote search hits the SAME eight sources /tulong uses and nothing else. That
// ceiling is the point: a bounded hunt finishes in under a minute, an unbounded one
// turns a 5-minute audit into a 30-minute one for the same handful of skills.

import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const HOME = homedir()
const SKILLS_DIR = join(HOME, '.claude', 'skills')
const TULONG = join(SKILLS_DIR, 'tulong', 'find-skill.mjs')
const args = process.argv.slice(2)
const JSON_ONLY = args.includes('--json')
const NO_REMOTE = args.includes('--no-remote')
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : null
// --topic widens the hunt with the user's own words. SEO is the default because it is
// what this auditor is built around, but an audit that turns out to be mostly about,
// say, accessibility should be able to pull in accessibility skills too.
const TOPIC = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : ''
const MAX_INSTALL = args.includes('--max-install') ? Number(args[args.indexOf('--max-install') + 1]) : 6
const UA = { 'User-Agent': 'dynamic-auditor/1.0', Accept: 'application/vnd.github+json' }

const say = (...m) => { if (!JSON_ONLY) console.error(...m) }

// The audit has pillars; each query below is aimed at one of them. Casting several
// narrow queries beats one broad "seo" query — a crawler skill and a Core Web Vitals
// skill share almost no vocabulary, and a single query would surface only one of them.
const QUERIES = [
  'seo audit technical seo crawl indexing robots sitemap',
  'core web vitals page speed lighthouse performance optimization',
  'structured data schema markup json-ld rich results',
  'keyword research content strategy topic clusters search intent',
  'analytics google search console tracking measurement conversion',
  'accessibility audit wcag semantic html',
  'competitor analysis serp comparison backlink',
  'ai search llm visibility answer engine optimization',
]
if (TOPIC) QUERIES.push(TOPIC)

const TOPIC_WORDS = TOPIC.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)
const TOPIC_RE = TOPIC_WORDS.length ? new RegExp(`\\b(${TOPIC_WORDS.join('|')})`, 'i') : null

// Anything a skill would have to mention to be worth loading for an SEO audit.
const SEO_RE = /\b(seo|serp|search[- ]engine|sitemap|robots\.txt|crawl|crawler|keyword|backlink|meta[- ]?tag|canonical|hreflang|structured[- ]data|schema\.org|json-?ld|rich[- ]result|core[- ]web[- ]vital|lighthouse|page[- ]?speed|web[- ]?vitals|e-?e-?a-?t|search[- ]console|gsc|answer[- ]engine|llm[- ]visibility|content[- ]strateg|programmatic[- ]seo|link[- ]building|on-?page|off-?page|ga4|google[- ]analytics|utm[- ]param|tag[- ]manager|accessib|wcag)/i

const relevant = (text = '') => SEO_RE.test(text) || (TOPIC_RE ? TOPIC_RE.test(text) : false)

// A remote candidate is judged on its NAME, not its description. Registries index whole
// repos, so a front-end checklist repo offers up "quality" and "reading-level" as skills
// because the repo README mentions SEO somewhere. The name is what survives that.
const STRONG_NAME_RE = /(seo|serp|sitemap|schema|structured-?data|json-?ld|crawl|keyword|backlink|meta-?(tag|title|desc)|canonical|hreflang|lighthouse|web-?vitals|page-?speed|search-?console|accessib|a11y|wcag)/i
const strongName = (name = '') => STRONG_NAME_RE.test(name) || (TOPIC_RE ? TOPIC_RE.test(name) : false)

// Trust numbers are not comparable across sources: skills.sh counts installs of THAT
// skill, skillsmp reports stars of the whole repo it was scraped from. Sorting them in
// one pile lets a 240k-star monorepo outrank a purpose-built SEO skill. Rank by source
// first, by the number second.
const SOURCE_RANK = { 'skills.sh': 0, anthropic: 1, onewave: 2, composio: 3, alireza: 4, skillsmp: 5, awesome: 6, awesomeclaude: 7 }

// ---------------------------------------------------------------------------
// Local
// ---------------------------------------------------------------------------

function rankWithTulong() {
  const merged = new Map()
  for (const q of QUERIES) {
    const r = spawnSync('node', [TULONG, '--json', q], { encoding: 'utf8', timeout: 30_000 })
    if (r.status !== 0 || !r.stdout) continue
    let data
    try { data = JSON.parse(r.stdout) } catch { continue }
    for (const m of data.matches || []) {
      const prev = merged.get(m.name)
      if (!prev || m.pts > prev.pts) merged.set(m.name, { ...m, matchedQuery: q })
      else prev.alsoMatched = (prev.alsoMatched || 0) + 1
    }
  }
  return [...merged.values()]
}

function rankWithFallback() {
  const out = []
  const roots = [
    [SKILLS_DIR, 'personal'],
    [join(process.cwd(), '.claude', 'skills'), 'workspace'],
  ]
  for (const [root, source] of roots) {
    if (!existsSync(root)) continue
    for (const name of readdirSync(root)) {
      const p = join(root, name, 'SKILL.md')
      if (!existsSync(p)) continue
      let text = ''
      try { text = readFileSync(p, 'utf8').slice(0, 4000) } catch { continue }
      const hits = (text.match(SEO_RE) || []).length + (TOPIC_RE ? (text.match(TOPIC_RE) || []).length : 0)
      if (!hits) continue
      const desc = (text.match(/^description:\s*([\s\S]*?)(?:\n[a-z_-]+:|\n---)/m) || [, ''])[1]
      out.push({ name, source, path: p, pts: hits * 4, description: desc.trim().slice(0, 400) })
    }
  }
  return out
}

function localSkills() {
  const raw = existsSync(TULONG) ? rankWithTulong() : rankWithFallback()
  // Both gates have to hold. The ranker's score alone lets in skills that merely share
  // words like "audit", "web" and "content" — a Mongo indexing skill can outscore a real
  // SEO one. The vocabulary test alone lets in skills that mention search once in
  // passing. Together they keep the loaded set to skills that are about this work.
  return raw
    .filter((m) => m.pts >= 10 && relevant(`${m.name} ${m.description || ''}`))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 12) // a bulk load of a dozen is plenty; past that they start crowding each other out
    .map((m) => ({
      name: m.name,
      source: m.source,
      path: m.path,
      score: Math.round(m.pts * 10) / 10,
      why: (m.description || '').replace(/\s+/g, ' ').slice(0, 180),
    }))
}

// ---------------------------------------------------------------------------
// Remote — the eight sources, and only the eight
// ---------------------------------------------------------------------------

const errors = []
const seenRemote = new Map()

async function get(url, { json = true, timeout = 20_000, headers = UA } = {}) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeout)
  try {
    const res = await fetch(url, { headers, signal: ac.signal, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return json ? await res.json() : await res.text()
  } finally { clearTimeout(t) }
}

function addCandidate(c) {
  if (!c.name || !strongName(c.name)) return
  const key = c.name.toLowerCase()
  if (existsSync(join(SKILLS_DIR, c.name))) return // already installed — nothing to do
  const prev = seenRemote.get(key)
  if (prev) { prev.alsoSeenIn = [...new Set([...(prev.alsoSeenIn || []), c.source])]; return }
  seenRemote.set(key, c)
}

async function ghDirs(repo, path = '', ref = 'main') {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`
  const list = await get(url)
  return Array.isArray(list) ? list.filter((i) => i.type === 'dir').map((i) => i.name) : []
}

// 1 · anthropics/skills — official, skills are under skills/
async function srcAnthropic() {
  const dirs = await ghDirs('anthropics/skills', 'skills')
  for (const name of dirs.filter((n) => relevant(n))) {
    addCandidate({ name, source: 'anthropic', repo: 'anthropics/skills', ref: 'main', path: `skills/${name}` })
  }
}

// 2 · ComposioHQ/awesome-claude-skills — branch is master, skills are top-level dirs
async function srcComposio() {
  const dirs = await ghDirs('ComposioHQ/awesome-claude-skills', '', 'master')
  for (const name of dirs.filter((n) => relevant(n))) {
    addCandidate({ name, source: 'composio', repo: 'ComposioHQ/awesome-claude-skills', ref: 'master', path: name })
  }
}

// 3 · alirezarezvani/claude-skills — <domain>/<plugin>/skills/<skill>/SKILL.md
async function srcAlireza() {
  const repo = 'alirezarezvani/claude-skills'
  const domains = (await ghDirs(repo)).filter((d) => !d.startsWith('.'))
  const shortlist = domains.filter((d) => /market|content|product|growth|audit|engineering|analytics/i.test(d)).slice(0, 5)
  for (const domain of shortlist) {
    let plugins = []
    try { plugins = await ghDirs(repo, domain) } catch { continue }
    for (const plugin of plugins.filter((p) => relevant(p)).slice(0, 4)) {
      let skills = []
      try { skills = await ghDirs(repo, `${domain}/${plugin}/skills`) } catch { continue }
      for (const name of skills) {
        addCandidate({ name, source: 'alireza', repo, ref: 'main', path: `${domain}/${plugin}/skills/${name}` })
      }
    }
  }
}

// 4 · skills.sh — the REST API is gated; the CLI is not, as long as stdin is not a TTY
function srcSkillsSh() {
  for (const q of ['seo audit', 'technical seo']) {
    const r = spawnSync('sh', ['-c', `echo "" | npx -y skills@latest find ${JSON.stringify(q)} 2>&1`], {
      encoding: 'utf8', timeout: 120_000,
    })
    if (!r.stdout) { errors.push(`skills.sh: no output for "${q}"`); continue }
    // The CLI paints its output; the colour codes end up inside the repo slug and turn
    // a valid owner/repo into a 404 at install time.
    const clean = r.stdout.replace(/\[[0-9;]*m/g, '')
    for (const line of clean.split('\n')) {
      const m = line.match(/([\w.-]+\/[\w.-]+)@([\w.-]+)/)
      if (!m) continue
      if (!relevant(m[2])) continue
      const installs = (line.match(/([\d,]+)\s*installs?/i) || [, ''])[1]
      addCandidate({ name: m[2], source: 'skills.sh', repo: m[1], ref: 'main', path: null, installs: installs ? Number(installs.replace(/,/g, '')) : 0, trust: installs ? `${installs} installs` : null })
    }
  }
}

// 5 · skillsmp.com — plain REST, anonymous cap is 50/day
async function srcSkillsmp() {
  for (const q of ['seo', 'technical seo audit', 'schema markup']) {
    let data
    try {
      data = await get(`https://skillsmp.com/api/v1/skills/search?q=${encodeURIComponent(q)}&limit=8&sortBy=stars`, { headers: { 'User-Agent': UA['User-Agent'] } })
    } catch (e) { errors.push(`skillsmp (${q}): ${e.message}`); continue }
    const hits = data?.data?.skills || data?.skills || data?.results || []
    for (const s of hits) {
      // The index carries translated forks of the same skill. A Japanese SKILL.md is
      // still a fine skill, but it will not be read well alongside the rest.
      if (s.contentLanguage && s.contentLanguage !== 'en') continue
      if (!relevant(`${s.name} ${s.description || ''}`)) continue
      const tree = (s.githubUrl || '').match(/github\.com\/([\w.-]+\/[\w.-]+)\/tree\/([\w.-]+)\/(.+)/)
      addCandidate({
        name: s.name, source: 'skillsmp',
        repo: tree ? tree[1] : null, ref: tree ? tree[2] : 'main', path: tree ? tree[3] : null,
        installs: Number(s.stars) || 0,
        trust: s.stars != null ? `${s.stars}★` : null,
        why: (s.description || '').slice(0, 180),
      })
    }
  }
}

// 6 & 7 · awesome lists on GitHub, and awesomeclaude.ai (the site is a front-end for
// BehiSecc's README, so the README is the cheaper, cleaner read)
const README_LISTS = [
  ['awesome', 'https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/README.md'],
  ['awesomeclaude', 'https://raw.githubusercontent.com/BehiSecc/awesome-claude-skills/main/README.md'],
]
async function srcReadmes() {
  for (const [source, url] of README_LISTS) {
    let text
    try { text = await get(url, { json: false, headers: { 'User-Agent': UA['User-Agent'] } }) } catch (e) { errors.push(`${source}: ${e.message}`); continue }
    for (const line of text.split('\n')) {
      if (!relevant(line)) continue
      const m = line.match(/\[([^\]]+)\]\(https:\/\/github\.com\/([\w.-]+\/[\w.-]+)(?:\/tree\/([\w.-]+)\/(\S+?))?\)/)
      if (!m) continue
      const name = m[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      if (!relevant(name)) continue
      addCandidate({ name, source, repo: m[2], ref: m[3] || 'main', path: m[4] || null, why: line.replace(/\s+/g, ' ').slice(0, 180) })
    }
  }
}

// 8 · onewave-ai — one MIT monorepo, one top-level dir per skill
async function srcOnewave() {
  const dirs = await ghDirs('OneWave-AI/claude-skills')
  for (const name of dirs.filter((n) => relevant(n))) {
    addCandidate({ name, source: 'onewave', repo: 'OneWave-AI/claude-skills', ref: 'main', path: name })
  }
}

async function remoteSkills() {
  const tasks = [
    ['anthropic', srcAnthropic], ['composio', srcComposio], ['alireza', srcAlireza],
    ['skillsmp', srcSkillsmp], ['awesome lists', srcReadmes], ['onewave', srcOnewave],
  ]
  await Promise.all(tasks.map(async ([label, fn]) => {
    try { await fn() } catch (e) { errors.push(`${label}: ${e.message}`) }
  }))
  // skills.sh is a synchronous npx spawn — run it last so it never blocks the fetches.
  try { srcSkillsSh() } catch (e) { errors.push(`skills.sh: ${e.message}`) }
  // A query for "seo audit" surfaces twenty near-identical skills. Installing all of
  // them costs time and crowds the context for no extra coverage, so take the ones the
  // community actually uses — install count is the honest trust signal here — and stop.
  return [...seenRemote.values()]
    .sort((a, b) => ((SOURCE_RANK[a.source] ?? 9) - (SOURCE_RANK[b.source] ?? 9)) || ((b.installs || 0) - (a.installs || 0)))
    .slice(0, MAX_INSTALL)
}

// ---------------------------------------------------------------------------

const local = localSkills()
say(`local: ${local.length} SEO-relevant skill(s) already on this machine`)

let remote = []
if (!NO_REMOTE) {
  say('searching the eight open-source sources…')
  remote = await remoteSkills()
  say(`remote: ${remote.length} candidate(s) not yet installed`)
}

const plan = { generatedFor: 'dynamic-auditor', local, remote, errors }
if (OUT) writeFileSync(OUT, JSON.stringify(plan, null, 2))

if (JSON_ONLY) {
  console.log(JSON.stringify(plan, null, 2))
} else {
  console.log('\nLOAD (already installed):')
  for (const s of local) console.log(`  ${s.name.padEnd(34)} ${String(s.score).padStart(6)}  ${s.source}`)
  console.log('\nINSTALL CANDIDATES (pending safety audit):')
  if (!remote.length) console.log('  none — nothing new in the eight sources')
  for (const c of remote) console.log(`  ${c.name.padEnd(34)} ${c.source}${c.trust ? ` · ${c.trust}` : ''}  ${c.repo || ''}`)
  if (errors.length) { console.log('\nSOURCES THAT FAILED (audit continues without them):'); for (const e of errors) console.log(`  ${e}`) }
}
