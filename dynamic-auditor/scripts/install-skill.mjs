#!/usr/bin/env node
// install-skill.mjs — stage a remote skill, scan it for harmful code, install only if clean.
//
//   node install-skill.mjs --plan plan.json          # every remote candidate in the plan
//   node install-skill.mjs --plan plan.json --dry    # stage + scan, install nothing
//   node install-skill.mjs --repo owner/repo --name seo-crawler [--ref main] [--path skills/seo-crawler]
//
// The scan is not optional and there is no fallback scanner: if
// ~/.claude/skills/tulong/audit-skill.mjs is not on this machine, nothing is installed
// and that is reported. Auto-install is only safe because something reads the code
// first — an unchecked auto-install is just remote code execution with extra steps.
//
// Tiers, from audit-skill.mjs: exit 2 = BLOCK (never install unasked), 1 = REVIEW
// (install, but say what was found so a human can look), 0 = clean.

import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, rmSync, cpSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir, tmpdir } from 'node:os'

const HOME = homedir()
const SKILLS_DIR = join(HOME, '.claude', 'skills')
const AUDITOR = join(SKILLS_DIR, 'tulong', 'audit-skill.mjs')
const STAGE = join(tmpdir(), 'dynamic-auditor-staging')
const UA = { 'User-Agent': 'dynamic-auditor/1.0', Accept: 'application/vnd.github+json' }

const argv = process.argv.slice(2)
const arg = (k, d = null) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d)
const DRY = argv.includes('--dry')
const MAX_FILES = 60
const MAX_BYTES = 500_000

async function gh(url) {
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

// A skill folder lives in a different place in every repo, so try the shapes that
// actually occur rather than guessing one and reporting a 404 as "not found". The last
// shape is the repo root — a single-skill repo keeps SKILL.md there, with no folder.
const SHAPES = (name) => [`skills/${name}`, name, `.claude/skills/${name}`, '']

async function hasSkillMd(repo, ref, p) {
  const list = await gh(`https://api.github.com/repos/${repo}/contents/${p}?ref=${ref}`)
  return Array.isArray(list) && list.some((i) => i.name === 'SKILL.md')
}

async function resolvePath(repo, ref, name, given) {
  if (given) return { path: given, ref }
  const refs = [ref]
  // "main" is a guess, not a fact — plenty of these repos are still on master or trunk.
  try {
    const meta = await gh(`https://api.github.com/repos/${repo}`)
    if (meta.default_branch && meta.default_branch !== ref) refs.push(meta.default_branch)
  } catch { /* the shapes below may still work on the ref we were given */ }
  for (const r of refs) {
    for (const p of SHAPES(name)) {
      try { if (await hasSkillMd(repo, r, p)) return { path: p, ref: r } } catch { /* next shape */ }
    }
  }
  throw new Error(`could not locate a SKILL.md folder for ${name} in ${repo} (tried ${refs.join(', ')})`)
}

async function download(repo, ref, path, dest, budget = { files: 0 }) {
  const list = await gh(`https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`)
  if (!Array.isArray(list)) throw new Error(`${path} is not a directory`)
  mkdirSync(dest, { recursive: true })
  for (const item of list) {
    if (budget.files >= MAX_FILES) throw new Error(`skill has more than ${MAX_FILES} files — refusing`)
    if (item.type === 'dir') { await download(repo, ref, item.path, join(dest, item.name), budget); continue }
    if (item.type !== 'file') continue
    if (item.size > MAX_BYTES) throw new Error(`${item.name} is ${item.size} bytes — refusing`)
    const res = await fetch(item.download_url, { headers: { 'User-Agent': UA['User-Agent'] } })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${item.name}`)
    const buf = Buffer.from(await res.arrayBuffer())
    mkdirSync(dirname(join(dest, item.name)), { recursive: true })
    writeFileSync(join(dest, item.name), buf)
    budget.files++
  }
  return budget.files
}

function scan(dir) {
  const r = spawnSync('node', [AUDITOR, dir], { encoding: 'utf8', timeout: 60_000 })
  return { code: r.status ?? 3, report: `${r.stdout || ''}${r.stderr || ''}`.trim() }
}

async function installOne(c) {
  const name = c.name
  const out = { name, source: c.source || 'unknown', repo: c.repo, status: 'failed', detail: '' }
  if (!c.repo) { out.detail = 'no repo recorded — cannot fetch'; return out }
  if (existsSync(join(SKILLS_DIR, name))) { out.status = 'already-installed'; return out }

  const staged = join(STAGE, name)
  rmSync(staged, { recursive: true, force: true })
  try {
    const { path, ref } = await resolvePath(c.repo, c.ref || 'main', name, c.path)
    const files = await download(c.repo, ref, path, staged)
    if (!existsSync(join(staged, 'SKILL.md'))) throw new Error('no SKILL.md in the downloaded folder')
    out.files = files
  } catch (e) { out.detail = e.message; return out }

  const { code, report } = scan(staged)
  out.scan = code === 0 ? 'clean' : code === 1 ? 'review' : code === 2 ? 'block' : 'scanner-error'
  if (code === 2 || code > 2) {
    out.status = 'blocked'
    out.detail = report.split('\n').filter((l) => /block|BLOCK/.test(l)).slice(0, 6).join(' | ') || report.slice(0, 400)
    return out
  }
  if (code === 1) out.detail = report.split('\n').filter((l) => /review|REVIEW/.test(l)).slice(0, 4).join(' | ')
  if (DRY) { out.status = 'would-install'; return out }

  cpSync(staged, join(SKILLS_DIR, name), { recursive: true })
  out.status = 'installed'
  return out
}

// ---------------------------------------------------------------------------

let candidates = []
const planPath = arg('--plan')
if (planPath) {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'))
  candidates = plan.remote || []
} else if (arg('--repo')) {
  candidates = [{ name: arg('--name'), repo: arg('--repo'), ref: arg('--ref', 'main'), path: arg('--path'), source: 'manual' }]
}

if (!candidates.length) {
  console.log(JSON.stringify({ results: [], note: 'no candidates to install' }, null, 2))
  process.exit(0)
}

if (!existsSync(AUDITOR)) {
  console.log(JSON.stringify({
    results: candidates.map((c) => ({ name: c.name, status: 'skipped-no-scanner' })),
    note: 'tulong/audit-skill.mjs is not on this machine. Nothing was installed — an unscanned skill is untrusted code. Install /tulong, or vet and install these by hand.',
  }, null, 2))
  process.exit(0)
}

mkdirSync(STAGE, { recursive: true })
const results = []
for (const c of candidates) results.push(await installOne(c))
rmSync(STAGE, { recursive: true, force: true })

const tally = results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {})
console.log(JSON.stringify({ results, tally }, null, 2))
