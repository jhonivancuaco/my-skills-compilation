---
name: dynamic-auditor
description: Runs a complete, evidence-backed SEO audit that assembles its own toolkit before it starts. It ranks every SEO-relevant skill already on this machine, searches the same eight open-source skill sources /tulong uses (and only those eight), safety-scans and auto-installs whatever is missing, bulk-loads them all, and only then audits — crawling the live site (robots, sitemaps, redirects, canonicals, titles, structured data, Core Web Vitals via Chrome DevTools) and/or the codebase, scoring every pillar, and finishing by publishing the whole compilation as a shareable Artifact. Use this whenever the user asks for an SEO audit, a site audit, a technical SEO review, a "full audit", wants to know why a site isn't ranking or lost traffic, or mentions crawl errors, indexing, sitemaps, robots.txt, canonicals, Core Web Vitals, page speed, meta tags, or schema/structured data. Use it too when they just say "audit my site", "check my SEO", "i-audit mo 'tong site", "bakit walang traffic", "tingnan mo kung okay ang SEO" — even when they never say the word "audit". Prefer this over seo-audit alone whenever the user wants a finished, deliverable audit rather than a quick answer.
metadata:
  version: 1.0.0
---

# Dynamic Auditor

A full SEO audit has two halves that are usually done badly in opposite ways. The
knowledge half gets guessed at from memory when better instructions already sit
unloaded on the machine. The evidence half gets skipped entirely — a "report" written
from a glance at one page, full of confident claims nobody measured.

This skill fixes both. It goes and gets the right skills first, then it goes and gets
the actual numbers, and only then does it say anything. The output is one Artifact the
user can hand to a client or a developer.

**Loading this skill does not mean the work is done.** Everything below runs in order.

---

## Phase 0 · Scope it from what you were given (~1 min)

Do not interview the user. Look at what is in front of you.

| What you see | What you audit |
|---|---|
| A URL in the prompt | The live site |
| A web project in the working directory (`package.json`, `next.config.*`, `astro.config.*`, `nuxt.config.*`, a `public/` with `robots.txt`) | The codebase |
| Both | Both — and say so, because code-level and live findings explain each other |
| Neither | Ask one question: which site, or which folder |

Then set the depth. Default to a full run — this skill exists because half-audits are
worthless. Drop to a quick pass only if the user explicitly asks for one ("mabilis
lang", "quick check").

Record the target in a working directory you create now:
`audit/<domain-or-project>/<YYYY-MM-DD>/`. Everything you gather goes there. Having the
raw evidence on disk is what lets someone re-check a claim six weeks later.

---

## Phase 1 · Assemble the crew (~1–3 min)

Never audit with only what happens to be loaded. Run discovery first.

```bash
node ~/.claude/skills/dynamic-auditor/scripts/discover-skills.mjs \
  --out audit/<target>/<date>/skill-plan.json
```

It ranks what is already installed (delegating to `tulong/find-skill.mjs`, the one
ranker on this machine) and searches the eight open-source sources — `anthropics/skills`,
`ComposioHQ/awesome-claude-skills`, `alirezarezvani/claude-skills`, skills.sh,
skillsmp.com, awesome lists on GitHub, awesomeclaude.ai, onewave-ai. **That list is
closed.** No GitHub-wide search, no WebSearch, no npm, no plugin marketplaces. A bounded
hunt finishes in a minute; an unbounded one turns a 10-minute audit into an hour for the
same handful of skills. If a source is down, the script says which and carries on — that
is not a reason to look elsewhere.

Add `--topic "<the user's own words>"` when the audit is clearly about something beyond
plain SEO (e.g. an e-commerce catalogue, a multilingual rollout, an accessibility push).
Use `--no-remote` if you are offline or the user asked for speed.

Then install what is missing:

```bash
node ~/.claude/skills/dynamic-auditor/scripts/install-skill.mjs \
  --plan audit/<target>/<date>/skill-plan.json
```

Every candidate is downloaded to a staging directory and read by
`tulong/audit-skill.mjs` **before** anything lands in `~/.claude/skills`. A `block`
verdict — remote code execution, credential reads, obfuscated blobs — means it is not
installed, full stop; report it in one line and move on without it. A `review` verdict
installs but is worth a line too. If the scanner is not on this machine, nothing gets
installed and you say so: auto-install is only defensible because something reads the
code first.

Finally, **load everything in one bulk `Skill` call** — the discovered local skills plus
whatever was just installed. One call, not a dozen. Afterwards say nothing about it; the
interface already prints a row per loaded skill and a text list just repeats it.

### What the loaded skills are for

You are the orchestrator. They hold the domain knowledge, and you should be reading them
rather than reciting SEO from memory. Typical division of labour, when these are present:

| Pillar | Who owns it |
|---|---|
| Technical, on-page, E-E-A-T, international | `seo-audit` |
| Structured data / rich results | `schema` |
| Core Web Vitals, TTFB, caching | `performance-engineer` |
| Topic coverage, content gaps, intent | `content-strategy` |
| Measurement, GA4, Search Console | `analytics` |
| SERP competitors, comparison gaps | `competitors` |
| Template/scale pages | `programmatic-seo` |
| Alt text, semantics, contrast | the accessibility skill |
| Anything freshly installed | read its `SKILL.md` and use what it adds |

If a pillar has no owner, audit it yourself — but say in the report that no specialist
was available for it, so the reader knows which sections are thinner.

---

## Phase 2 · Collect evidence before forming any opinion (~5–15 min)

The rule for the whole phase: **nothing goes in the report that you did not measure.**
An audit's only real currency is that its claims are checkable.

### Live site

```bash
node ~/.claude/skills/dynamic-auditor/scripts/seo-crawl.mjs https://<domain> \
  --out audit/<target>/<date>/evidence --max 50 --depth 3
```

Writes `site.json`, `pages.json` and `findings.json`. Read `findings.json` first — it is
a flat, deduplicated list, each item carrying a severity, a pillar, and the exact URLs
that prove it. Raise `--max` for a big site; `--ignore-robots` only when the user owns
the site and wants disallowed paths checked too.

### Rendered page and real performance

The crawl sees raw HTML. Plenty of sites inject their title, canonical or content with
JavaScript, and a raw-HTML audit would call that missing. Use the Chrome DevTools tools
on the homepage and two or three important templates to check what actually renders, and
to get real Core Web Vitals rather than a guess from response times.

### Codebase

Where the crawl says *what* is wrong, the code says *where to fix it* — one layout file
usually explains a hundred bad pages. See `references/evidence.md` for framework-specific
recipes.

### Ground truth you cannot fetch

Rankings, impressions, backlinks and click-through live in Search Console and Ahrefs. If
the user has exports, ask for them once, here, while the crawl runs. If not, say plainly
in the report which sections are inference rather than measurement. Never invent a
traffic number.

---

## Phase 3 · Analyse, score, prioritise

Work pillar by pillar (`references/report-spec.md` has the full list, the scoring
formula and what each pillar covers). For each one: what the evidence shows, what it
costs the site, and what to do about it.

Two habits separate a useful audit from a checklist dump:

**Group by cause, not by symptom.** "312 pages missing a meta description" is one
finding about one template, not 312 findings. The reader needs to know how many things
they have to fix, and that number is usually far smaller than the number of bad pages.

**Rank by impact ÷ effort, and be honest about both.** A canonical tag pointing at the
wrong host can cost a site its entire index and takes ten minutes to fix — that goes
first. A missing Open Graph image is a five-minute fix worth almost nothing — that goes
near the bottom, or not in the report at all. Every finding gets a severity
(`critical` / `high` / `medium` / `low`) and an effort estimate, and the two together
decide the order.

Say what you could not check. An audit that admits its blind spots is trusted on the
parts it did check.

---

## Phase 4 · Publish the compilation as an Artifact

The audit is not delivered until it is a page the user can open and send to someone.
This is the deliverable, and it is not optional.

1. **Load `artifact-design` first** — before writing a single line of HTML. If the report
   carries charts (pillar scores, severity counts, page-depth distribution), load
   `dataviz` too.
2. Write the page to `audit/<target>/<date>/report.html`, then publish it with the
   `Artifact` tool. Give it a `favicon`, a name-like `<title>` (the site or project name,
   not "SEO Audit Report"), and a one-sentence `description`.
3. Also save `audit/<target>/<date>/report.md` — same content in markdown, so the
   findings survive outside the browser and can be diffed against the next audit.
4. Hand the user the URL.

`references/report-spec.md` has the required section order and what belongs in each. The
short version: a verdict the reader gets in ten seconds, then scored pillars, then
findings ordered by what to do first, then the evidence appendix.

Two things the page must do, because an audit that is not acted on was not worth running:

- **Every finding names its own fix and its own file or URL.** "Improve internal
  linking" is not a finding. "The blog template at `layouts/post.astro` emits no links
  to sibling posts — 47 posts are one click from nothing" is.
- **Separate what is broken from what is missing.** They are different jobs for the
  reader: one is repair, one is new work. Do not interleave them in a single list.

---

## Phase 5 · Re-audits

When the user comes back after fixes, run the same crawl into a new dated directory and
diff `findings.json` against the previous one. Lead the new Artifact with what changed —
closed, still open, newly appeared. A second audit that just repeats the first one, with
no acknowledgement of the work done in between, reads as if nobody looked.

---

## References

- `references/evidence.md` — collection recipes: crawl options, Chrome DevTools checks,
  framework-by-framework codebase greps, and what to ask the user for.
- `references/report-spec.md` — the pillars, the scoring formula, severity definitions,
  and the exact Artifact section order.

## Scripts

- `scripts/discover-skills.mjs` — rank local skills, search the eight sources, emit a plan.
- `scripts/install-skill.mjs` — stage, safety-scan, and install only what passes.
- `scripts/seo-crawl.mjs` — crawl a site and emit `site.json`, `pages.json`, `findings.json`.
