#!/usr/bin/env node
// find-skill.mjs — ranks every discoverable skill against a Taglish/English task
// description and prints WHY each one matched.
//
//   node find-skill.mjs "ayusin mo yung design ng booking screen"
//   node find-skill.mjs --root /path/to/other/workspace "hanapin yung bug"
//   node find-skill.mjs --list
//   node find-skill.mjs --json "gawa ng bagong endpoint"
//
// Sources scanned, in ascending order of specificity:
//   builtin    — shipped with the CLI, NEVER on disk (see BUILTIN below)
//   personal   — ~/.claude/skills/*/SKILL.md
//   plugin     — ~/.claude/plugins/**/skills/*/SKILL.md
//   workspace  — .claude/skills/*/SKILL.md found by walking up from cwd AND by
//                scanning each root a few levels down (app/, api/, web/ …)

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve, sep } from 'node:path'
import { homedir } from 'node:os'

// ---------------------------------------------------------------------------
// Built-in skills. These ship inside the Claude Code binary and are injected
// straight into the prompt — there is no SKILL.md on disk for them, so a disk
// scan can never find them. Keep this list in sync by eye with the
// "available skills" listing in your session.
// ---------------------------------------------------------------------------
const BUILTIN = [
  ['run', 'Launch and drive this project app to see a change working. Run, start, screenshot the app, confirm a change works in the real app not just tests.'],
  ['code-review', 'Review the current diff or a PR number, branch, or path for correctness bugs and reuse, simplification, efficiency cleanups. Can post inline PR comments or apply fixes.'],
  ['simplify', 'Review changed code for reuse, simplification, efficiency and altitude cleanups, then apply the fixes. Quality only, does not hunt bugs.'],
  ['security-review', 'Complete a security review of the pending changes on the current branch.'],
  ['init', 'Initialize a new CLAUDE.md file with codebase documentation.'],
  ['loop', 'Run a prompt or slash command on a recurring interval. Recurring task, poll for status, run repeatedly, check every N minutes.'],
  ['schedule', 'Create, update, list or run scheduled cloud agents on a cron schedule. Also one-time scheduled runs and reminders.'],
  ['dataviz', 'Create any chart, graph, plot, dashboard or data visualization in any medium. Chart colors, palettes, axis, legend, tooltip, stat tile, sparkline, heatmap.'],
  ['artifact-design', 'Design guidance and fundamentals for Artifacts. Load before writing any artifact including Markdown ones.'],
  ['artifact-diagramming', 'Diagramming for Artifacts, inline SVG mechanics legible in both light and dark themes.'],
  ['artifact-capabilities', 'Runtime capabilities a published Artifact page can be granted: live data, shared state, file download, self-update.'],
  ['claude-api', 'Reference for the Claude API and Anthropic SDK: model ids, pricing, params, streaming, tool use, MCP, agents, caching, token counting, model migration.'],
  ['update-config', 'Configure the Claude Code harness via settings.json: hooks, permissions, env vars, automated behaviors like "from now on when X".'],
  ['keybindings-help', 'Customize keyboard shortcuts, rebind keys, add chord bindings, modify keybindings.json.'],
  ['fewer-permission-prompts', 'Scan transcripts for common read-only tool calls and add an allowlist to settings.json to reduce permission prompts.'],
  ['run-skill-generator', 'Produce a run skill that lets a future agent build, launch and drive this project from a clean machine, with a committed driver script.'],
].map(([name, description]) => ({
  name, description, source: 'builtin', path: '(built into Claude Code)',
  invocable: true, modelInvocable: true,
}))

// ---------------------------------------------------------------------------
// Taglish lexicon. This is the part that makes a Filipino query hit an English
// skill description. Left side = what Ivan types, right side = concept tokens
// that actually appear in skill descriptions.
// ---------------------------------------------------------------------------
const LEX = {
  // fix / repair
  ayusin: ['fix', 'improve', 'repair'], ayos: ['fix', 'improve'], ayusan: ['fix'],
  iayos: ['fix'], aayusin: ['fix'], ayusim: ['fix'],
  // broken / bug
  sira: ['bug', 'broken', 'error', 'fail'], nasira: ['bug', 'broken', 'error'],
  basag: ['bug', 'broken'], mali: ['bug', 'error', 'wrong', 'incorrect'],
  problema: ['bug', 'issue', 'problem', 'debug'], bug: ['bug', 'debug', 'error'],
  ayaw: ['bug', 'broken', 'fail'], hindi: ['bug', 'fail'], gumagana: ['bug', 'broken', 'fail'],
  gumana: ['bug', 'broken', 'fail'], nagwo: ['bug'], error: ['bug', 'error', 'debug'],
  // design / looks
  hitsura: ['design', 'visual', 'ui', 'layout', 'look'], itsura: ['design', 'visual', 'ui'],
  disenyo: ['design', 'ui', 'visual'], design: ['design', 'ui', 'visual', 'layout'],
  pangit: ['design', 'ui', 'usability'], maganda: ['design', 'ui', 'visual'],
  ganda: ['design', 'ui'], kulay: ['color', 'palette', 'design'],
  font: ['typography', 'font', 'type'], layout: ['layout', 'design', 'responsive'],
  spacing: ['spacing', 'layout', 'design'], mukha: ['design', 'ui', 'visual'],
  // performance
  bagal: ['performance', 'slow', 'optimize', 'speed'], mabagal: ['performance', 'slow', 'optimize'],
  bilis: ['performance', 'speed', 'optimize'], mabilis: ['performance', 'speed'],
  lag: ['performance', 'slow'], hang: ['performance', 'slow'],
  // test / qa
  subukan: ['test', 'testing', 'qa'], subok: ['test', 'testing'], sinubukan: ['test'],
  test: ['test', 'testing', 'qa', 'e2e'], testing: ['test', 'testing', 'qa'],
  tester: ['test', 'qa', 'usability'],
  // build / create
  gawa: ['build', 'create', 'implement', 'new'], gawin: ['build', 'create', 'implement'],
  gumawa: ['build', 'create', 'new'], bago: ['new', 'create', 'build'],
  bagong: ['new', 'create', 'build'], lagyan: ['add', 'implement'],
  dagdag: ['add', 'implement'], idagdag: ['add', 'implement'], dagdagan: ['add'],
  // remove
  alisin: ['remove', 'delete'], tanggalin: ['remove', 'delete'], burahin: ['delete', 'remove'],
  // refactor
  linisin: ['refactor', 'clean', 'simplify'], linis: ['refactor', 'clean', 'simplify'],
  simplehan: ['simplify', 'refactor'], gulo: ['refactor', 'clean', 'messy'],
  // security
  seguridad: ['security', 'vulnerability'], ligtas: ['security', 'secure'],
  hack: ['security', 'vulnerability', 'threat'], password: ['auth', 'security', 'credential'],
  // deliberately NOT mapping login->signup: a broken login is a debugging job,
  // not a signup-conversion job, and that mapping kept dragging `signup` in.
  login: ['auth', 'authentication', 'login'], signin: ['auth', 'authentication'],
  // data
  datos: ['data', 'database'], talaan: ['database', 'schema'], db: ['database', 'sql'],
  database: ['database', 'sql', 'schema', 'query'], query: ['query', 'sql', 'database'],
  // api
  api: ['api', 'endpoint', 'rest', 'backend'], endpoint: ['api', 'endpoint', 'route'],
  ruta: ['route', 'routing', 'api'], backend: ['backend', 'api', 'server'],
  // writing / marketing
  sulat: ['copy', 'write', 'content'], isulat: ['copy', 'write', 'content'],
  sulatin: ['copy', 'write', 'content'], kopya: ['copy', 'copywriting'],
  benta: ['sales', 'conversion', 'marketing'], kita: ['revenue', 'conversion', 'marketing'],
  // run / launch  — "patakbuhin mo yung app" must reach the built-in /run skill
  patakbuhin: ['run', 'launch', 'start', 'app'], takbo: ['run', 'launch', 'start'],
  tumakbo: ['run', 'start'], pataktakbo: ['run', 'launch'], run: ['run', 'launch', 'start'],
  buksan: ['open', 'run', 'launch', 'start'], simulan: ['start', 'run', 'launch'],
  start: ['start', 'run', 'launch'], launch: ['launch', 'run', 'start'],
  // deploy
  deploy: ['deploy', 'release', 'ship', 'server'], ilive: ['deploy', 'release', 'production'],
  live: ['deploy', 'production', 'release'], server: ['server', 'deploy', 'backend'],
  // review / inspect  (note the `tignan` spelling — far more common than `tingnan`)
  tingnan: ['review', 'check', 'inspect', 'audit'], tignan: ['review', 'check', 'inspect', 'audit'],
  titignan: ['review', 'check'], silipin: ['review', 'inspect'],
  suriin: ['review', 'audit', 'analyze'], check: ['review', 'check', 'audit', 'verify'],
  review: ['review', 'audit'], audit: ['audit', 'review'],
  // find / root cause
  hanapin: ['find', 'trace', 'investigate', 'debug'], hanap: ['find', 'trace', 'debug'],
  bakit: ['why', 'root', 'cause', 'debug'], dahilan: ['cause', 'root', 'reason'],
  ugat: ['root', 'cause', 'trace'], sanhi: ['cause', 'root'],
  // explain / plan
  ipaliwanag: ['explain', 'understand', 'document'], paliwanag: ['explain', 'document'],
  plano: ['plan', 'planning', 'design'], balak: ['plan', 'planning'],
  ideya: ['brainstorm', 'idea', 'explore'], isip: ['brainstorm', 'think'],
  // misc surfaces
  screen: ['screen', 'page', 'ui', 'component'], pahina: ['page', 'screen', 'ui'],
  larawan: ['screenshot', 'image'], kuha: ['screenshot', 'capture'],
  screenshot: ['screenshot', 'run', 'browser'],
  mobile: ['mobile', 'responsive', 'native'], cellphone: ['mobile', 'responsive'],
  telepono: ['mobile', 'responsive'], pwa: ['pwa', 'offline', 'mobile'],
  accessible: ['accessibility', 'wcag'], accessibility: ['accessibility', 'wcag'],
}

const STOP = new Set(`
ang ng sa na ay mo ko nya niya yung yun yan ito iyon mga ba po naman lang din rin pa
may meron wala ako ikaw siya kami tayo kayo sila kay ni si at o para kung pero kasi
nung noong dito diyan doon nang tapos then ung sya nyo ninyo akin iyo kanya
the a an of to in for on and or is are be am was were i my me it this that with
please can you we us your our their they them he she his her from by as at be do does
did done get got make made want need help lets let just also very really some any
ok okay oo hindi naman sige nga baka siguro medyo talaga daw raw eh ha ano anong
what which how why when where who whom whose all more most other into over under
`.trim().split(/\s+/))

// ---------------------------------------------------------------------------
// Frontmatter parsing. Descriptions here are long, sometimes quoted, sometimes
// folded across several lines. A naive `grep description:` truncates them.
// ---------------------------------------------------------------------------
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const body = text.slice(text.indexOf('\n') + 1, end)
  const out = {}
  const lines = body.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = /^([A-Za-z][A-Za-z0-9_-]*):\s?(.*)$/.exec(lines[i])
    if (!m) continue
    let [, key, val] = m
    // consume folded continuation lines: indented, or simply not a new key
    while (i + 1 < lines.length) {
      const nxt = lines[i + 1]
      if (nxt.trim() === '') break
      if (/^([A-Za-z][A-Za-z0-9_-]*):\s/.test(nxt)) break
      val += ' ' + nxt.trim()
      i++
    }
    val = val.trim()
    if (/^["'].*["']$/s.test(val)) val = val.slice(1, -1)
    if (/^(>|\|)-?$/.test(val)) val = ''
    out[key] = val
  }
  return out
}

const PRUNE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor',
  'coverage', '.cache', 'tmp', '.venv', 'venv', '__pycache__', '.turbo', 'out'])

function readSkillDir(dir, source) {
  const found = []
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return found }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const file = join(dir, e.name, 'SKILL.md')
    if (!existsSync(file)) continue
    let raw
    try { raw = readFileSync(file, 'utf8') } catch { continue }
    const fm = parseFrontmatter(raw) || {}
    const truthy = (v) => v === true || v === 'true'
    const falsy = (v) => v === false || v === 'false'
    found.push({
      name: fm.name || e.name,
      description: fm.description || '',
      source,
      path: file,
      // `user-invocable: false` hides it from the slash-command list.
      invocable: !falsy(fm['user-invocable']),
      // `disable-model-invocation: true` means Skill() will NOT load it —
      // it is reference material you Read, not a skill you invoke.
      modelInvocable: !truthy(fm['disable-model-invocation']),
    })
  }
  return found
}

// find .claude/skills dirs a few levels down (app/, api/, web/ …)
function scanTree(root, depth, acc) {
  if (depth < 0) return
  const candidate = join(root, '.claude', 'skills')
  if (existsSync(candidate)) acc.push(candidate)
  let entries
  try { entries = readdirSync(root, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || PRUNE.has(e.name)) continue
    scanTree(join(root, e.name), depth - 1, acc)
  }
}

function collect(roots, depth) {
  const skills = [...BUILTIN]
  const home = homedir()

  skills.push(...readSkillDir(join(home, '.claude', 'skills'), 'personal'))

  const pluginRoot = join(home, '.claude', 'plugins')
  if (existsSync(pluginRoot)) {
    const dirs = []
    scanTree(pluginRoot, 3, dirs)
    for (const d of dirs) skills.push(...readSkillDir(d, 'plugin'))
  }

  const wsDirs = []
  for (const root of roots) {
    // walk UP from the root — Claude Code discovers ancestors too
    let d = resolve(root)
    for (;;) {
      const c = join(d, '.claude', 'skills')
      if (existsSync(c)) wsDirs.push(c)
      const parent = dirname(d)
      if (parent === d || d === home) break
      d = parent
    }
    // …and DOWN into sub-projects (app/, api/, web/)
    scanTree(resolve(root), depth, wsDirs)
  }
  const seenDir = new Set()
  for (const d of wsDirs) {
    if (seenDir.has(d) || d === join(home, '.claude', 'skills')) continue
    seenDir.add(d)
    skills.push(...readSkillDir(d, 'workspace'))
  }

  // more specific source wins on a name clash
  const rank = { builtin: 0, personal: 1, plugin: 2, workspace: 3 }
  const best = new Map()
  for (const s of skills) {
    const prev = best.get(s.name)
    if (!prev || rank[s.source] > rank[prev.source]) best.set(s.name, s)
  }
  return [...best.values()]
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim()

function tokenize(s) {
  return norm(s).split(' ').filter((t) => t.length > 1 && !STOP.has(t))
}

// Light suffix stripper. Without this, "debug" misses "debugging", "test"
// misses "testing" and "fix" misses "fixes" — which is exactly how a query
// about a bug ranked `signup` above `systematic-debugging`.
const SUFFIX = ['ization', 'isation', 'ations', 'ation', 'ings', 'ing', 'ies', 'ers', 'er', 'ed', 'es', 's']
function stem(w) {
  if (w.length <= 4) return w
  for (const suf of SUFFIX) {
    if (!w.endsWith(suf)) continue
    let base = w.slice(0, -suf.length)
    if (base.length < 4) continue
    if (suf === 'ies') base += 'y'
    // "debugging" -> "debugg" -> "debug"
    if (/(.)\1$/.test(base) && !/(ss|ll|ee|oo)$/.test(base)) base = base.slice(0, -1)
    return base
  }
  return w
}

function expand(tokens) {
  const direct = new Set(tokens)
  // target concept -> every query word that produced it. Keeping ALL origins
  // matters: "ayusin ang disenyo" and "ang pangit" both yield `design`, and
  // crediting only the last one makes the printed reason wrong.
  const syn = new Map()
  for (const t of tokens) {
    for (const key of [t, t.replace(/^(i|mag|nag|pag|ma|na)-?/, '')]) {
      if (!LEX[key]) continue
      for (const w of LEX[key]) {
        if (direct.has(w)) continue
        if (!syn.has(w)) syn.set(w, new Set())
        syn.get(w).add(key)
      }
    }
  }
  return { direct: [...direct], syn }
}

function score(skill, q) {
  const nameTok = new Set(norm(skill.name).split(' '))
  const nameStem = new Set([...nameTok].map(stem))
  const nameStr = norm(skill.name)
  const descTok = tokenize(skill.description)
  const descCount = new Map()
  const descStem = new Map()
  for (const t of descTok) {
    descCount.set(t, (descCount.get(t) || 0) + 1)
    const s = stem(t)
    descStem.set(s, (descStem.get(s) || 0) + 1)
  }

  let pts = 0
  const why = []

  const hit = (tok, weight, label) => {
    const st = stem(tok)
    let got = 0
    if (nameTok.has(tok)) { got += 12 * weight; why.push(`name:${label}`) }
    else if (nameStem.has(st)) { got += 10 * weight; why.push(`name:${label}`) }
    else if (tok.length > 3 && nameStr.includes(st)) { got += 7 * weight; why.push(`name~${label}`) }

    const c = descCount.get(tok) || 0
    const cs = c ? 0 : (descStem.get(st) || 0)
    if (c) { got += Math.min(3 * c, 7) * weight; why.push(`desc:${label}${c > 1 ? '×' + c : ''}`) }
    else if (cs) { got += Math.min(2.5 * cs, 6) * weight; why.push(`desc:${label}${cs > 1 ? '×' + cs : ''}`) }

    pts += got
    return got
  }

  for (const t of q.direct) hit(t, 1, t)
  for (const [t, origins] of q.syn) hit(t, 0.6, `${[...origins].join('/')}→${t}`)

  // exact phrase in the description is a strong signal
  const phrase = norm(q.raw)
  if (phrase.length > 8 && norm(skill.description).includes(phrase)) {
    pts += 10; why.push(`phrase:"${q.raw}"`)
  }

  pts += { workspace: 4, plugin: 2, personal: 1, builtin: 1 }[skill.source] || 0
  return { pts: Math.round(pts * 10) / 10, why: [...new Set(why)] }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2)
const roots = []
let json = false, list = false, limit = 6, depth = 3
const words = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--root') roots.push(argv[++i])
  else if (a === '--json') json = true
  else if (a === '--list') list = true
  else if (a === '--limit') limit = Number(argv[++i]) || 6
  else if (a === '--depth') depth = Number(argv[++i]) || 3
  else words.push(a)
}
if (process.env.TULONG_ROOTS) roots.push(...process.env.TULONG_ROOTS.split(':').filter(Boolean))
if (roots.length === 0) roots.push(process.cwd())

const all = collect(roots, depth)
const query = words.join(' ').trim()

if (list || !query) {
  const bySource = {}
  for (const s of all) (bySource[s.source] ||= []).push(s)
  for (const src of ['workspace', 'plugin', 'personal', 'builtin']) {
    const arr = (bySource[src] || []).sort((a, b) => a.name.localeCompare(b.name))
    if (!arr.length) continue
    console.log(`\n== ${src} (${arr.length}) ==`)
    for (const s of arr) {
      const flags = [!s.invocable && 'no-slash', !s.modelInvocable && 'reference-only']
        .filter(Boolean).join(',')
      console.log(`  ${s.name}${flags ? `  [${flags}]` : ''}`)
    }
  }
  if (!query) console.log('\n(no query given — pass a task description to rank these)')
  process.exit(0)
}

const q = { ...expand(tokenize(query)), raw: query }
const ranked = all.map((s) => ({ ...s, ...score(s, q) }))
  .filter((s) => s.pts > 3)
  .sort((a, b) => b.pts - a.pts)
  .slice(0, limit)

if (json) {
  const synonyms = Object.fromEntries([...q.syn].map(([w, o]) => [w, [...o]]))
  console.log(JSON.stringify({ query, tokens: q.direct, synonyms, matches: ranked }, null, 2))
  process.exit(0)
}

console.log(`query: "${query}"`)
console.log(`tokens: ${q.direct.join(', ') || '(none)'}`)
if (q.syn.size) console.log(`taglish: ${[...q.syn].map(([w, o]) => `${[...o].join('/')}→${w}`).join(', ')}`)
console.log(`scanned: ${all.length} skills from ${roots.length} root(s)\n`)
if (!ranked.length) {
  console.log('no confident match — handle it directly, or run with --list to browse.')
  process.exit(0)
}
ranked.forEach((s, i) => {
  const flags = [s.source, !s.modelInvocable ? 'REFERENCE-ONLY (Read it, do not Skill() it)' : 'invocable']
    .join(' · ')
  console.log(`${i + 1}. ${s.name}  [${flags}]  score ${s.pts}`)
  console.log(`   why: ${s.why.slice(0, 6).join('; ') || 'weak match'}`)
  console.log(`   ${s.description.slice(0, 180)}${s.description.length > 180 ? '…' : ''}`)
  console.log(`   ${s.path}\n`)
})
