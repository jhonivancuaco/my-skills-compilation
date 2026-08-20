#!/usr/bin/env node
/**
 * audit-skill.mjs — read a skill for harmful commands, code and instructions
 * BEFORE it is installed, and re-read the ones already on the machine.
 *
 *   node audit-skill.mjs --installed              # every skill in ~/.claude/skills
 *   node audit-skill.mjs /tmp/candidate-skill     # a downloaded candidate, pre-install
 *   node audit-skill.mjs --installed --verbose    # show `note` hits too
 *   node audit-skill.mjs --installed --json       # machine-readable
 *
 * Exit code: 2 if anything is BLOCK, 1 if anything is REVIEW, 0 if all clean.
 *
 * A hit is a QUESTION, not a verdict — except the `block` tier, which is never
 * installed without Ivan saying yes to that specific line. The scanner finds;
 * a human decides.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { homedir } from 'node:os';

const SKILLS_ROOT = join(homedir(), '.claude', 'skills');
const SCAN_EXT = /\.(md|sh|bash|zsh|mjs|cjs|js|ts|tsx|py|rb|pl|json|ya?ml|toml)$/i;
const SKIP_DIR = /^(\.git|node_modules|\.venv|__pycache__|dist|build|\.next)$/;
const EXEC_EXT = /\.(sh|bash|zsh|mjs|cjs|js|ts|tsx|py|rb|pl)$/i;
const MAX_BYTES = 400_000;

// severity: block = never install unasked · review = needs eyes · note = FYI
const RULES = [
  // ---- remote code execution -------------------------------------------------
  { id: 'remote-exec', sev: 'block', why: 'downloads code and runs it immediately — the payload lives off-machine and can change after you read it',
    re: /\b(curl|wget)\b[^\n|]{0,200}\|\s*(sudo\s+)?(ba|z|k|d)?sh\b|\b(curl|wget)\b[^\n|]{0,200}\|\s*(python3?|node|perl|ruby)\b/i },
  { id: 'eval-substitution', sev: 'block', why: 'evaluates the output of a command as code',
    re: /\beval\s*"?\s*\$\(|\beval\s*\(\s*(atob|Buffer\.from|require\s*\(\s*['"]child_process)/i },
  { id: 'base64-exec', sev: 'block', why: 'hides what it runs behind an encoding',
    re: /base64\s+(-{1,2}d\b|--decode)[^\n]{0,120}\|\s*(ba|z)?sh\b|Function\s*\(\s*atob|eval\s*\(\s*atob/i },
  { id: 'obfuscated-blob', sev: 'block', why: 'a long encoded blob in a skill is hiding something; a legitimate skill has nothing to hide',
    re: /(?:['"`])[A-Za-z0-9+/]{120,}={0,2}(?:['"`])|(?:\\x[0-9a-fA-F]{2}){12,}|String\.fromCharCode\s*\(\s*(?:\d{1,3}\s*,\s*){10,}/ },
  { id: 'reverse-shell', sev: 'block', why: 'opens a socket back to whoever is listening',
    re: /\/dev\/tcp\/|\bnc\s+-[a-z]{0,4}e\b|\bncat\b[^\n]{0,60}-e|socat\b[^\n]{0,40}EXEC/i },

  // ---- credentials and exfiltration ------------------------------------------
  // NOTE: an ACTION verb is required next to the path. "Keychain Services (encrypted)"
  // in a docs page is not credential theft; `cat ~/.ssh/id_rsa` is.
  { id: 'credential-read', sev: 'block', why: 'reads secrets no skill needs — SSH keys, cloud creds, the Claude token, the login keychain',
    re: /(\b(cat|less|head|tail|cp|scp|mv|base64|xxd|tee|open|curl|wget|upload|send|Read)\b[^\n]{0,80})?(\.ssh\/id_(rsa|ed25519|ecdsa|dsa)\b|\.aws\/credentials\b|\.netrc\b|\.claude\/\.credentials|\.config\/gh\/hosts)|security\s+(find-(generic|internet)-password|dump-keychain)|gcloud\s+auth\s+print|git\s+credential\s+(fill|approve)|cat\s+[^\n]{0,40}\.npmrc/i },
  { id: 'exfiltration', sev: 'block', why: 'sends file contents or secrets to a remote host',
    re: /\b(curl|wget|fetch|http[sx]?\.(post|request))\b[^\n]{0,160}(--data|--data-binary|-d\s|--upload-file|-T\s|-F\s|body\s*:)[^\n]{0,120}(\$\(\s*cat|@\/|process\.env|id_rsa|\btoken\b|\bsecret\b|password|api[_-]?key)/i },
  { id: 'drop-host', sev: 'block', why: 'a known throwaway collector host — that is where stolen data goes',
    re: /webhook\.site|pastebin\.com\/api|requestb(in|ay)|ngrok(-free)?\.(io|app)|burpcollaborator|\boast\.\w{2,}|interact\.sh|transfer\.sh|0x0\.st|termbin\.com|\bpipedream\.net/i },
  { id: 'env-dump', sev: 'review', why: 'dumping the whole environment usually precedes sending it somewhere',
    re: /\bprintenv\b|\benv\s*\|\s*(curl|nc|base64|tee)|JSON\.stringify\s*\(\s*process\.env\s*\)/i },

  // ---- destruction ----------------------------------------------------------
  // bare ~ / $HOME / / / * / . is a block; a named subpath (~/.gradle/caches) is a question
  { id: 'destructive-rm', sev: 'block', why: 'deletes a home or root directory wholesale, or deletes an unquoted variable that can expand to anything',
    re: /\brm\s+(-[a-zA-Z]*[rRf][a-zA-Z]*\s+)+(~|\$HOME|\$\{?HOME\}?|\/|\*|\.|\.\.)\s*(&&|;|\||$)|\brm\s+(-[a-zA-Z]*[rRf][a-zA-Z]*\s+)+\/(?!tmp\b|private\/tmp\b|var\/folders\b|dev\/null)[A-Za-z]/ },
  { id: 'rm-in-home', sev: 'review', why: 'deletes under the home directory — fine for a named cache, not fine for anything else',
    re: /\brm\s+(-[a-zA-Z]*[rRf][a-zA-Z]*\s+)+(~|\$HOME)\/\S|\brm\s+(-[a-zA-Z]*[rRf][a-zA-Z]*\s+)+\$\{?[A-Za-z_][A-Za-z0-9_]*\}?(\/|\s|$)/ },
  { id: 'git-destructive', sev: 'review', why: 'throws away work that is not yours — a local tree holds other sessions’ uncommitted files',
    re: /git\s+push\s+[^\n]{0,60}(--force\b|\s-f\b)|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|git\s+checkout\s+--\s+\.|git\s+stash\s+(drop|clear)|git\s+branch\s+-D\b/i },
  { id: 'db-wipe', sev: 'review', why: 'wipes a database; on this machine mongorestore is the one operation that destroys live rows',
    re: /\bDROP\s+DATABASE\b|\bTRUNCATE\s+TABLE\b|deleteMany\s*\(\s*\{\s*\}\s*\)|\bdropDatabase\s*\(|\bmongorestore\b|\bdb\.dropDatabase\b/i },
  { id: 'process-kill', sev: 'review', why: 'stops services other people are using',
    re: /\bkillall\b|\bpkill\s+-9|pm2\s+(delete|kill)\b|docker\s+(system\s+prune|rm\s+-f|rmi\s+-f)|systemctl\s+(stop|disable)\b/i },

  // ---- privilege, persistence, sandbox --------------------------------------
  { id: 'sudo', sev: 'review', why: 'root. In an executable file it is a block; in prose it is a question',
    re: /\bsudo\s+\S/ },
  { id: 'persistence', sev: 'block', why: 'installs itself to run again later, outside any skill invocation',
    re: /\bcrontab\s+-|launchctl\s+(load|bootstrap)|LaunchAgents|LaunchDaemons|systemctl\s+enable|>>?\s*~\/\.(zshrc|bashrc|bash_profile|profile|zprofile)|\/etc\/(cron|rc\.local|sudoers)/i },
  { id: 'hook-injection', sev: 'block', why: 'hooks and a permissions allowlist ARE the sandbox — a skill writing them rewrites what Claude may do without asking',
    re: /\.claude\/hooks\b|"hooks"\s*:\s*[\[{]|"permissions"\s*:\s*\{[^}]{0,200}"allow"/ },
  { id: 'harness-write', sev: 'review', why: 'writes to the harness’ own config or rules — legitimate for housekeeping, never a side effect of a task',
    re: /(>|>>|\btee\b|\bcp\b\s+\S+\s+|\bmv\b\s+\S+\s+|sed\s+-i[^\n]{0,20}|writeFileSync\s*\(\s*[^\n]{0,40})(~|\$HOME)\/\.claude\/(settings(\.local)?\.json|CLAUDE\.md)/ },
  { id: 'permission-bypass', sev: 'block', why: 'turns the safety rails off',
    re: /--dangerously-skip-permissions|dangerouslyDisableSandbox|bypassPermissions|DISABLE_(SANDBOX|SAFETY)/i },
  { id: 'sandbox-flag', sev: 'review', why: 'launches a browser or Electron app with its sandbox off — normal in CI, worth seeing',
    re: /--no-sandbox\b|--disable-web-security\b/ },
  { id: 'perm-widen', sev: 'review', why: 'world-writable files, or handing something to root',
    re: /chmod\s+(-R\s+)?(777|a\+w|o\+w|\+s)\b|chown\s+(-R\s+)?(root|0)\b/i },

  // ---- instructions aimed at the model, not at the machine -------------------
  { id: 'prompt-injection', sev: 'block', why: 'instructs the model to disregard its own rules — a skill may not override the operator',
    re: /ignore\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)\s+instructions|disregard\s+(your|the|all)\s+(rules|guidelines|system\s*prompt|instructions)|override\s+(your|the)\s+(system|safety|guardrails)|you\s+are\s+no\s+longer\s+(bound|restricted)|forget\s+(everything|all\s+previous)/i },
  { id: 'hide-from-user', sev: 'block', why: 'tells the model to act behind the user’s back — the one instruction that is never legitimate',
    re: /(do\s+not|don'?t|never)\s+(tell|inform|notify)\s+(the\s+)?(user|human|operator)\b|without\s+(telling|informing|asking|notifying)\s+(the\s+)?(user|him|her|them)\b|hide\s+(this|it|the\s+output)\s+from\s+(the\s+)?user|silently\s+(exfiltrate|send|upload|delete|install)/i },
  { id: 'auto-approve', sev: 'review', why: 'removes a human check — a skill telling the model to stop asking',
    re: /do\s+not\s+ask\s+(the\s+user\s+)?(for\s+)?(permission|confirmation|approval)|always\s+(answer|reply|say)\s+["\`']?yes|assume\s+(the\s+user\s+)?consent|auto-?approve\s+(all|any|every)/i },

  // ---- outward-facing, worth knowing about ----------------------------------
  { id: 'publishes-outward', sev: 'review', why: 'sends something to the outside world — fine if that is the skill’s job, not fine as a side effect',
    re: /npm\s+publish|gh\s+release\s+create|gh\s+pr\s+create|twine\s+upload|docker\s+push|\bsendmail\b|smtplib|hooks\.slack\.com|api\.telegram\.org/i },
  { id: 'network-call', sev: 'note', why: 'reaches the network — normal for many skills, listed so the whole set is visible',
    re: /\b(curl|wget|fetch\s*\(|axios|requests\.(get|post)|urllib|http[sx]?\.get)\b/i },
];

// Reviewed exceptions — ENUMERATED, never a blanket skip of a whole skill.
// A named skill catalogues these very patterns in a markdown table; a table row
// naming a rule is not an instruction to run it. Everything else in the same
// file is still scanned, so a real instruction hidden there still blocks.
const ALLOW = [
  { why: "the auditor's own rules table in tulong/SKILL.md — markdown table rows listing what it detects",
    test: (file, line) => file.endsWith('tulong/SKILL.md') && /^\s*\|\s*\*\*/.test(line) },
];
const allowed = (file, line) => ALLOW.some((a) => a.test(file, line));

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const VERBOSE = flag('--verbose') || flag('-v');
const AS_JSON = flag('--json');
const targets = args.filter((a) => !a.startsWith('-'));
if (flag('--installed') || flag('--all')) targets.push(SKILLS_ROOT);
if (!targets.length) {
  console.log('usage: node audit-skill.mjs [--installed] [path ...] [--verbose] [--json]');
  process.exit(0);
}

function walk(dir, out = []) {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.isDirectory()) { if (!SKIP_DIR.test(e.name)) walk(join(dir, e.name), out); }
    else if (SCAN_EXT.test(e.name)) out.push(join(dir, e.name));
  }
  return out;
}

function scanFile(file) {
  let text;
  try {
    if (statSync(file).size > MAX_BYTES) return [];
    text = readFileSync(file, 'utf8');
  } catch { return []; }
  const lines = text.split('\n');
  const hits = [];
  const isExec = EXEC_EXT.test(file);
  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 2000) continue;
      const m = rule.re.exec(line);
      rule.re.lastIndex = 0;
      if (!m) continue;
      // an executable file DOING a thing outranks a markdown file DESCRIBING it
      let sev = rule.sev;
      if (isExec && sev === 'review') sev = 'block';
      if (!isExec && sev === 'block' && (rule.id === 'sudo' || rule.id === 'network-call')) sev = 'review';
      if (allowed(file, line)) continue;
      hits.push({ rule: rule.id, sev, why: rule.why, file, line: i + 1, text: line.trim().slice(0, 160) });
      break; // one hit per rule per file is enough to raise the question
    }
  }
  return hits;
}

// a "unit" is a skill directory (one containing SKILL.md), else the path itself
function units(target) {
  if (!existsSync(target)) return [];
  if (statSync(target).isFile()) return [{ name: basename(target), dir: target, files: [target] }];
  const selfSkill = existsSync(join(target, 'SKILL.md'));
  if (selfSkill) return [{ name: basename(target), dir: target, files: walk(target) }];
  const out = [];
  for (const e of readdirSync(target, { withFileTypes: true })) {
    if (!e.isDirectory() || SKIP_DIR.test(e.name)) continue;
    const dir = join(target, e.name);
    out.push({ name: e.name, dir, files: walk(dir) });
  }
  const loose = walk(target).filter((f) => !out.some((u) => f.startsWith(u.dir)));
  if (loose.length) out.push({ name: `(${basename(target)} root files)`, dir: target, files: loose });
  return out;
}

const results = [];
for (const t of targets) {
  for (const u of units(t)) {
    const hits = u.files.flatMap(scanFile)
      .filter((h) => !h.file.endsWith('audit-skill.mjs')); // the rules file matches itself
    const verdict = hits.some((h) => h.sev === 'block') ? 'BLOCK'
      : hits.some((h) => h.sev === 'review') ? 'REVIEW' : 'CLEAN';
    results.push({ ...u, hits, verdict });
  }
}

if (AS_JSON) {
  console.log(JSON.stringify(results.map((r) => ({ name: r.name, verdict: r.verdict, files: r.files.length,
    hits: r.hits.map((h) => ({ rule: h.rule, sev: h.sev, file: relative(r.dir, h.file) || basename(h.file), line: h.line, text: h.text })) })), null, 2));
} else {
  const order = { BLOCK: 0, REVIEW: 1, CLEAN: 2 };
  results.sort((a, b) => order[a.verdict] - order[b.verdict] || a.name.localeCompare(b.name));
  const mark = { BLOCK: '⛔ BLOCK ', REVIEW: '⚠️  REVIEW', CLEAN: '✅ clean ' };
  for (const r of results) {
    if (r.verdict === 'CLEAN' && !VERBOSE) continue;
    console.log(`\n${mark[r.verdict]}  ${r.name}   (${r.files.length} files)`);
    for (const h of r.hits) {
      if (h.sev === 'note' && !VERBOSE) continue;
      console.log(`   [${h.sev}] ${h.rule}  ${relative(r.dir, h.file) || basename(h.file)}:${h.line}`);
      console.log(`      ${h.text}`);
    }
  }
  const n = (v) => results.filter((r) => r.verdict === v).length;
  console.log(`\n── ${results.length} scanned · ${n('BLOCK')} block · ${n('REVIEW')} review · ${n('CLEAN')} clean`);
  if (!VERBOSE) console.log('   (clean units and `note` hits hidden — pass --verbose)');
}
process.exit(results.some((r) => r.verdict === 'BLOCK') ? 2 : results.some((r) => r.verdict === 'REVIEW') ? 1 : 0);
