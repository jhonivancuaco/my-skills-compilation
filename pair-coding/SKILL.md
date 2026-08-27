---
name: pair-coding
description: Runs a team of Claude Code sessions that work one task together — splitting it evenly, brainstorming, debating design choices, and pair-coding in real time. The first session becomes a working project manager that sets everything up and distributes tasks; every later session asks what its role is, joins, and gets its share. Use whenever the user wants multiple Claude Code windows, tabs, terminals or VS Code sessions to collaborate, talk to each other, split work, or stay in sync — and whenever they mention pair coding with another session, multi-agent or parallel Claude setups, passing notes through a shared txt file between sessions, splitting a job 50/50 or three ways, or ask how one session can reach another.
---

# Pair Coding

A team of Claude Code sessions on one task. A small local server holds the
messages, the work plan, the project brief and the decision log. Sessions talk
to each other directly — no shared text file, no polling.

Three things make it work:

- **`recv` blocks.** A waiting session sleeps inside one call instead of
  burning turns re-reading a file to see if anything changed.
- **The split is arithmetic, so the server computes it.** `balance` says how
  many items each agent should hold. You choose *which* — that needs judgement.
- **Questions must carry their own context.** `consult` refuses a question the
  reader can't answer without opening a file. This is the single biggest cost
  control here; see **Token discipline**.

Below, `<skill-dir>` is the folder this SKILL.md lives in.

---

## Step 1 — Host or not?

**Always ask this first.** Don't infer it, don't guess from whether the bus is
running — the user may be starting a fresh team on a port that's still up.

> "Are you the host for this session? The host acts as project manager — it
> sets everything up, splits the work, and does an equal share itself.
> Say no and I'll join an existing team instead."

Then read `curl -sf --max-time 2 http://127.0.0.1:7777/health` as a sanity
check. Host + bus already running means reuse it. Guest + nothing running means
tell the user no team exists yet and offer to host.

---

## Host path

You are a **working project manager**. You carry a full equal share — half the
work with two sessions, a third with three. Coordination is overhead you absorb
on top, never a reason to take a lighter load. Never assign yourself only the
planning.

### 1. Start the bus

```bash
bash <skill-dir>/scripts/start.sh
```

Prints `PORT=` and `STATUS=`. Idempotent — reuses a running bus rather than
starting a rival. First run installs dependencies (~20s). If the port is taken
by something else, rerun with `BUS_PORT=7788` and use that port everywhere.

### 2. Talk through the task with the user

This is your main conversation with them and it's worth doing properly. Get
clear on the goal, what "done" looks like, hard constraints, and anything
off-limits. Read enough of the code to break the work up sensibly. **You are
the only session that should explore the repo broadly** — everyone else works
from the brief you write, which is what keeps this cheap.

Ask how many sessions they plan to open, so you can size the breakdown.

### 3. Write the brief

The brief is how every future session gets context for a few hundred tokens
instead of reading the whole repo. Keep it under ~400 words: goal, stack,
conventions, the handful of files that matter and what each is for, and
anything not to touch.

```bash
cat > /tmp/brief.md <<'EOF'
Goal: add JWT auth to the Express + React app.
Stack: Express 4, React 18, Vite, Postgres via Prisma.
Conventions: named exports only, no default exports. Tests colocated as *.test.js.
Key files: src/auth/* (backend), web/src/auth/* (frontend), prisma/schema.prisma.
Don't touch: legacy/ — being deleted next sprint.
EOF
node <skill-dir>/scripts/bus.js join --me host --role "PM + backend" --host
node <skill-dir>/scripts/bus.js brief --me host --file /tmp/brief.md
```

### 4. Break the work up and publish it

```bash
cat > /tmp/plan.json <<'EOF'
[
  {"title": "Prisma schema for users + sessions", "tags": ["backend","db"]},
  {"title": "POST /api/v2/login",                 "tags": ["backend"]},
  {"title": "JWT middleware",                     "tags": ["backend"]},
  {"title": "LoginForm component",                "tags": ["frontend"]},
  {"title": "Auth context + route guards",        "tags": ["frontend"]},
  {"title": "Token refresh on 401",               "tags": ["frontend"]}
]
EOF
node <skill-dir>/scripts/bus.js plan --file /tmp/plan.json
```

Sizing decides whether this works. Aim for **at least 3 items per session you
expect**, each finishable without constant check-ins. Six items across three
sessions divides into 2/2/2; four items divides into 2/1/1, which isn't a team.
When unsure, cut finer — small items also rebalance gracefully when someone
joins late.

**Split along seams, not down the middle of one file.** Two sessions editing
the same file is where this setup fails. If two items must touch the same
file, either give them to the same agent or sequence them and say so in the
detail field. Tag every item so you can match it to a role later.

### 5. Write the MCP config

Create `.mcp.json` in the **project root** (not the skill directory):

```json
{
  "mcpServers": {
    "bus": { "type": "http", "url": "http://127.0.0.1:7777/mcp" }
  }
}
```

If it already exists, read it and add the `bus` key to the existing
`mcpServers` object. Never overwrite — it may carry servers the user needs.

### 6. Hand off to the user

Give them this, with the real port. Keep it short — the joining session
interviews the user itself, so it needn't carry role details:

```
Team is running on port 7777. For each session you want to add:

1. Open it in this same project folder.
2. Run /mcp and approve the "bus" server (once per session).
3. Paste: "/pair-coding"  and answer "no" when it asks if you're the host.

It'll ask what you want that session working on, then I'll pause,
re-split the task, and send over its share.
```

A session must **start after** `.mcp.json` exists to get the `bus` tools.
Already-open sessions can still use the CLI — both hit the same bus, so a mixed
team is fine.

### 7. Work, and stay reachable

You almost certainly don't have the `bus` MCP tools, since MCP servers connect
at session startup and `.mcp.json` was only just written. Use the CLI. Don't
offer to restart just to get the tools — that costs the user their context.

Take the first slice and start. **Between work items, poll:**

```bash
node <skill-dir>/scripts/bus.js recv --me host --timeout 5
```

A short poll between items is the habit that makes this work. A session sitting
idle waiting for an assignment is the main failure mode of the whole setup.

### 8. When someone joins: pause, redistribute, resume

A `JOIN` message means the split is stale. Do this before returning to your own
work — a newcomer waiting is worse than your task waiting.

```bash
# 1. Freeze, so nobody starts an item that's about to move
node <skill-dir>/scripts/bus.js pause --me host --on --reason "new session joining"

# 2. See the new maths
node <skill-dir>/scripts/bus.js balance
```

`balance` gives each agent's `target`, `current`, and `delta` (positive means
give them that many more), plus `movable` — items not yet started, the only
ones safe to move.

```bash
# 3. Match items to their role and assign
cat > /tmp/assign.json <<'EOF'
[{"id": 4, "owner": "frontend"}, {"id": 5, "owner": "frontend"}]
EOF
node <skill-dir>/scripts/bus.js assign --file /tmp/assign.json

# 4. Unfreeze — a team left paused is a stalled team
node <skill-dir>/scripts/bus.js pause --me host --off
```

Assigning notifies each agent automatically. Attempts to move work someone has
already started are refused rather than silently yanked — pick a different item.

Then send the newcomer what the brief doesn't cover: what's already done, and
anything in flight their work depends on. Finally drop your own surplus to hit
your new target — two agents to three means handing over about a sixth.

### 9. Land it

Progress arrives as `progress` messages. When `plan-get` shows everything done,
broadcast completion, verify the pieces fit, and offer to shut the bus down.

---

## Guest path

### 1. Ask what this session is for

Ask **before joining** — the role changes which items you should get:

> "What's my role on this? The host will send work either way, but if you have
> something specific in mind — frontend, tests, docs, a particular module —
> I'll ask for that kind of task."

One question. "Whatever the host needs" is a fine answer; join with a general
role and take what comes.

### 2. Join and read the brief

```bash
node <skill-dir>/scripts/bus.js join --me frontend --role "React UI" --skills "react,css"
```

The response carries the brief, decisions so far, the roster and your tasks.
**Read that instead of exploring the repo.** Open only the files your own items
touch. If four sessions each independently scan the codebase to "get oriented,"
you pay four times for one repo — that's the exact cost this setup exists to
avoid. If the brief is missing or too thin to work from, ask the host for it
rather than going and finding out yourself.

Pick a short name that means something — `frontend`, `tests`, `api`. Check
`roster` first so you don't collide; two sessions sharing a name fight over one
inbox.

Joining alerts the host automatically. You don't have to ask.

### 3. Get your assignment

```bash
node <skill-dir>/scripts/bus.js recv --me frontend --timeout 60
```

If nothing arrives after a couple of calls, ask rather than idling:

```bash
node <skill-dir>/scripts/bus.js consult --from frontend --to host \
  --context "I joined as the React UI session and have read the brief and decisions." \
  --happening "Roster shows 3 agents. No plan items are assigned to me and none are in my inbox." \
  --problem "I'm sitting idle while the rest of the team works, which helps nobody." \
  --goal "Have a share of the plan I can start on now." \
  --options "Assign me the unowned items|Reassign part of your own share to me" \
  --q "What's my share?"
```

### 4. Work and report

```bash
node <skill-dir>/scripts/bus.js update --me frontend --item 4 --status in_progress
node <skill-dir>/scripts/bus.js update --me frontend --item 4 --status done --note "LoginForm + validation"
node <skill-dir>/scripts/bus.js update --me frontend --item 5 --status blocked --note "need the token shape"
```

Marking `in_progress` before starting also protects the item from being
reassigned out from under you during a rebalance. If you finish your share, say
so — the host can hand you more rather than let the team finish lopsided.

Check `paused` in every `recv` response. If the team is paused, finish your
current thought and wait; don't start a new item.

---

## Working together

### Asking — the required shape of a question

Never ask an open question. Every question goes through `consult` in one fixed
shape, and the server refuses anything that doesn't fit:

```
CONTEXT           what you're building and where this sits
WHAT'S HAPPENING  what the code actually does right now
PROBLEM           what's wrong with that, specifically
WHAT SHOULD HAPPEN  the outcome you're aiming at
OPTIONS           A, B, C — the plausible ways to get there
QUESTION          the actual ask, stated last
```

The ordering is the point. "Can you check my auth flow?" makes every responder
open your files and reconstruct the problem — N readers, N times the cost, and
N different ideas of what's even being asked. Stating the situation and the
candidate answers means **you do the expensive thinking once**, and each reply
costs a sentence.

Working out the options is your job, not theirs. If you can't see two plausible
paths, you aren't ready to ask yet — go look, then ask.

```bash
node <skill-dir>/scripts/bus.js consult --from frontend --to '*' \
  --context "Building the dashboard in web/src/dashboard. Six routes read auth state to decide which widgets render." \
  --happening "Auth state is prop-drilled from App.jsx down through four component layers to each widget." \
  --problem "Every new widget means threading props through components that never use them, and re-renders the whole tree." \
  --goal "Any widget should read auth state directly, and only re-render when the slice it uses changes." \
  --options "React Context with a single AuthProvider|Zustand store|Redux Toolkit slice" \
  --q "Which state approach should the dashboard use?"
```

Long consults are easier to write as a file — same fields, then
`consult --file /tmp/consult.json`.

Send to `'*'` for a design call the team should weigh in on, or to one agent
when only they would know. Either way the shape is identical.

### Answering — pick a letter and say why

Responders don't write essays. They pick one lettered option and justify it in
a line or two:

```bash
node <skill-dir>/scripts/bus.js answer --from tests --consult 1 --choice B \
  "Context re-renders every consumer, which is the exact problem stated. Zustand does selector-based updates."
```

**Judge from what the consult says. Don't open files to answer.** If you truly
can't judge from it, choose `X` — none of these — and name exactly what's
missing. That's a real answer and it's cheap; going off to read the codebase to
produce a better one is what this whole structure exists to prevent.

A vote with no reasoning is rejected, because an unreasoned vote can't be
debated.

### Debating until one option wins

If everyone picks the same option, it's settled immediately. If they split, the
consult automatically goes to another round: everyone sees the tally and each
other's reasoning, then holds or switches, answering the strongest point against
them in one line.

That repeats until one option wins outright or the rounds run out (3 by
default). Then:

- **Everyone converged** → resolved, and logged as a decision automatically.
- **Majority after the final round** → carried, also logged. The dissent stays
  in the result; read it before you build, since the losing argument usually
  names the thing that will bite you.
- **Dead even** → deadlocked, nothing logged. The host decides and records it
  with `decide`.

Silence in a debate round counts as holding your position, so one distracted
session can't stall a decision the rest have settled.

Disagree when you actually disagree — a session that rubber-stamps everything
adds nothing, and the debate rounds exist precisely to surface the objection
someone would otherwise hit three hours later. But don't argue past the point
of new information: if your second-round answer is just your first one restated,
switch or concede.

### Recording decisions

Consults log themselves when they resolve. Anything decided outside a consult —
in conversation with the user, or a call the host simply makes — gets logged by
hand:

```bash
node <skill-dir>/scripts/bus.js decide --me host "Auth returns {token, expiresAt}. expiresAt is absolute ISO8601, not a duration."
```

This broadcasts and persists, and new sessions inherit it on join. **Log every
decision that constrains someone else's work** — shared interfaces, data
shapes, naming, anything two agents could implement differently.

### Announcements

`send` is for telling, `consult` is for asking. Broadcast before you change
something shared — a schema, a signature, a filename — not after. Don't
broadcast progress narration; `update` already notifies the host.

**Never relay through the user.** Once the bus is up, messages go over the bus.

---

## Token discipline

Several sessions on one task can quietly cost several times a single session.
Nearly all of that comes from the same mistake: **more than one session reading
the same thing.** Everything below follows from avoiding that.

1. **Only the host explores broadly.** Everyone else works from the brief and
   opens only what their own items touch.
2. **Context lives in the brief, not in re-reading.** If you find yourself
   explaining the project's shape in a message, put it in the brief instead —
   written once, read by everyone, and inherited by future sessions.
3. **Questions carry the situation and the options.** Covered above; it's the
   biggest single lever. The asker thinks once so N responders don't each
   re-derive the problem.
4. **Ask one agent for facts; ask the team only for real design calls.**
   Broadcasting buys N opinions at N times the price.
5. **Answers are a letter and a line.** Never restate the question or re-derive
   reasoning the asker already gave you.
6. **Decisions get logged, not re-argued.** Re-litigating a settled choice
   costs the whole team again.
7. **Don't consult what you can decide.** Consult on shared interfaces,
   ambiguous requirements, and expensive-to-reverse choices. Your own variable
   names are not a team matter.
8. **Keep `history` and `plan_get` small and rare.** Guests want `recv` and
   `balance`; `plan_get` is host-sized. `recv` already returns your tasks.
9. **Don't poll hot.** `--timeout 5` between work items, `--timeout 60` when
   genuinely waiting. A blocked call costs nothing while it waits — that's the
   point. Many short calls cost more than one long one.
10. **Idle sessions are pure waste.** If you're blocked with nothing to do, say
    so and ask for more rather than re-reading the plan to look busy.

---

## Tools

| | |
|---|---|
| `join` | Register with name + role. Returns brief, decisions, roster, your tasks. |
| `brief` | Read the shared brief. Host writes it. |
| `decide` | Log and broadcast a settled decision. |
| `send` | Announce. `to: "*"` broadcasts. |
| `recv` | **Blocks** for mail. Returns pause state and your tasks. |
| `consult` | Structured decision; blocks until one option wins. Refuses open questions. |
| `answer` | Vote a letter + why. Rejects unreasoned votes. |
| `consult_get` | Status, round and votes on a consult. |
| `pause` | Host freezes/unfreezes the team for redistribution. |
| `plan_set` / `plan` | Host publishes the breakdown. |
| `plan_get` | Full plan — host-sized. |
| `balance` | Target vs current per agent; what's movable. |
| `assign` | Set owners and notify them. |
| `plan_update` / `update` | Change item status. Host notified automatically. |
| `roster` | Who's on, roles, task counts. |
| `history` | Recent traffic. |

CLI names match except `plan_set` → `plan --file`, `plan_get` → `plan-get`,
`plan_update` → `update`. Add `--port 7788` if not on the default.

---

## Troubleshooting

**`Cannot reach the bus`** — rerun `start.sh`. It may have died with its terminal.

**No `bus` tools after `/mcp`** — that session started before `.mcp.json`
existed. Restart it, or use the CLI.

**`has a "url" but no "type"`** — the `.mcp.json` entry needs `"type": "http"`.
Claude Code reads a typeless entry as a stdio server and skips it.

**A joined session is idle** — the host missed the `JOIN` because it never
polled. Have the guest `consult` the host directly, and poll between items from
then on.

**Team stuck** — someone paused and never resumed. `roster` shows pause state;
only the host can clear it.

**Two sessions editing one file** — a splitting mistake. Host: pause, reassign
both items to one agent, resume.

**Everything vanished** — state is in memory. Restarting the server clears the
plan, brief and decisions. Keep the brief in a file so it survives.

---

## Cleanup

```bash
kill "$(cat <skill-dir>/scripts/bus.pid)" 2>/dev/null
```

Offer this when the work is done rather than leaving it running.

## Notes

Requires Node 18+. Binds to `127.0.0.1` only, with no authentication — anything
running locally can read and write, so don't put secrets on the bus.
