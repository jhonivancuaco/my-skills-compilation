# The report: pillars, scoring, and the Artifact

1. [The nine pillars](#the-nine-pillars)
2. [Severity](#severity)
3. [Scoring](#scoring)
4. [Artifact structure](#artifact-structure)
5. [Writing a finding](#writing-a-finding)

---

## The nine pillars

Every audit covers all nine, even when the answer for one is "nothing wrong here" — a
pillar silently dropped reads as a pillar not checked.

| # | Pillar | What it answers | Main evidence |
|---|---|---|---|
| 1 | **Crawlability** | Can search engines reach the pages at all? | robots.txt, sitemaps, 4xx/5xx, redirect chains, host duplication, HTTP→HTTPS |
| 2 | **Indexation** | Of the pages they reach, which are allowed to rank? | noindex, canonicals, `x-robots-tag`, parameter and pagination duplicates |
| 3 | **Architecture** | Does link structure lead crawlers and people to what matters? | click depth, orphan pages, internal link counts, breadcrumbs, anchor text |
| 4 | **On-page** | Does each page state clearly what it is? | titles, meta descriptions, H1/H2 structure, image alt, Open Graph |
| 5 | **Content** | Is there enough substance, and does it match search intent? | word counts, duplication, thin/near-empty pages, coverage against target queries |
| 6 | **Structured data** | Can the page win an enhanced result? | JSON-LD presence, types, validity, required properties per type |
| 7 | **Performance** | Is it fast enough to keep the visit? | Core Web Vitals (lab), TTFB, document size, compression, caching, render-blocking |
| 8 | **Mobile & accessibility** | Does it work on the device most people use, for everyone? | viewport, tap targets, overflow, contrast, semantics, alt text, keyboard order |
| 9 | **Measurement** | Would they even know if it worked? | Search Console, analytics, conversion tracking, event coverage |

International SEO (hreflang, locale URLs, per-locale canonicals) folds into pillars 2
and 4 for a single-language site. Give it its own section only when the site is actually
multilingual — otherwise it is a paragraph saying it does not apply.

---

## Severity

Severity is about consequence, not effort. A one-character fix can be critical.

| Severity | Test | Examples |
|---|---|---|
| **critical** | Pages cannot rank at all, or the site is losing money right now | Site-wide `noindex`; robots.txt disallowing everything; canonicals pointing at another domain; the main template returning 5xx |
| **high** | Real, measurable ranking or traffic loss on pages that matter | No sitemap; duplicate titles across a whole template; broken internal links; LCP over 4s on the landing template |
| **medium** | A missed opportunity, or a problem that compounds | No structured data; meta descriptions missing; thin category pages; images without alt |
| **low** | Polish; worth doing, not worth a meeting | Title 4 characters over; missing Open Graph image; no HSTS header |

Two rules that keep severity honest:

**Consequence is site-specific.** Missing product schema is `medium` on a blog and `high`
on a shop. Rate against this site, not against a generic list.

**Do not inflate.** If everything is critical, nothing is, and the reader stops reading.
A real audit is usually shaped like a pyramid — one or two criticals, a handful of highs,
a long tail below.

---

## Scoring

Each pillar gets a 0–100 score. It exists so the reader can see shape at a glance and so
a re-audit can show movement — it is not a precise instrument, and the report should not
pretend otherwise.

Start each pillar at 100 and deduct per distinct finding in it:

| Severity | Deduction |
|---|---|
| critical | 40 |
| high | 20 |
| medium | 8 |
| low | 3 |

Floor at 0. **Deduct per distinct finding, not per affected page** — 300 pages missing a
meta description is one template-level finding, so it costs 8, not 2400. The page count
belongs in the finding's description, where it argues for priority.

The overall score is the mean of the nine, rounded. Show it with the pillar breakdown
beside it, never alone — a bare "62/100" tells the reader nothing about what to do on
Monday.

When a pillar could not be assessed (no analytics access, JS-only rendering you could
not check), score it `n/a` and say why. An invented score is worse than a gap.

---

## Artifact structure

Load `artifact-design` before writing any of this, and `dataviz` if there are charts.
Section order is fixed, because the reader's questions arrive in this order.

**1 · Verdict** — the top of the page, readable in ten seconds. The overall score, the
pillar scores, counts by severity, and two or three sentences of plain-language summary:
what is wrong, what it costs, what to do first. Someone who reads only this section
should be able to make a decision.

**2 · Do these first** — the top 5–10 findings by impact ÷ effort, as a ranked list with
the fix and an effort estimate on each. This is the section that gets acted on, and for
many readers it is the only one.

**3 · Pillar by pillar** — all nine, each with its score, what was measured, findings in
severity order, and what a good version looks like. Within each pillar keep **broken**
and **missing** apart: repair and new work are different jobs, done by different people
at different times, and interleaving them makes both harder to plan.

**4 · What was measured** — scope of the crawl (pages, depth, date), which tools ran,
which specialist skills were loaded, and **what could not be checked and why**. Stating
the blind spots is what makes the rest credible.

**5 · Evidence appendix** — the tables the findings came from: crawled pages with status
and title, duplicate groups, Core Web Vitals per template. Collapsed by default; a wide
table scrolls inside its own container so the page body never scrolls sideways.

Page requirements, in short: a name-like `<title>` (the site or project, not "SEO Audit
Report"), a `favicon`, theme-aware colours defined on bare `:root` and re-declared for
dark, and no external assets. `artifact-design` covers the rest — follow it rather than
this summary where they differ.

---

## Writing a finding

A finding is not a rule that was broken. It is a specific thing on this site, what it
costs, and what to do about it. Four parts, every time:

> **Every product page shares the title "Acme Store"** · high · on-page
>
> All 218 product pages emit the same `<title>`, so Google has nothing to tell them apart
> in results and none of them can rank for a product name. The template at
> `app/products/[slug]/page.tsx:12` returns a static `metadata` object.
>
> **Fix:** switch to `generateMetadata` and interpolate the product name and category.
> ~30 minutes, one file.

What that shape gets right: it names the thing, quantifies the scope (218 pages), states
the consequence in the site's own terms, points at the exact file, and gives a fix with
an effort estimate. Strip any one of those and the reader has to do work you already did.

What to avoid:

- **Restating the rule.** "Titles should be unique and under 60 characters" is not a
  finding — it is a fact the reader can look up.
- **Counting instead of explaining.** "218 issues found" is a number, not information.
- **Findings with no fix.** If you cannot say what to do, say that explicitly and say
  what would need investigating — do not leave it hanging.
- **Padding with things that are fine.** A finding about a missing Open Graph image on a
  site that cannot be crawled at all is noise standing between the reader and the thing
  that matters.
