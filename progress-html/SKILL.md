---
name: progress-html
description: Build or update today's client-facing progress page at web/public/MM-DD-YYYY/progress.html (served as https://pickleballer.eunika.xyz/MM-DD-YYYY/progress.html), from the matching dated report under reports/<person>/YYYY/MM/DD-report.md. Asks whose report to publish, always loads the ui-ux-pro-max design skill before writing any markup and the unslop + em-dash writing skills before writing any prose (installing them first if they are missing), adds ONLY the sections not already on the page, never overwrites or drops what is already there, illustrates each new section with screenshots — numbered callouts only where there is something to press, clean crops everywhere else — uploads the result to the staging server with a checksum check, then goes round again: re-reads the report after every pass and publishes anything that has been appended since, stopping only on a lap that finds nothing new. Use when the user invokes /progress-html, or asks to publish, generate, update or add to the progress page / progress.html / the client update page for today.
---

# /progress-html — publish today's progress page

Turns a dated internal report into the page the client reads, and puts it on the
server. Additive by construction: the page grows through the day, across
sessions and across people, and **nothing already on it may be lost or
repeated**.

## The date is always TODAY

```sh
DATE=$(date +%m-%d-%Y)      # e.g. 08-13-2026   ← the folder name
YMD=$(date +%Y/%m)          # e.g. 2026/08      ← the report path
DD=$(date +%d)              # e.g. 13           ← the report filename
LONG=$(date "+%B %-d, %Y")  # e.g. August 13, 2026
WEEKDAY=$(date +%A)
```

Never hardcode a date, never infer one from the last folder in `web/public/`,
and never publish yesterday's date because yesterday's report is longer. If the
user explicitly names a different date, use theirs and say so.

| Thing | Path |
|---|---|
| Page (local) | `web/public/$DATE/progress.html` |
| Screenshots | `web/public/$DATE/shots/` |
| Page (live) | `https://pickleballer.eunika.xyz/$DATE/progress.html` |
| Page (server) | `/var/public/pickleballer.eunika.xyz/web/public/$DATE/progress.html` |
| Source report | `reports/<who>/$YMD/$DD-report.md` |

## Step 0 — load `ui-ux-pro-max` BEFORE any markup

**This page is UI, so it starts with the design skill, not with the HTML.** Load
it before Step 4 or Step 5 touches anything — a panel written first and
design-checked afterwards is a panel that gets rewritten.

```
Skill({ skill: "ui-ux-pro-max" })
```

- **Already on this machine** — `ls -d ~/.claude/skills/ui-ux-pro-max` → load it
  and carry on.
- **Missing** → install it, then load it. Try skills.sh
  (`npx skills add ui-ux-pro-max`), then skillsmp.com. Do not skip the install
  and do not substitute a different design skill while it is available.
- **Install genuinely fails** (offline, 404, gone from the registry) → say so in
  one line, then carry on using the design rules in the global `CLAUDE.md`. A
  failed install never stops the publish, and it is never retried twice in the
  same session.

What it is for on this page, specifically:

- **Layout** — spacing on the 4/8 scale, nothing under 12px, no two items
  touching each other or the edge of their card, and borders that are visible
  rather than hairline.
- **Type** — the three roles only (heading / sub-heading / body), 60–75ch line
  length in the panels, no centred walls of text.
- **Contrast** — WCAG AA on every caption, badge, chip and callout number,
  including the coral markers sitting on a screenshot.
- **Responsive** — the page read at 1440px **and** at 375px before it goes up.

**Do not invent a look.** `assets/page-template.html` and
`assets/panel-snippet.html` are this page's design system; the skill is how you
judge what you added to them, not a licence to restyle a page the client already
read this morning. A new panel that can be told apart from yesterday's is a bug.

## Step 0b — load `unslop` + `em-dash` BEFORE any prose

**The panels are writing, so they start with the writing skills, not with the
first sentence.** Load both alongside `ui-ux-pro-max` in Step 0, in one go:

```
Skill({ skill: "unslop" })
Skill({ skill: "em-dash" })
```

Add the one that matches what the panel actually contains:

| The panel is about | Also load |
|---|---|
| a long or dense explanation the client has to follow | `readable-content` |
| a button, error, empty state or toast the client will read on screen | `ux-writing` |
| a how-to, a setup guide or anything reference-shaped | `docs-writing` |

Same install ladder as Step 0: project `.claude/skills/` first, then
`~/.claude/skills/`, then skills.sh, then skillsmp.com. A failed install is one
line and the publish carries on.

What they are for on this page, specifically:

- **No em dashes and no en dashes in a panel.** A hyphen, a comma, a full stop
  or brackets instead. It is the loudest tell that a machine wrote the update,
  and the client reads this page.
- **No AI vocabulary.** crucial, delve, landscape, pivotal, showcase, testament,
  underscore, vibrant, "serves as", "it is important to note that", "not just X,
  it's Y". Plain words instead.
- **Sentence case in every panel title**, straight quotes, no decorative emoji,
  and no bold on every proper noun.
- **No forced rule of three.** Two things fixed is two bullets, not three.
- **Last pass before the upload is the `unslop` self-audit:** read the new
  panels and ask what in them is obviously AI written, then fix it. This happens
  before Step 6, never after the client has the URL.

The design skill judges how the panel looks. These judge how it reads. Both
happen before the upload.

## Step 1 — ask whose report

List the people who actually have a report for **today**, then ask. Do not guess,
and do not default to `ivan` just because it is usually him.

```sh
for d in reports/*/; do
  who=$(basename "$d")
  for v in "" "-ignore" "-local"; do
    f="reports/$who/$(date +%Y/%m)/$(date +%d)-report$v.md"
    [ -f "$f" ] && echo "$who  ->  $f  ($(wc -l < "$f") lines)"
  done
done
```

Ask with AskUserQuestion. One question, options = the people found.

- Found exactly one person → still confirm, one line, then proceed.
- Found nobody → say so plainly and stop. There is nothing to publish. Do not
  invent content, and do not fall back to an older date's report.
- Several variants exist for one person (`13-report.md`, `13-report-ignore.md`) →
  read **`DD-report.md`** by default. `-ignore` is internal and `-local` is
  undeployed work; only use those if the user asks.

## Step 2 — get the server's copy first

These pages are edited by more than one session in a day. The server is the
source of truth. **Pull before you touch anything.**

```sh
SFTP=.vscode/sftp.json   # host, user, password, remotePath live here
REMOTE=/var/public/pickleballer.eunika.xyz/web/public/$DATE/progress.html

sshpass -p '<pass>' ssh -o StrictHostKeyChecking=no <user>@<host> "test -f $REMOTE && echo EXISTS || echo NEW"
```

- **EXISTS** → `scp` it down over the local copy, then work on that. Even if the
  local file looks fine. A local copy that is one section behind is exactly how
  somebody else's work gets deleted.
- **NEW** → this is the first publish of the day. Build the page from
  `assets/page-template.html` (see step 5).

## Step 3 — work out what is genuinely new

```sh
python3 .claude/skills/progress-html/scripts/page_index.py web/public/$DATE/progress.html
```

It prints every section already published, the next section number, and the byte
offset to insert at.

Now read the report and split it into candidate sections — normally one per `##`
heading. For each candidate, decide: **is this already on the page?**

1. `data-report="<who>/<date>#<slug>"` on a section → published. Skip.
2. No stamp (every page up to 08-12-2026) → compare the `<h2>` text against the
   report heading, ignoring case, numbering and punctuation.
3. Close but not identical → **ask**. Publishing a duplicate to a client-facing
   page is worse than one clarifying question.

Then apply the content rule from the root `CLAUDE.md`, which outranks anything
here. A candidate is dropped, silently, if it is:

- not finished, not released, or not verified on staging;
- a decision being handed back (*"worth weighing"*, *"if you would rather"*);
- internal housekeeping — checksums, file syncing, local-vs-server drift,
  "27 files differed", whose copy was newer;
- an open item, a caveat, a "say the word and it gets fixed";
- work that has no screenshot and cannot get one.

A bug that was **fixed** is excellent material — that is the story of the fix,
and its card is `done`, never `warn`. There should be no `warn` cards at all.

Tell the user what you are about to publish and what you dropped, in one short
list, before you write anything.

## Step 4 — screenshots, with numbered callouts

**Every new section needs at least one screenshot**, taken from the live staging
site, showing the thing working. No screenshot, no section — leave it out rather
than apologise for it on the page.

Capture against the real hosts — PWA `https://pickleballer-pwa.eunika.xyz` at
430×932, website `https://pickleballer.eunika.xyz` at 1440×900 — using the
browser tools in the order set out in **"Browser tools"** at the bottom of this
file.

Save raw captures to `web/public/$DATE/shots/raw/`, then annotate into
`web/public/$DATE/shots/`. Raw files stay — they are what makes a wrong
coordinate a one-line fix instead of a re-shoot.

### Annotate ONLY where there is something to DO — the default is a clean shot

**A callout is for an action, not for a description.** Number something only when
the reader could put a finger on it and something would then happen — and the
caption's job is to say *what* happens: what opens, what changes, where it takes
them. If the number is only pointing at a thing and naming it, the picture
already did that, and the circle is noise sitting on top of the screen the client
is trying to read.

**Take the shot clean first.** Annotating is the exception you argue yourself
into, not the default you strip back. Ask, per marker: *"if they tapped exactly
here, what would happen?"* No answer → no marker.

| Annotate it | Leave it clean |
|---|---|
| A button, link, chip, tab, toggle, arrow or row that is **tappable** — say what it does: *"tap Remove — it asks Keep or Remove first"* | A **total, price, label, heading or count** — a number on a receipt is read, not pressed |
| A control whose **state** is the point — a badge counting filters, an arrow that turns down when a group opens | A **whole email or PDF** — nothing in it is clickable, so nothing in it takes a circle |
| **Where the action lands** — the screen, panel or list that appears after the tap | A card or list row shown only to prove **where you were** (scroll position, "the same card, in the same place") |
| The thing that used to be **wrong** and is now right, when the reader must press it to see that | A panel, banner or field shown only to say **what it now reads** |
| A control the client will **look for and not find** unless it is pointed at | Anything the `<figcaption>` sentence already makes obvious without a number |

**A figure with nothing actionable in it gets no markers, no boxes, no arrows —
just the cropped screenshot and a plain caption in sentences.** That is a
finished figure, not a lazy one. Two clean shots side by side (before / after)
carry a fix perfectly well with no ink on them at all.

**Mixed figures: number the action, not its neighbours.** If one of three things
in a shot is pressable, that is one marker — do not add two more to keep it
company. Numbering restarts at 1 in every figure, so a single lonely **1** is
correct and normal.

**Never re-number a caption you did not re-draw.** The numbers in the
`<figcaption>` and the circles in the PNG are one thing in two files — change the
spec, re-run `callout.py`, and rewrite the caption in the same edit.

When a figure *does* earn markers, the pattern to draw is an **annotated
screenshot with keyed callouts**: numbered circles on the image, arrows and
highlight boxes where they help, and the numbers explained in the `<figcaption>`
underneath — never inside the image, so the words stay readable on a phone and
can be translated.

```sh
python3 .claude/skills/progress-html/scripts/callout.py web/public/$DATE/shots/spec.json
```

A figure that needs no callouts still goes through the same script — give it a
`crop` and no `markers`, so every shot on the page is cropped, redacted and
scaled the same way:

```json
{ "src": "raw/receipt-fee.png", "out": "receipt-total-1.png", "crop": [160,330,1362,1360] }
```

`scripts/callout.py` documents the spec format at the top. Rules that matter:

- **Redact before you publish.** Customer names, GCash numbers and QR codes,
  account details, email addresses, tokens, anything in a URL bar that carries an
  id. Blur with an outline, not a black bar — the reader should still see that a
  number was there.
- **Crop for legibility.** A 1440px console screenshot placed in a 470px column
  renders at a third scale and nothing on it can be read. Crop to the part the
  section is about. Fewer pixels across = bigger text.
- **Callouts read left-to-right, top-to-bottom**, starting at 1 in every figure.
- **Three markers on one figure is already a lot.** If you are at four or five,
  most of them are describing rather than pointing — cut them back to the ones
  that can be pressed.
- **Blue for the normal path, coral for the thing that was wrong.**
- Check the result by opening it, not by trusting the coordinates.

## Step 5 — write the panels

`ui-ux-pro-max` is loaded by now (Step 0), and so are `unslop` and `em-dash`
(Step 0b). Judge every panel you write against all three — spacing, borders,
type roles and contrast from the first, punctuation and voice from the other
two — **before** the upload, not after the client has the URL.

Use `assets/panel-snippet.html` as the shape. One `<section class="panel">` per
piece of work, numbered on from `next_number`, each stamped:

```html
<section class="panel" data-report="ivan/08-13-2026#the-slug">
```

Writing style — this is the client, who does not know the system:

- Title is a short sentence they understand, not a commit message.
- Lead paragraph: what they can now do, or what was broken and now is not.
- No file names, no function names, no "endpoint", "refactor", "component".
- Peso amounts, screen names and button labels exactly as they appear on screen.
- No em dash and no en dash. Hyphen, comma, full stop or brackets instead.
- No AI vocabulary and no puffery. See the list in Step 0b.
- Sentence case titles, straight quotes, no decorative emoji, no bold on every
  proper noun.
- Run the `unslop` self-audit over the finished panels before Step 6.

**Brand-new page?** Build it first from `assets/page-template.html`, replacing
`{{LONG_DATE}}`, `{{WEEKDAY}}`, `{{PREV_DATE}}` (the most recent existing folder
in `web/public/`), `{{HERO_PARAGRAPHS}}` (2–4 `<p>` summarising the day) and
`{{PANELS}}`. Give the first panel `style="border-top:0;padding-top:0"`.

**Page already there?** Write only the new panels to a fragment file and splice:

```sh
python3 .claude/skills/progress-html/scripts/insert_panels.py \
    web/public/$DATE/progress.html /tmp/new-panels.html --dry-run
# then without --dry-run
```

`insert_panels.py` refuses to write if any existing section title would go
missing, if the file would shrink, if the closing markup would be lost, or if a
section is being published twice. It keeps a `.bak`. **Do not hand-edit the page
to add sections** — that is the operation that loses other people's work.

## Step 6 — upload and prove it landed

```sh
REMOTE_DIR=/var/public/pickleballer.eunika.xyz/web/public/$DATE
sshpass -p '<pass>' ssh <user>@<host> "mkdir -p $REMOTE_DIR/shots"
sshpass -p '<pass>' scp web/public/$DATE/progress.html <user>@<host>:$REMOTE_DIR/
sshpass -p '<pass>' scp -r web/public/$DATE/shots/*.png <user>@<host>:$REMOTE_DIR/shots/

# prove it, do not assume scp's silence means success
shasum -a 256 web/public/$DATE/progress.html
sshpass -p '<pass>' ssh <user>@<host> "sha256sum $REMOTE_DIR/progress.html"
```

**The served copy lives in `web/dist/`, not `web/public/`.** This is the step that
looks done and is not. `web/` is served from its Vite build, and `web/public/` is
only copied into `web/dist/` *by a build*. Upload to `web/public/` alone and the
page 404s into the app's own "Oops!" screen — which returns HTTP 200, so nothing
looks wrong. Mirror it, rather than running a build for a static page:

```sh
PUB=/var/public/pickleballer.eunika.xyz/web/public/$DATE
DIST=/var/public/pickleballer.eunika.xyz/web/dist/$DATE
sshpass -p '<pass>' ssh <user>@<host> "mkdir -p $DIST/shots \
    && cp $PUB/progress.html $DIST/progress.html && cp $PUB/shots/*.png $DIST/shots/"
```

Keep both copies: `web/public/` is the source that survives the next build,
`web/dist/` is what the client actually reads. Checksum both.

Checksums must match. No build and no pm2 restart — these are static files,
served as they are. Uploading a progress page never rides along inside an app
deploy.

**Prove it by title, not by status code.** A 200 means the app answered, not that
your page did:

```sh
curl -s https://pickleballer.eunika.xyz/$DATE/progress.html | grep -o "<title>[^<]*</title>"
# must read: PickleBallers — Progress update, <Month D, YYYY>
```

`shots/raw/` is working material; it does not need to go up, but it is harmless
if it does.

## Step 7 — read it as the client

Open `https://pickleballer.eunika.xyz/$DATE/progress.html` and actually look:

- every section that was there before is still there, and the new ones are at the
  bottom with correct numbers;
- every image loads — no broken icons, no missing `shots/` file;
- callout numbers on each image match the numbers in its caption, and every one
  of them sits on something that can be pressed — no circles on totals, labels
  or headings;
- nothing private is legible in any screenshot;
- the new panels sit on the same spacing, borders and type as the ones already
  there — nothing touching, nothing under 12px, no hairline card edges — checked
  at 1440px **and** at 375px, against what `ui-ux-pro-max` says;
- it reads top to bottom without once suggesting something is unfinished;
- the new panels carry no em dash, no en dash and none of the AI vocabulary in
  Step 0b, checked against `unslop`.

```sh
grep -iE 'say the word|left alone|not fixed|to follow|checksum|pulled back down|TODO|FIXME' \
     web/public/$DATE/progress.html

# em dash (U+2014) and en dash (U+2013) anywhere on the page
perl -CS -ne 'print "$.: $_" if /\x{2013}|\x{2014}/' web/public/$DATE/progress.html
```

Both must return nothing. If the second one only hits a panel somebody else
published earlier, leave it alone and fix your own lines only.

Then report: the URL, which sections were added, which were skipped and why, and
the checksum result.

## Step 8 — go round again: the report is still being written

**Finishing a pass is not finishing the job.** The report is a live file. While
you were shooting screenshots and uploading, its author was very likely still
working — and appending. A section that landed in the report ten minutes after
you read it is a section the client never sees, and nobody will notice, because
the page looks complete.

So the moment Step 7 comes back clean, **go back and read the report again**.

```sh
# the report you published from — read it fresh off disk, do not trust what you
# remember of it, and do not trust a variable you set an hour ago
wc -l reports/<who>/$YMD/$DD-report.md
shasum -a 256 reports/<who>/$YMD/$DD-report.md
python3 .claude/skills/progress-html/scripts/page_index.py web/public/$DATE/progress.html
```

Compare the report's `##` headings against what the page now carries, exactly as
in Step 3 — the `data-report` stamps are what make this cheap and reliable.

- **Something new that qualifies** → do not patch it in by hand. Go back to
  **Step 2** and run 2 → 7 again for the new sections only. Step 2 is not
  optional on a second lap: the server copy may have moved again while you were
  working, and skipping the pull is how you delete somebody else's afternoon.
- **Nothing new** → that, and only that, is the end. Say so in one line —
  *"round 2: report unchanged, nothing to add"* — and stop.

**Keep going round.** Two laps, five laps, however many it takes. Each lap is a
full lap: pull, work out what is new, screenshot it, splice, upload, checksum,
read it as the client. Never a shortcut on the grounds that "it is only one more
section".

### What does NOT restart the loop

A lap that finds nothing publishable must end the loop, or it never terminates.
These are not new work:

- A heading you already **dropped** in Step 3 — housekeeping, an open item, a
  decision handed back, a "left alone". It was dropped on purpose; it does not
  become new again on the next lap. Keep the dropped list from the first pass and
  check against it.
- Wording tightened in a section already on the page. Once published, a section
  is left as it is — see **Never**, below.
- A new heading that still has nothing finished under it. Not-yet-released work
  waits for the lap after it ships.

So the loop ends when a full lap turns up **no report heading that is both new
and publishable**. Not when the report stops changing — it may keep changing all
day.

### Say where each lap ended

Report the lap count in the final message: which sections went up on lap 1,
which on lap 2, and that the last lap found nothing. The client-facing page never
mentions laps — this is for the user, in the chat and in the `.md` report.

## Browser tools — work down the list, install only what you actually use

Screenshots and live testing go through a browser. Use these **in this order**,
and only move down when the one above genuinely cannot do the job.

**Do not install all of these.** Only the one you have reached and need, and
only when it is missing. Most jobs never leave rung 1.

| # | Tool | State right now |
|---|---|---|
| 1 | **chrome-devtools MCP** — `mcp__chrome-devtools__*` | Installed. Start here. |
| 2 | **playwright-mcp** — `mcp__playwright__*` | Not installed. Install **only** if you reach it and need it. |
| 3 | **Playwright CLI** — `npx playwright` | Installed (1.62.1). 27 specs already in `api/e2e/`. |
| 4 | **Headless Chrome** — `--screenshot` / `--print-to-pdf` | Installed. Last resort, no interaction. |

### The rule about moving down

**Never install anything up front.** Do not set up the whole list "so it is
ready". Rung 1 is installed already, and for most jobs you will never leave it —
installing the rest would be work nobody asked for.

Install **only** when all three are true: you have actually reached that rung,
you actually need it now, and it is missing. That is the only case.

The decision at each rung:

1. Does it work? → use it. **Stop.** Do not look at the rest of the list.
2. Is the *only* problem that it is missing, and you need it now? →
   **install it**, then back to 1.
3. Cannot be installed, or still broken after installing? → say what failed in
   one line, drop one rung.

So "not installed" is not a reason to skip a rung you have reached — but it is
also not a reason to install a rung you have not reached. Never silently fall
through the whole list: if you end up on rung 3 or 4, say which tools failed and
why, because a broken chrome-devtools MCP is worth knowing about on its own.

### 1 · chrome-devtools MCP — the default

Already configured. Best for this repo: real Chrome, a real session, and
`take_screenshot` / `navigate_page` / `click` / `fill` / `evaluate_script` /
`resize_page` are all you normally need.

```
mcp__chrome-devtools__new_page          open a tab (isolatedContext for a 2nd login)
mcp__chrome-devtools__resize_page       430x932 for the PWA, 1440x900 for the website
mcp__chrome-devtools__take_snapshot     the a11y tree — get uids before clicking
mcp__chrome-devtools__take_screenshot   filePath + fullPage
mcp__chrome-devtools__evaluate_script   when a click needs a real DOM query
```

Two things that come up constantly here:

- The PWA and the website are **separate origins**, so signing in on one does
  not sign you in on the other. Log in twice.
- To be two people at once (owner and player), open the second one with
  `isolatedContext: "owner"` — separate cookies, same browser.

### 2 · playwright-mcp — install it, don't skip it

If chrome-devtools MCP is unavailable, hanging, or cannot do what is needed,
**install playwright-mcp and carry on**:

```sh
claude mcp add playwright -- npx @playwright/mcp@latest
```

Then `/mcp` to confirm it connected, and use `mcp__playwright__*`. If the add
command fails, or it will not connect after one retry, say so and drop to #3.

### 3 · Playwright CLI — scripted, repeatable

Already installed, and the repo has 27 specs in `api/e2e/` to copy from. Best
when the same flow has to run several times, or when a run needs to be handed to
somebody else.

```sh
npx playwright test api/e2e/<name>.spec.ts --headed      # watch it
npx playwright screenshot --viewport-size=430,932 <url> shot.png
```

If the browsers are missing (`Executable doesn't exist`), that is the
"install it" case, not the "move on" case:

```sh
npx playwright install chromium
```

### 4 · Headless Chrome — last resort

No interaction, no login, just a picture of a public page. Fine for a static
page or for rendering HTML to PDF; useless for anything behind a sign-in.

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --window-size=1440,900 --screenshot=shot.png --virtual-time-budget=15000 "<url>"
```

### If every rung fails

Stop and say so plainly, with the error from each. Do **not** carry on and write
up work you could not see, and do not describe a screen you never opened. A
section with no screenshot does not get published.

## Never

- **Never write or restyle a single line of markup without `ui-ux-pro-max`
  loaded** (Step 0). Install it if it is missing; only an install that actually
  failed excuses carrying on without it, and that gets said out loud.
- **Never write a sentence of panel prose without `unslop` and `em-dash` loaded**
  (Step 0b). Same rule: install them, and only a genuine install failure excuses
  carrying on without them.
- **Never put an em dash or an en dash in a panel you wrote.** Hyphen, comma,
  full stop or brackets. It is the loudest sign the client is reading machine
  output.
- **Never overwrite the page.** Pull, splice, upload.
- **Never re-publish a section** that is already on the page.
- **Never put an unfinished item, an open question, or file/deploy housekeeping
  on the page.** Those live in the `.md` report, which is the other half of the
  pair — the HTML page is its client-facing subset, never a paste of it.
- **Never publish a section with no screenshot**, and never write "screenshot to
  follow".
- **Never put a callout on something that cannot be pressed.** A number on a
  total, a heading, a label or a receipt line is decoration — crop the shot and
  let the caption say it in a sentence.
- **Never leave a customer name, account number or QR unblurred.**
- Never renumber or reword sections somebody else published earlier in the day.
- **Never stop after one pass.** Uploading is not the end — re-read the report
  (Step 8) and go round again. The job ends on a lap that finds nothing new to
  publish, never on the lap that happened to be the first.