# Global rules (all projects)

## ALWAYS report the progress percentage — every task, every update
Every task must state how far along it is, as a percentage, so it's visible how
much is done and how close it is to finishing.

- **Lead with it.** Start every progress update and the final message with the
  overall percentage — e.g. `**Progress: 40%**` — before the details.
- **Every message during a task**, not just the last one: after each meaningful
  step (a file edited, a build finished, a deploy pushed, a check verified),
  say the new percentage. Don't go silent through a long task.
- **It's the whole task, not the current step.** 3 of 5 files edited but the
  build and deploy still pending is not 60% — weigh the remaining work.
- **100% only when everything is finished and verified.** If anything is left
  unfinished, blocked, or unverified, report the real number (e.g. 85%) and say
  in one line what the remaining % is.
- Applies to every project, every agent and subagent, and to small one-liners
  too — a trivial task just goes straight to `**Progress: 100%**`.
- **Read-only work counts too.** Reading a file, a grep/search, a `ls`, a
  `git status`, a curl, any bash command done as part of a task — it still gets
  a percentage. "Nothing was changed" is not a reason to skip it.
  (Report-writing is the only thing that skips on no-change.) The **only** thing
  that skips the percentage entirely is a pure question — see the exception at
  the end of this section.
- **After EVERY tool run — Read, Bash, Grep, and Edit/Write just the same.**
  Editing is not exempt: an Edit applied, a Write, a file created or deleted —
  say the new percentage right after. The next thing said to the user always
  leads with the current percentage.
- **No silent streaks while editing.** Don't run five Edits and a build in a row
  saying nothing and only give a percentage at the very end. Mid-edit is exactly
  where it's needed — e.g. `**Progress: 45%** — 3 of 7 files edited, build and
  deploy still to go.` Say it as you go, not once at the finish.
- **A one-shot read or command that is part of a task is `**Progress: 100%**`**
  — do it, lead with 100%, done. Don't invent stages to pad it out.
- **No message without a percentage.** If in doubt, put one. A message that
  reports, asks or explains a piece of work always opens with `**Progress: N%**`.

### ⛔ THE ONE EXCEPTION — puro tanong lang gets NO percentage
**When the user only asked something and nothing in any project was changed,
do NOT open with a percentage at all.** Just answer. A percentage on a plain
answer is noise — there is no task to be a fraction of.

- Covers every kind of question: *"ano to?"*, *"bakit ganito?"*, *"tama ba?"*,
  *"anong ilalagay ko?"*, *"how does X work?"*, *"which one is better?"*,
  and the same asked in English, Tagalog or Taglish.
- **Still no percentage even if you ran commands to answer it** — a `cat`, a
  `grep`, a `curl`, a `git log`. Reading in order to answer is not a task.
- **Still no percentage on a follow-up question** about work already finished.
- **The percentage comes STRAIGHT BACK the moment there is work**: an edit, a
  file written, a build, a deploy, a commit — or a question that carries an
  order with it (*"bakit ganito, ayusin mo"*). That is a task, and every task
  reports its percentage exactly as the rest of this section says.
- **If any task in the session is still open, the percentage stays** — even on
  a question. There is real work outstanding and it must remain visible.

The test in one line: **did I change anything, or is anything still owed?**
No to both → answer plainly, no percentage. Yes to either → percentage leads.

## SFTP/scp deploy — the full order of work, start to finish
**Applies ONLY when the workspace is an SFTP/scp one** — files live on a server
and are moved by copy, with no git in the loop. If the project deploys through
git (or doesn't deploy to a server at all), this whole section does not apply;
ignore it.

In an SFTP workspace, work ALWAYS runs in this order. None of the steps are
optional, and the job is not done until the last one:

1. **Download the file you need first** — pull the current copy from the server
   before touching anything, so you're editing what is actually live.
2. **Edit locally** — never edit straight on the server.
3. **Test locally if you can** — before anything gets uploaded.
4. **Check the diff against the server** right before uploading.
5. **Merge if the server has changes** that your upload would bury. Never
   overwrite work that only exists on the server.
6. **Upload the edited files to the server** — only after steps 4 and 5, never
   before.
7. **Connect to the server.**
8. **Build — but only if that project needs a build.** (A Vite DEV server picks
   changes up on its own and needs no build.)
9. **Restart only what actually has to restart.** Use common sense: if it's a
   Node app under pm2, restart the pm2 process — don't go poking at Apache.
10. **Check it works on the server** — open it, confirm nothing is broken.

Never end a deploy at the upload, and never end it at the restart either —
step 10 is part of the task.

### DEPLOY AUTOMATICALLY — never wait to be told, never ask permission
**Sa isang SFTP project, LAHAT ng trabaho ay ginagawa sa LOCAL muna.** Doon
ini-edit, doon pinapatakbo, at doon sinisiguro na gumagana ang lahat — bago pa
maisip ang server. Tapos ay **diretso na ang deploy**, nang hindi hinihintay ang
utos: ang deploy ay huling hakbang ng parehong task, hindi hiwalay na pabor na
hihingin pa.

Ang buong daan sa isang linya: **gawin sa local → siguraduhing working →
diretsong deploy sa server.**

- **Local ang lahat ng edit.** Walang inieedit ng diretso sa server; ang server
  ay tumatanggap ng file, hindi ng pag-edit. (Steps 1–3 sa itaas.)
- **Siguraduhing working BAGO mag-upload.** Hindi umaakyat ang isang bagay na
  hindi pa napatakbo o hindi pa napatunayan sa local. Ang deploy ay hindi ang
  paraan para malaman kung tama ang code — ito ang paglipat ng bagay na tama na.
- **Pagkatapos, deploy agad — walang tanong.** ⛔ **Never ask "shall I deploy?"**
  and never end a turn with the work sitting on the local machine "ready to
  deploy". A change that is not on the server is an unfinished task, however
  clean the code is.
- ⛔ **Never treat "he didn't say deploy" as a reason to stop.** The ask "fix X"
  in an SFTP workspace means "fix X **and put it live**". That is the default,
  and it does not need to be repeated every time.
- **The report question is NOT the end of the job.** Deploy first, then ask about
  the report. Asking about the report while the work is still local is the wrong
  order.
- **Blocked ≠ done.** If something genuinely stops the deploy (no SSH access,
  a rejected key, the server down), say so **loudly and immediately** — in that
  turn, not at the end of a long summary — name the exact error, say precisely
  what is needed to unblock it, and keep the percentage below 100%. Then, the
  moment it is unblocked, deploy without being asked again.

**The ONE exception — kapag sinabi ni Ivan na sa local lang muna.** Kung sinabi
niyang hawak sa local ang session (hal. *"local muna"*, *"wag mo munang
i-deploy"*, *"hold it local"*, *"don't push it live yet"*), then **nothing** from
that session goes to the server: no upload, no build, no restart. Ang trabaho ay
tinatapos at sinusubok pa rin sa local — hindi ito hindi-paggawa, hindi lang ito
umaakyat. That instruction covers the WHOLE session, not just the task in hand,
and it stays in force until the user lifts it — a later task in the same session
does not quietly go back to auto-deploying. Say in the final message that the
work is finished locally and still waiting to be deployed, and write it up in the
`-local` report variant.

## SFTP projects — check local files are updated BEFORE editing
When a project deploys over SFTP/scp (no git), the server copy is the source of truth and may be newer than the local copy (edited on the server directly, or by another session/person). Before editing any local file in an SFTP project:
1. Check first if the local copy is up to date vs the remote server (e.g. diff against `ssh cat` of the remote file, or compare checksums)
2. If the remote is newer or different, DOWNLOAD the remote file first (scp remote → local), then apply the edits on top of that fresh copy

Never edit a stale local file — pushing edits made on an outdated copy silently overwrites changes that only exist on the server.

## Work that CHANGED something gets a report md — ask ONLY at the very END
Work that actually changed something in a project — edits applied, a fix
shipped, a deploy done — gets written up as a markdown report in the project's
own `reports/` dir at the repo root.

**Use common sense about when NOT to ask.** If nothing in the project was
changed, there is nothing to report — do not ask, just skip it silently:
- a question answered, an explanation given,
- a check / look / investigation with no edit made,
- a plan, proposal or estimate drawn up but not carried out,
- a search, a listing, a status read,
- **markdown-only work** — creating, editing or deleting `.md` files and
  nothing else (notes, plans, docs, rule files, the reports themselves).
  Writing about the work is not the work.
- **git-only work — commit and/or push on its own.** When the whole ask is
  "commit and push" / "commit this" / "push it" and no file was edited to get
  there, do NOT ask about a report — skip it silently. Committing is recording
  work that already existed; the change was made earlier, not by the commit.
  Same for the rest of plain version-control work: staging, a branch made or
  switched, a merge or rebase, a tag, a revert, a pull. It still gets its
  progress percentage and the usual verification (confirm the push actually
  landed on the remote) — it just never gets the report question.
  **The moment an edit is part of it, the exception is off:** "fix the login
  bug then commit and push" changed a file, so it asks at the very end as
  normal. The test is whether YOU edited something this session, not whether
  the commit's diff is large.
- **rule at skill housekeeping** — ang pag-mirror ng bagong rule sa
  `~/.claude/skills/global-rules/CLAUDE.md`, ang pag-install ng bagong skill, at
  ang commit/push sa `~/.claude/skills`. Kahit may ibang trabahong nangyari sa
  parehong session at may report na isusulat, **ang bahaging ito ay hindi
  kailanman pumapasok doon** — tingnan ang *Bawat bagong rule at bawat bagong
  skill ay naco-commit* sa dulo ng file.

If in doubt, the test is simple: **did anything other than a `.md` file change
in the project?** No → skip the question entirely. Yes → ask at the very end.

**The user's own ask always wins.** When the question was skipped but the user
wants it reported anyway (e.g. it was only a plan, but they want the plan on
record), they will simply say to add it to the report — then write it straight
away, no question asked. If they didn't say which file, ask only that: the real
report or the `-ignore` one.

When it does apply:

- Path: `<project_root>/reports/ivan/YYYY/MM/DD-report.md` (today's date) —
  nested by person, then year, then zero-padded month, and the filename is
  just the day. The person is the directory, so it is NOT repeated in the
  filename (`ivan/2026/08/07-report.md`, never `07-Ivan-report.md`).
  Other people get sibling trees (`reports/edu/2026/08/07-report.md`).
  Create the `YYYY/MM/` dirs if they don't exist yet.
- **WHEN TO ASK: at the very END, after ALL the work is finished** — every edit
  applied, every deploy/build/restart done, everything verified. The report
  question is the LAST thing in the task, right before the final message.
  - ⛔ NEVER ask in the middle of the work, not at the start, not between
    steps, not while something is still running or unverified. Do not pause
    progress to ask. Finish 100% of the task first, then ask.
  - If the task turns out to have several parts, still only ask once, at the
    end of all of them.
- **SHOW THE LIST FIRST — bullet the tasks, THEN ask where they go.** Right
  before the question, print a short bulleted list of the work that would be
  written up, so it is visible exactly what is being filed before choosing the
  file.
  - One bullet per task or per change: what was changed, and where.
  - Plain words, one short line each — 3–8 bullets. If a session really had
    more, group them under short headings, still bullets underneath.
  - Only work that actually changed something goes on the list. The skipped
    kinds above (a question answered, a plan not carried out, markdown-only
    work, git-only work) are never listed.
  - **The list and the question are ONE message — list first, question after.**
    Never ask blind, and never write the report without having shown the list.
- **ALWAYS ASK** — never write the report without asking which file it goes in.
  Offer all four options every time:
  - `reports/ivan/YYYY/MM/DD-report.md` — the real/client-facing report,
  - `reports/ivan/YYYY/MM/DD-report-ignore.md` — the internal/ignored one,
  - `reports/ivan/YYYY/MM/DD-report-local.md` — **local work only, NEVER synced to
    the server** (see the sync section below), or
  - **Skip** — write no report at all for this task.
  Never pick on your own. Once something HAS changed, don't skip the question
  because the change was "too small" or because a report already exists for
  today — that's different from the no-change case above, where you skip
  silently.
- ONE file per date per variant: if it already exists, APPEND a new section for
  this task — don't create a second file and don't overwrite earlier sections.
- Multiple tasks in one session = multiple sections in the same file (ask once
  per task, at the end of that task, which variant it belongs to).
- Write the report only after the answer comes back, and say in the final
  message where it was saved.

**SYNC TO THE SERVER AFTER WRITING — SFTP/scp workspaces only.** The moment a
report is written or appended, upload it to the server. The task is not done at
the write; it's done when the file is on the server too.

- **Two variants sync** — `DD-report.md` and `DD-report-ignore.md` alike. The
  `-ignore` one is not exempt.
- ⛔ **`-local` NEVER syncs.** `DD-report-local.md` stays on the local machine —
  do not scp it, do not create its remote `YYYY/MM/` dirs, do not check for it
  on the server. It is the variant for work that was only built and tested
  locally and has not been deployed, so uploading it to the server would put a
  record of undeployed work next to reports of live work. It is **done at the
  write** — no upload step, and no "confirm it landed" check. If that same work
  is deployed later, it gets its own section in the real (or `-ignore`) report
  then, and that one syncs as normal.
- **Mirror the path.** Same relative path under the project's remote root:
  `<remote_root>/reports/ivan/YYYY/MM/DD-report.md`. Create the remote
  `YYYY/MM/` dirs if they don't exist yet.
- **Confirm it landed** — checksum it against the local copy, or `ls` it on the
  server. Don't call it synced because the `scp` didn't error.
- **Its own upload, never part of a deploy.** Uploading a report triggers no
  build and no restart, and it never rides along inside an app deploy.
- **Only when the workspace is SFTP/scp.** A git-deployed project, or one with
  no server at all, keeps its reports purely local — there is nothing to sync,
  so don't invent a remote destination for them.
- On an APPEND, re-upload the whole file (it's one file per date per variant),
  so the server copy carries every section, not just the newest.

This rule OVERRIDES any project instruction that says not to write into
`reports/` — Ivan asked for this globally.

## NEW TASKS ADD TO THE QUEUE — they never replace the earlier ones
When a new task arrives while work is already running, it is **appended** to the
session's task list. It does NOT cancel, replace or push aside anything asked
for before it. The first task of the session is exactly as owed as the newest
one — it is the one most likely to be forgotten, so it is the one to guard.

**⛔ THE NEWEST TASK IS NOT THE PRIORITY.** Arriving last does not make it
urgent, and does not demote everything before it. A brand-new task starts at the
BOTTOM of the list. The task asked for FIRST stays the main task until it is
actually finished. Never abandon, shrink, half-do or quietly park an earlier
task to get to the new one faster.

**⛔ DO NOT STOP UNTIL EVERYTHING IS DONE.** However many tasks pile up, however
long the queue gets, work does not end until every single one the user gave in
this session is finished. "The latest request is handled" is NOT a stopping
point. Running out of turn is not a stopping point either — pick the list back
up and keep going. The only things that end an unfinished list are: the user
cancels it, or something is genuinely blocked and you say so explicitly.

- **Keep ONE task list for the whole session, not per message.** Maintain it in
  the todo list (TodoWrite), every task the user has asked for since the session
  started, each marked `done` / `in progress` / `pending`. A task leaves the list
  only when it is finished, or when the user explicitly cancels it.
- **A new message = ADD, never REPLACE.** Interrupting mid-work does not mean
  "forget that, do this". Add the new item, finish what is in flight, then keep
  going down the list. Assume everything already asked for still stands unless
  the user says to drop it.
- **Order: first asked, first done.** Work the list top-down — oldest open task
  first, always. Recency is not priority. Jump the queue ONLY when the user
  literally says urgent / do this first, or the new task blocks an older one —
  and say in one line why you reordered. Anything else keeps its place.
- **Finish what's in flight, don't drop it.** A new message arriving mid-work
  does not stop the current task. Complete it (or reach a clean point and say
  where it stands), then continue down the list — new item last.
- **A long queue is not permission to skim.** Ten tasks means ten tasks done
  properly, not ten rushed or the first ones summarised away. Don't merge,
  batch away or "assume already covered" an earlier task — do it.
- **Restate the full list in progress updates.** Not just the step in hand:
  e.g. `**Progress: 45%** — task 1 done, task 2 in progress, task 3 pending.`
  So it is visible that nothing dropped off.
- **A new task just gets ticked onto the existing list.** It's an extra checkbox
  on the same session list — not a new list, not a fresh start. The finished
  items stay ticked; the new one goes in unticked at the bottom.
- **The percentage covers ALL open tasks, not the newest one.** Three tasks with
  one finished is ~33%, not 100%. Adding a fourth task mid-session lowers the
  percentage — that's correct, don't hide it by re-basing on the latest task.
- **Adding a task RE-BASES the percentage downward — say the new, lower number.**
  Don't keep quoting the old figure and don't jump back to 100% because the
  newest item is quick. At 80% with two of three done, a fourth task might drop
  it to ~60% — report the 60%.
- **Weight it by size, not by headcount.** The drop depends on how much work the
  queued item actually is. A one-line tweak added to three heavy tasks barely
  moves it (90% → ~87%); a whole new feature added to three small ones cuts it
  hard (90% → ~40%). Estimate honestly: an easy, fast task is a small slice, a
  big one is a big slice — never split the bar evenly just because it's tidier.
- **NEVER end the turn with a pending task.** Do not stop after finishing the
  newest task while an earlier one is still open. Before the final message,
  re-read the list top to bottom and confirm every item is done, and if any
  isn't, keep working — go straight back to the oldest open one, no waiting to
  be reminded. Say `**Progress: 100%**` only when every task in the session's
  list is finished — not just the last one mentioned.
- **Re-read the list at the START of every turn too**, not only at the end. If
  the user's newest message doesn't cancel anything, the old items are still
  live work — do them in the same turn, after the new one is queued.
- **If a task can't be done, say it out loud.** Blocked, unclear or refused
  still gets named in the final message with the reason. Silence is what makes
  a task look forgotten.
- **Applies to subagents too.** When work is delegated, hand over the relevant
  tasks in full; a subagent finishing its slice is not the session's list done.

### Final sweep — re-read the WHOLE session before saying it's finished
"Done" is a claim about the entire session, so before making it, go back and
check the entire session. Not the last message, not the current task — all of it,
from the very first thing asked.

- **Re-read every user message in the session, oldest first**, and pull out
  every single thing that was asked for: main tasks, side asks, "and also…",
  "pati yung…", one-line corrections, preferences stated in passing, things
  mentioned once and never brought up again. Every one of them is work owed.
- **Match each one against what was actually delivered.** Was it done, or only
  planned / discussed / partly done? Half-done counts as NOT done.
- **Anything missed, skipped, forgotten or left half-finished gets FIXED NOW** —
  in the same session, before the final message. Do not report it as a
  limitation, do not defer it to "next time", do not just apologise for it. Go
  back and finish it, then re-verify.
- **Check the small stuff too** — an edit that never got applied, a file written
  but not deployed, a check that was promised but never run, a follow-up
  question of yours the user answered and you never acted on, a rule the user
  gave mid-session that later work stopped following.
- **Verify, don't assume.** Confirm the change is really in the file / really on
  the server / really renders, rather than trusting that a tool call earlier
  must have worked.
- **Only after that sweep comes back clean** may you say it's finished and
  report `**Progress: 100%**`. If the sweep turns up work, the percentage goes
  back DOWN and the work resumes — say the honest new number.
- **If something genuinely can't be finished**, name it explicitly in the final
  message with the reason and what's left — never let it pass silently as done.

## 🔴 DESIGN WORK AUTO-LOADS `ui-ux-pro-max` — hindi tinatanong
**Anumang design na gagalawin ay nagsisimula sa pag-load ng `ui-ux-pro-max`** —
bago ang unang linya ng markup, at hindi pagkatapos:

```
Skill({ skill: "ui-ux-pro-max" })
```

**Kailan ito nag-fire:** kahit anong UI o visual na trabaho — bagong screen,
page, component, modal, email, PDF — at ganoon din kapag may **inaayos o
binabago** sa design na nandiyan na. Hindi ito tinatanong, hindi ito lumalabas
sa tickbox, at hindi ito hinihintay na hilingin.

**Kung wala ito sa machine, kunin ito** — tahimik, walang tanong: maghanap ng
open-source (skills.sh, skillsmp.com) o sa isang GitHub repo, i-install, tapos
i-load. Kung bigo ang install o wala na talaga ang pinanggalingan, sabihin sa
**isang linya** at ituloy ang trabaho nang wala nito — hindi ito dahilan para
ihinto o ipagpaliban ang task.

- **Doon galing ang mga sagot, hindi sa hula** — spacing, touch target,
  contrast, typography, layout, palette: nasa loob ng skill ang searchable na
  data para diyan. Huwag manghula kung may mababasa.
- **Pwede ang mas bagay na skill kung meron** (`frontend-design`,
  `web-design-guidelines`, `tailwind-design-system`) — basta may na-load na
  design skill bago magsimula. Pero `ui-ux-pro-max` ang default.
- **Huwag mag-install kung meron nang kayang gumawa ng trabaho** — gamitin ang
  nandiyan na. (DRY — tingnan ang *How the work is done* sa ibaba.)
- **Isang linya lang ang sasabihin tungkol dito** — hal. `+ ui-ux-pro-max`.
  Huwag ipaliwanag, huwag gawing sariling talata.
- **Ang design system ng project ang panalo.** Kung may sariling tokens,
  components o design section sa `CLAUDE.md` ang repo, iyon ang sundin — ang
  skill ang nagbibigay ng pamantayan, hindi ng palette.

## Stay on task — no extras
Do ONLY what the task asks. No unrelated work: no unprompted refactors, side fixes, extra explorations, or "while I'm here" improvements. Off-task thinking and work is slow and burns too many tokens. Before reading files, searching, or editing, check the action is directly needed for the current task; skip broad exploration when the target is already known. If something unrelated looks worth fixing, mention it in one sentence at the end instead of doing it.

## How the work is done — focused, agile, DRY, no over-engineering
These four are one habit: **the smallest correct thing that fully does the job.**

- **Focus — only the task, never a side job.** One task at a time, and nothing
  beside it. No unprompted refactor, no "while I'm here" cleanup, no tidying a
  file you only opened to read. If it is not needed to finish what was asked,
  it does not get done — mention it in one line at the end instead.
  (The full rule is *Stay on task — no extras* above; this is the same rule.)
- **Agile — ship a small working slice, then the next.** Do the thing that works
  end-to-end first, verify it, move on. No big-bang rewrites, no half-built
  scaffolding left behind, no "phase 2" that never lands. Every step leaves the
  project in a working state.
- **DRY — never write a second version of something that exists.** Look for the
  existing component, helper, token, style or endpoint FIRST and reuse it. If it
  almost fits, extend it; do not fork a lookalike. Copy-paste with two lines
  changed is the bug this rule exists to stop.
- **Don't overthink.** Take the obvious solution. No listing three options when
  one is clearly right, no exploring the whole repo for a one-file change, no
  long deliberation before a small edit. Decide, do it, verify.
- **Don't over-engineer.** No abstraction layer for one caller, no config option
  nobody asked for, no future-proofing for a requirement that does not exist, no
  new dependency or pattern when plain code does it. Build for today's ask.

**The test before writing anything:** *is this needed to finish the task, and
does it already exist somewhere?* If it isn't needed — skip it. If it exists —
reuse it.

## "Anong ginagawa nito?" — answer plainly, as a numbered-feel bullet list
When the user asks **what something is or what it does**, the answer is written
for a **grade-school student**, never for an engineer. Plain words, short lines,
and always a **bulleted list in the order things actually happen** — never a wall
of paragraphs.

**The questions this covers** (Tagalog, English, or halo — the wording varies,
the intent doesn't):
- *"anong ginagawa nyan / nito / ni X?"*, *"para saan to?"*, *"ano to?"*
- *"pano gumagawa si X?"*, *"paano gumagana?"*, *"how does X work?"*
- *"list the task"*, *"ano ang ginawa mo?"*, *"what did you do?"*
- *"explain X"*, *"anong nangyayari dito?"*, *"what is this file/screen/button for?"*
- anything asking for a walkthrough, a summary of work, or a list of steps.

**How the answer looks:**
- One bullet per step or per idea — nothing else.
- **In order.** Step 1 first, then 2, then 3 — the way it really happens.
- One short sentence per bullet. If a bullet needs a comma-heavy second clause,
  split it into two bullets.
- **Everyday words.** "The app remembers it" — not "it persists to the database".
  "It checks who you are" — not "it validates the JWT".
- Use a real-life comparison when it helps ("like a receipt", "like a guard at
  the door") — one per answer, not one per bullet.
- No jargon, no file paths, no function names, no code, no acronyms in the plain
  answer. If a technical name genuinely has to appear, say what it does in
  ordinary words right after it.
- 3–8 bullets is the target. If it truly needs more, group them under short
  plain headings — still bullets underneath.

Example shape:

- The player opens the app and picks a court.
- The app asks the venue if that time is still free.
- If it is free, the app holds the slot for a few minutes.
- The player pays, and the booking becomes final.
- Both the player and the venue owner get a message about it.

**⛔ What NOT to do:**
- ⛔ No paragraphs of explanation. Bullets, always.
- ⛔ No code blocks, diffs or file names in the plain answer.
- ⛔ No "it depends on the implementation" hedging — say the simple version.
- ⛔ Never skip the list because the answer "is short" — two bullets is still a list.

**The technical detail is not banned — it just comes second.** Give the plain
bulleted answer FIRST. If the deeper version is genuinely useful, add it after,
under a clearly separate line like *"Mas technical na paliwanag:"* — and only
when it was asked for or clearly needed. When the user explicitly asks for the
technical version, give that instead; this rule is about the DEFAULT.

**Match the user's language.** Tagalog question → Tagalog answer. English
question → English. Taglish → Taglish. The simplicity rule holds either way.

**No percentage on this one** — it is a question, not a task, so the answer
opens straight with the bullets. (See the exception in the percentage rule
above.) If the same message also reports work you did, the percentage leads as
normal.

## Tanong lang = sagot lang — huwag mag-trabaho, huwag mag-overthink
Kapag **nagtatanong lang** ang user, ang sagot ay **sagot**. Walang kasamang
trabaho, walang paghahanap ng ibang gagawin, walang mahabang paliwanag.

- **Sagutin agad.** Unang linya na ang sagot — hindi preamble, hindi background,
  hindi "let me check first" kung alam na naman.
- ⛔ **Huwag mag-edit, mag-fix, mag-refactor o mag-deploy** dahil lang sa tanong.
  Ang "bakit ganito?" ay hindi "ayusin mo". Ang "ano to?" ay hindi "palitan mo".
- ⛔ **Huwag mag-overthink.** Isang tanong = isang sagot. Walang listahan ng
  posibilidad, walang "it depends", walang tatlong option kung isa lang ang totoo.
- **Isang file lang basahin kung isa lang ang kailangan.** Huwag mag-grep sa buong
  repo, huwag mag-spawn ng subagent, huwag maglabas ng plan para sa isang tanong.
- **Ikli ang sukat.** 1–3 pangungusap, o maikling bullets kung talagang listahan
  ang tinatanong. Hindi report, hindi essay.
- **Kung may nakitang dapat ayusin**, banggitin sa isang linya sa dulo — huwag
  gawin. Hintayin ang "sige, gawin mo".
- **Kung talagang hindi alam**, sabihin agad na hindi alam at kung ano ang
  kailangang tingnan — huwag mag-hula ng mahaba.
- ⛔ **Walang percentage.** Tanong lang ito — walang trabahong sinusukat, kaya
  huwag mag-`**Progress: 100%**`. Diretso na sa sagot. (Kapag may kasamang
  utos ang tanong, o may bukas pang task sa session, balik ang percentage.)

**Kailan ito hindi applicable:** kapag may utos na kasama ang tanong ("bakit
ganito, ayusin mo") — trabaho na yun, sundin ang normal na rules.

## `verification-before-completion` — LAGING NAKA-LOAD, hindi tinatanong
Ang skill na `verification-before-completion` ay **hindi optional at hindi
pinipili**. Ito ang panuntunang *"patunay bago sabihing tapos"*, at totoo iyon sa
bawat task — kaya awtomatiko itong nilo-load sa simula ng trabaho.

**Kapag `/tulong` ang ginamit**, si `/tulong` na ang bahala — naka-built-in na
roon: hindi ito lumalabas sa alinmang tickbox at laging nauunang i-load.

**Kapag HINDI ginamit si `/tulong`** — ibig sabihin karaniwang task lang na
diretsong hiniling — ang rule na ito ang humahawak. Sa unang task ng session na
may aktwal na trabaho (may ie-edit, ififix, ibi-build o idi-deploy):

1. **Tingnan kung naka-install** — `ls -d ~/.claude/skills/verification-before-completion`.
2. **Kung meron** → `Skill({ skill: "verification-before-completion" })` agad,
   bago ang ibang skill, bago magsimula ang trabaho.
3. **Kung wala** → i-install muna, tahimik, walang tanong. Subukan ang
   skills.sh (`npx skills add verification-before-completion`); kung wala roon,
   ang skillsmp.com. Pagkatapos, i-load.
4. **Kung bigo ang install, o wala na talaga ang pinanggalingan** (404, offline,
   tanggal na sa registry) → **huwag nang ipilit.** Huwag i-install, huwag
   i-load, huwag ulit-ulitin sa parehong session. Sabihin sa isang linya na wala
   ito, tapos **ituloy ang trabaho nang wala nito** — hindi ito dahilan para
   ihinto o ipagpaliban ang task.

**Isang linya lang ang sasabihin tungkol dito** — hal. `+
verification-before-completion (laging naka-load)` o `verification-before-completion:
wala sa machine at hindi ma-install — tuloy nang wala nito`. Huwag ipaliwanag,
huwag gawing sariling talata, huwag ipa-tanong kay Ivan.

**Kailan ito hindi kailangan:** puro tanong lang (tingnan ang *Tanong lang =
sagot lang*), o markdown-only na trabaho — walang kino-complete na code kaya
walang bago-mag-claim na dapat patunayan.

## 🔴 BAWAT BAGONG RULE AT BAWAT BAGONG SKILL AY NACO-COMMIT — AUTOMATIKO
**Dalawang bagay ang laging sabay: ang rule file at ang git repo ng skills.**
Ang `~/.claude/skills` ay tunay na git repo
(`github.com/jhonivancuaco/my-skills-compilation`, branch `main`), at nakatira
doon ang kopya ng global rules — kaya ang pagdagdag ng rule ay hindi tapos sa
pag-edit ng isang file.

### 1. May kambal ang global rules — i-update pareho, BAGO ang commit
Iisang dokumento ang `~/.claude/CLAUDE.md` at ang
`~/.claude/skills/global-rules/CLAUDE.md`, nakalagay lang sa dalawang lugar:
magkatulad sila **byte-for-byte**, at ganoon dapat sila manatili.

**DALAWA ang nagti-trigger ng sync, hindi isa:**

| Nangyari | Gawin |
|---|---|
| may nadagdag, nabago o natanggal na rule sa local global | i-sync ang kambal, sa **parehong session** |
| **may bagong skill na na-install o na-add** | i-sync **din** ang kambal — **bago** ang commit, kahit walang rule na nabago |

**Ang pangalawa ay hindi optional at hindi hinuhusgahan.** Huwag mag-isip kung
"may nabago ba talaga sa rules?" — basta may bagong skill, `cp` na agad. Isang
linyang utos lang ito at wala itong masisira: kung pareho na ang dalawa, wala
namang lalabas sa `git status`. Ang dahilan ay simple — **bawat push ay
nag-iiwan ng repo na may pinakabagong rules**, hindi lang ng bagong folder ng
skill, at hindi na kailangang alalahanin sa susunod na session.

```sh
cp ~/.claude/CLAUDE.md ~/.claude/skills/global-rules/CLAUDE.md
md5 ~/.claude/CLAUDE.md ~/.claude/skills/global-rules/CLAUDE.md   # dapat pareho
```

⛔ **Hindi ito ginagawa pagkatapos ng commit.** Ang sync ay nauuna, para isang
commit lang ang lumalabas — ang skill at ang rules na kasama nito — hindi
dalawang commit na kalahati bawat isa.

### 2. Commit at push ang LAHAT ng changes sa `~/.claude/skills`
Kapag may **bagong skill na na-install o na-add**, o may **nadagdag na rule sa
local global**, pumasok sa `~/.claude/skills` at i-commit at i-push ang lahat ng
changes — kasama ang bagong skill folder at ang updated na rule file. **Apat na
hakbang, at ang sync ang UNA:**

```sh
cp ~/.claude/CLAUDE.md ~/.claude/skills/global-rules/CLAUDE.md   # 1. sync muna
cd ~/.claude/skills
git add -A                                                       # 2. lahat
git commit -m "<kung ano ang nabago>"                            # 3.
git push origin main                                             # 4.
```

- **`git add -A` ang tama DITO.** Sariling repo ito ng skills at lahat ng nasa
  loob nito ay sadyang naka-track. (Iba ito sa mga project repo, kung saan
  pinapangalanan ang files isa-isa — tingnan ang *Commits are made on the
  server* na rule ng PickleBallers.)
- **Walang skill na naiiwang untracked.** Ang na-install ngayon ay naco-commit
  ngayon, hindi sa susunod na session.
- **Kumpirmahin na tumama ang push** — `git -C ~/.claude/skills status --short`
  ay dapat malinis, at `git -C ~/.claude/skills log --oneline -1` ay ang bagong
  commit mo. Hindi ito tapos dahil lang hindi nag-error ang `git push`.

### 3. ⛔ HINDI ITO PUMAPASOK SA KAHIT ANONG REPORT
**Ang pag-update, pag-commit at pag-push ng rules at skills ay walang lugar sa
alinmang report** — hindi sa `DD-report.md`, hindi sa `-ignore`, hindi sa
`-local`, at hindi sa isang progress page.

- **Lalo na kapag ang task ay nangailangan ng pag-download at pag-install ng
  skill.** Ang skill ay kasangkapan, hindi deliverable. Ang report ay tungkol sa
  produkto — hindi sa kung anong tool ang binuksan para magawa ito.
- **Hindi rin ito dahilan para magtanong ng report.** Markdown at git
  housekeeping lang ito: tahimik na ginagawa, tahimik na tinatapos.
- **Nananatili pa rin ito sa progress percentage**, at may verification pa rin
  (kumpirmahin ang push) — hindi lang ito sinusulat sa report.
