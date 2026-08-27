#!/usr/bin/env node
/**
 * pair-coding bus — shared inbox, work plan, project brief and decision log
 * for a team of Claude Code sessions working one task together.
 *
 *   /mcp   — MCP over streamable HTTP (sessions started with .mcp.json)
 *   /api/* — plain JSON REST, used by bus.js CLI (works mid-session, no restart)
 *
 * Design notes that matter:
 *  - Splitting work N ways is arithmetic, so the server computes it (`balance`).
 *    Choosing *which* item goes to whom is judgement, so the host does that.
 *  - Questions between sessions must carry their own context. A question like
 *    "can you look at auth.js?" forces every reader to go read the file, which
 *    multiplies token cost by the team size. `consult` rejects context-free
 *    questions rather than letting that happen.
 */

import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const argPort = process.argv.indexOf("--port");
const PORT = Number(argPort > -1 ? process.argv[argPort + 1] : process.env.PORT || 7777);


// ---------------------------------------------------------------- state
const inbox = new Map();
const waiters = new Map();
const agents = new Map();
const consults = new Map();
let plan = [];
let brief = "";
let decisions = [];
let paused = null;
const log = [];
let seq = 0, itemSeq = 0, consultSeq = 0;

function touch(name) {
  const a = agents.get(name);
  if (a) a.last_active = Date.now();
}

function push(agent, msg) {
  if (!inbox.has(agent)) inbox.set(agent, []);
  inbox.get(agent).push(msg);
  const q = waiters.get(agent);
  if (q && q.length) q.shift()();
}

function drain(agent) {
  const m = inbox.get(agent) || [];
  inbox.set(agent, []);
  return m;
}

function waitFor(agent, ms) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const q = waiters.get(agent) || [];
      const i = q.indexOf(finish);
      if (i >= 0) q.splice(i, 1);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    if (!waiters.has(agent)) waiters.set(agent, []);
    waiters.get(agent).push(finish);
  });
}

const hostName = () => [...agents.entries()].find(([, a]) => a.is_host)?.[0] || null;
const others = (me) => [...agents.keys()].filter((a) => a !== me);
const publicPlan = () => plan.filter((i) => i.status !== "cancelled");
const tasksFor = (n) => publicPlan().filter((i) => i.owner === n && i.status !== "done")
  .map((i) => ({ id: i.id, title: i.title, detail: i.detail, status: i.status }));

// ---------------------------------------------------------------- membership
function doJoin({ me, role, skills = [], is_host = false }) {
  if (!me || !role) return { ok: false, error: "me and role are both required" };
  const isNew = !agents.has(me);
  const prev = agents.get(me);
  agents.set(me, {
    role: role ?? prev?.role,
    skills: skills.length ? skills : prev?.skills ?? [],
    is_host: is_host || prev?.is_host || false,
    joined_at: prev?.joined_at ?? Date.now(),
    last_active: Date.now(),
  });

  const h = hostName();
  if (isNew && !is_host && h && h !== me) {
    push(h, {
      id: ++seq, at: new Date().toISOString(), from: me, to: h, kind: "join",
      text:
        `AGENT JOINED: "${me}" — role: ${role}` +
        `${skills.length ? ` — skills: ${skills.join(", ")}` : ""}. Team is now ${agents.size}. ` +
        `Pause, rebalance the plan, brief "${me}", then resume.`,
    });
  }

  // Everything a newcomer needs, so it never has to scan the repo to catch up.
  return {
    ok: true, me, team_size: agents.size, host: h, paused,
    brief: brief || "(host has not written the brief yet — ask for it)",
    decisions: decisions.slice(-10),
    roster: doRoster().agents,
    my_tasks: tasksFor(me),
    balance: doBalance(),
  };
}

function doRoster() {
  return {
    team_size: agents.size, host: hostName(), paused,
    agents: [...agents.entries()].sort((a, b) => a[1].joined_at - b[1].joined_at)
      .map(([name, a]) => ({
        name, role: a.role, is_host: a.is_host,
        last_active: new Date(a.last_active).toISOString(),
        queued_messages: (inbox.get(name) || []).length,
        open_tasks: tasksFor(name).length,
      })),
  };
}

// ---------------------------------------------------------------- messaging
function doSend({ from, to, text, kind = "msg" }) {
  touch(from);
  const msg = { id: ++seq, at: new Date().toISOString(), from, to, kind, text };
  log.push(msg);
  const targets = to === "*" ? others(from) : [to];
  for (const t of targets) push(t, msg);
  return { ok: true, id: msg.id, delivered_to: targets };
}

async function doRecv({ me, timeout_seconds = 60 }) {
  touch(me);
  let msgs = drain(me);
  if (msgs.length === 0) {
    await waitFor(me, timeout_seconds * 1000);
    msgs = drain(me);
  }
  return { me, count: msgs.length, messages: msgs, paused, my_tasks: tasksFor(me) };
}

// ---------------------------------------------------------------- consult
/**
 * A consult is a structured decision, not an open question. The asker must lay
 * out the situation and the candidate answers; responders only pick and justify.
 *
 * That ordering is deliberate. An open question ("what should I do about auth?")
 * makes every responder go read the code and reconstruct the problem — N readers,
 * N times the cost, N different framings. Forcing the asker to state the options
 * means they do the expensive thinking once, and each answer costs a sentence.
 *
 * If responders disagree, the consult goes to another round: everyone sees the
 * tally and the reasoning, then holds or switches. It repeats until one option
 * wins outright, or the rounds run out and the majority takes it.
 */

const FIELDS = {
  context:   { min: 40, help: "What you're building and where this sits. Enough that nobody needs to open a file." },
  happening: { min: 25, help: "What the code does right now — the actual current behaviour, error, or state." },
  problem:   { min: 25, help: "What's wrong with that, specifically. The thing that needs solving." },
  goal:      { min: 25, help: "What should happen instead. The outcome you're aiming at." },
  question:  { min: 10, help: "The actual ask, stated last, after everything above." },
};

const label = (i) => String.fromCharCode(65 + i); // 0 -> A

function renderConsult(c) {
  return (
    `CONSULT #${c.id} from ${c.from} — round ${c.round} of ${c.max_rounds}\n` +
    `\nCONTEXT\n${c.context}` +
    `\n\nWHAT'S HAPPENING\n${c.happening}` +
    `\n\nPROBLEM\n${c.problem}` +
    `\n\nWHAT SHOULD HAPPEN\n${c.goal}` +
    `\n\nOPTIONS\n${c.options.map((o, i) => `  ${label(i)}) ${o}`).join("\n")}` +
    `\n  X) none of these — propose something else` +
    `\n\nQUESTION\n${c.question}` +
    `\n\n-> Reply with the answer tool: consult_id ${c.id}, choice one of ` +
    `${c.options.map((_, i) => label(i)).join("/")}/X, plus one or two lines of why.` +
    `\n   Decide from what's written above. Don't open files to answer — if you ` +
    `truly can't judge from this, choose X and say exactly what's missing.`
  );
}

function renderRebuttal(c) {
  const prev = c.rounds[c.round - 2];
  const counts = {};
  for (const a of prev) counts[a.choice] = (counts[a.choice] || 0) + 1;
  return (
    `CONSULT #${c.id} — ROUND ${c.round} of ${c.max_rounds}: no consensus yet\n` +
    `\nTally: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join("  ")}` +
    `\n\nWHAT EACH OF YOU SAID\n` +
    prev.map((a) => `  ${a.from} chose ${a.choice}: ${a.why}`).join("\n") +
    `\n\nRead the opposing case. Hold your position or switch — either is fine, but ` +
    `answer the strongest point against you in one line.` +
    `\n-> answer tool: consult_id ${c.id}, choice, why.` +
    (c.round === c.max_rounds ? `\n\nFinal round. If you still split, the majority wins.` : "")
  );
}

function startRound(c) {
  c.rounds.push([]);
  c.round = c.rounds.length;
  clearTimeout(c.timer);
  c.timer = setTimeout(() => settle(c, true), c.timeout * 1000);
  const text = c.round === 1 ? renderConsult(c) : renderRebuttal(c);
  for (const r of c.recipients) {
    push(r, {
      id: ++seq, at: new Date().toISOString(), from: c.from, to: r,
      kind: "consult", consult_id: c.id, round: c.round, text,
    });
  }
}

function settle(c, byTimeout) {
  if (c.status !== "open") return;
  let round = c.rounds[c.round - 1];
  if (!byTimeout && round.length < c.recipients.length) return; // still waiting

  // Silence in a debate round means "I hold my position", not "I vanished".
  // Anyone who voted before and didn't re-vote carries their last choice forward,
  // so one distracted session can't stall a decision the others have settled.
  if (byTimeout && c.round > 1) {
    const prev = c.rounds[c.round - 2];
    for (const p of prev) {
      if (!round.some((x) => x.from === p.from)) round.push({ ...p, held: true });
    }
    c.rounds[c.round - 1] = round;
  }

  if (round.length === 0) {
    c.status = "no_answers";
    return finish(c);
  }

  const counts = {};
  for (const a of round) counts[a.choice] = (counts[a.choice] || 0) + 1;
  const distinct = Object.keys(counts);

  if (distinct.length === 1) {
    c.status = "resolved";
    c.winner = distinct[0];
    return finish(c);
  }
  if (c.round < c.max_rounds) return startRound(c);

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
    c.status = "deadlocked";
  } else {
    c.status = "resolved_by_majority";
    c.winner = sorted[0][0];
  }
  finish(c);
}

function finish(c) {
  clearTimeout(c.timer);
  if (c.winner && c.winner !== "X") {
    const idx = c.winner.charCodeAt(0) - 65;
    const chosen = c.options[idx] || c.winner;
    c.winning_option = chosen;
    decisions.push({
      at: new Date().toISOString(),
      by: `consult #${c.id} (${c.from})`,
      text: `${c.question} -> ${c.winner}) ${chosen}`,
    });
  }
  if (c.resolve) c.resolve();
}

async function doConsult(a) {
  const { from, to, options, timeout_seconds = 120, max_rounds = 3 } = a;
  for (const [f, spec] of Object.entries(FIELDS)) {
    const v = (a[f] || "").trim();
    if (v.length < spec.min) {
      return {
        ok: false,
        error: `"${f}" is required and must be at least ${spec.min} characters. ${spec.help}`,
        required_shape: Object.fromEntries(Object.entries(FIELDS).map(([k, s]) => [k, s.help])),
      };
    }
  }
  if (!Array.isArray(options) || options.length < 2) {
    return {
      ok: false,
      error:
        "options must list at least 2 concrete alternatives. Working out the plausible " +
        "answers is the asker's job — responders pick between them and say why. Without " +
        "options every responder re-derives the problem from scratch, which costs the " +
        "team N times over. If you genuinely can't see two paths, you're not ready to ask.",
    };
  }

  const recipients = to === "*" ? others(from) : [to];
  if (!recipients.length) return { ok: false, error: "nobody else is on the bus to ask" };

  const c = {
    id: ++consultSeq, from, recipients,
    context: a.context, happening: a.happening, problem: a.problem,
    goal: a.goal, question: a.question, options,
    timeout: timeout_seconds, max_rounds: Math.max(1, Math.min(5, max_rounds)),
    rounds: [], round: 0, status: "open", winner: null,
    at: new Date().toISOString(),
  };
  consults.set(c.id, c);
  log.push({ id: ++seq, at: c.at, from, to, kind: "consult", text: c.question });

  startRound(c);
  await new Promise((resolve) => { c.resolve = resolve; });

  return {
    ok: true,
    consult_id: c.id,
    status: c.status,
    winner: c.winner,
    winning_option: c.winning_option || null,
    rounds_used: c.round,
    rounds: c.rounds,
    logged_as_decision: !!c.winning_option,
    note:
      c.status === "deadlocked"
        ? "Split with no majority. You or the host decides — then log it with the decide tool."
        : c.status === "no_answers"
        ? "Nobody answered in time. Everyone may be heads-down; try again or ask one agent directly."
        : c.status === "resolved_by_majority"
        ? "Majority carried it after the final round. The dissent is in rounds — worth a look before you build."
        : "Everyone converged on this. Already recorded as a decision.",
  };
}

function doAnswer({ from, consult_id, choice, why, text }) {
  const c = consults.get(Number(consult_id));
  if (!c) return { ok: false, error: `no consult #${consult_id}` };
  if (c.status !== "open") return { ok: false, error: `consult #${c.id} already closed (${c.status})` };

  const reason = (why || text || "").trim();
  if (!reason) return { ok: false, error: "why is required — a choice with no reasoning can't be debated" };

  const valid = [...c.options.map((_, i) => label(i)), "X"];
  const picked = (choice || "").trim().toUpperCase();
  if (!valid.includes(picked)) {
    return { ok: false, error: `choice must be one of ${valid.join(", ")} — X means none of these` };
  }

  const round = c.rounds[c.round - 1];
  if (round.some((x) => x.from === from)) {
    return { ok: false, error: `you already answered round ${c.round} of consult #${c.id}` };
  }
  if (!c.recipients.includes(from)) {
    return { ok: false, error: "this consult wasn't addressed to you" };
  }

  touch(from);
  round.push({ from, choice: picked, why: reason });
  log.push({ id: ++seq, at: new Date().toISOString(), from, to: c.from, kind: "answer", text: `${picked}: ${reason}` });

  settle(c, false);
  return {
    ok: true, consult_id: c.id, round: c.round,
    waiting_on: c.status === "open" ? c.recipients.filter((r) => !c.rounds[c.round - 1].some((x) => x.from === r)) : [],
    status: c.status,
    warn: reason.length > 900 ? "delivered, but long — short reasoning keeps the team cheap to run" : undefined,
  };
}

function doConsultGet({ consult_id }) {
  const c = consults.get(Number(consult_id));
  if (!c) return { ok: false, error: `no consult #${consult_id}` };
  return {
    ok: true, id: c.id, from: c.from, status: c.status, round: c.round,
    winner: c.winner, options: c.options, question: c.question, rounds: c.rounds,
  };
}

// ---------------------------------------------------------------- brief
function doBrief({ me, text }) {
  if (text !== undefined && text !== null && text !== "") {
    const h = hostName();
    if (h && me !== h) return { ok: false, error: "only the host maintains the brief" };
    brief = text;
    for (const a of others(me)) {
      push(a, { id: ++seq, at: new Date().toISOString(), from: me, to: a, kind: "brief", text: "Project brief updated — read it with the brief tool." });
    }
  }
  return { ok: true, brief, decisions: decisions.slice(-15) };
}

function doDecide({ me, text }) {
  if (!text) return { ok: false, error: "text is required" };
  const d = { at: new Date().toISOString(), by: me, text };
  decisions.push(d);
  for (const a of others(me)) {
    push(a, { id: ++seq, at: d.at, from: me, to: a, kind: "decision", text: `DECIDED: ${text}` });
  }
  return { ok: true, decision: d, total: decisions.length };
}

// ---------------------------------------------------------------- pause
function doPause({ me, on, reason }) {
  const h = hostName();
  if (h && me !== h) return { ok: false, error: "only the host can pause or resume the team" };
  if (on) {
    paused = { by: me, reason: reason || "redistributing work", at: new Date().toISOString() };
    for (const a of others(me)) {
      push(a, { id: ++seq, at: paused.at, from: me, to: a, kind: "pause", text: `PAUSED: ${paused.reason}. Finish your current thought, then wait — don't start new items.` });
    }
  } else {
    paused = null;
    for (const a of others(me)) {
      push(a, { id: ++seq, at: new Date().toISOString(), from: me, to: a, kind: "resume", text: "RESUMED. Check your tasks and carry on." });
    }
  }
  return { ok: true, paused };
}

// ---------------------------------------------------------------- plan
function doPlanSet({ items, replace = true }) {
  if (!Array.isArray(items) || !items.length) return { ok: false, error: "items must be a non-empty array" };
  const mapped = items.map((it) => ({
    id: ++itemSeq,
    title: typeof it === "string" ? it : it.title,
    detail: typeof it === "string" ? "" : it.detail || "",
    tags: typeof it === "string" ? [] : it.tags || [],
    owner: typeof it === "string" ? null : it.owner || null,
    status: "todo",
  }));
  plan = replace ? mapped : [...plan, ...mapped];
  return { ok: true, count: mapped.length, balance: doBalance() };
}

const doPlanGet = () => ({ plan: publicPlan(), balance: doBalance(), roster: doRoster().agents, paused });

function doAssign({ assignments }) {
  const applied = [], errors = [];
  for (const { id, owner } of assignments || []) {
    const item = plan.find((i) => i.id === Number(id));
    if (!item) { errors.push(`no item ${id}`); continue; }
    if (item.status === "in_progress" && item.owner && item.owner !== owner) {
      errors.push(`item ${id} is in progress with ${item.owner} — not reassigned`); continue;
    }
    if (item.status === "done") { errors.push(`item ${id} already done`); continue; }
    item.owner = owner;
    applied.push({ id: item.id, owner, title: item.title });
  }
  const byOwner = new Map();
  for (const a of applied) {
    if (!byOwner.has(a.owner)) byOwner.set(a.owner, []);
    byOwner.get(a.owner).push(`#${a.id} ${a.title}`);
  }
  for (const [owner, list] of byOwner) {
    if (owner === hostName()) continue;
    push(owner, {
      id: ++seq, at: new Date().toISOString(), from: hostName() || "host", to: owner,
      kind: "assignment", text: `Your assignment (${list.length}):\n${list.join("\n")}`,
    });
  }
  return { ok: !errors.length, applied, errors, balance: doBalance() };
}

function doPlanUpdate({ id, status, owner, note, me }) {
  const item = plan.find((i) => i.id === Number(id));
  if (!item) return { ok: false, error: `no item ${id}` };
  if (status) item.status = status;
  if (owner) item.owner = owner;
  if (note) item.detail = note;
  const h = hostName();
  if (me && h && me !== h) {
    push(h, {
      id: ++seq, at: new Date().toISOString(), from: me, to: h, kind: "progress",
      text: `#${item.id} "${item.title}" -> ${item.status}${note ? ` (${note})` : ""}`,
    });
  }
  return { ok: true, item, balance: doBalance() };
}

function doBalance() {
  const names = [...agents.entries()].sort((a, b) => a[1].joined_at - b[1].joined_at).map(([n]) => n);
  const n = names.length;
  const items = publicPlan();
  const total = items.length;
  if (!n) return { team_size: 0, total_items: total, share_pct: null, agents: [] };
  const base = Math.floor(total / n), extra = total % n;
  const load = Object.fromEntries(names.map((x) => [x, 0]));
  for (const it of items) if (it.owner && load[it.owner] !== undefined) load[it.owner]++;
  return {
    team_size: n, total_items: total, share_pct: Math.round((100 / n) * 100) / 100,
    movable: items.filter((i) => i.status === "todo")
      .map((i) => ({ id: i.id, title: i.title, owner: i.owner, tags: i.tags })),
    agents: names.map((name, i) => {
      const target = base + (i < extra ? 1 : 0);
      return { agent: name, role: agents.get(name).role, target, current: load[name], delta: target - load[name] };
    }),
  };
}

const doHistory = ({ limit = 20 }) => ({ messages: log.slice(-limit) });

// ---------------------------------------------------------------- mcp
const text = (o) => ({ content: [{ type: "text", text: JSON.stringify(o, null, 2) }] });

function buildServer() {
  const s = new McpServer({ name: "pair-coding-bus", version: "3.0.0" });
  const T = (n, c, f) => s.registerTool(n, c, f);

  T("join", {
    title: "Join the team",
    description:
      "Register with a name and role. Returns the project brief, decisions so far, " +
      "roster and your tasks — read those instead of scanning the repo to catch up. " +
      "Joining alerts the host to pause and rebalance.",
    inputSchema: {
      me: z.string(), role: z.string().describe("What this session specialises in"),
      skills: z.array(z.string()).optional(),
      is_host: z.boolean().optional().describe("True only for the coordinating session"),
    },
  }, async (a) => text(doJoin(a)));

  T("send", {
    title: "Message the team",
    description:
      "Fire-and-forget. to='*' broadcasts. Use for announcements, not questions — " +
      "questions go through consult so they carry context.",
    inputSchema: { from: z.string(), to: z.string(), text: z.string() },
  }, async (a) => text(doSend(a)));

  T("recv", {
    title: "Wait for messages",
    description:
      "BLOCKS until mail arrives or timeout. Also returns pause state and your open " +
      "tasks. Empty means nobody wrote yet — call again.",
    inputSchema: { me: z.string(), timeout_seconds: z.number().min(1).max(300).default(60) },
  }, async (a) => text(await doRecv(a)));

  T("consult", {
    title: "Put a decision to the team",
    description:
      "Ask the team to choose between options you've laid out, and block until one " +
      "wins. Every field is required and the question comes last, after the situation " +
      "is fully stated: context, what's happening, the problem, what should happen, " +
      "then the options. You do the thinking about what the candidate answers are; " +
      "responders pick one and say why. If they disagree they debate over further " +
      "rounds until one option wins. Use to='*' for a design call the whole team " +
      "should weigh in on, or one agent's name when only they would know.",
    inputSchema: {
      from: z.string(),
      to: z.string().describe("One agent name, or '*' for the whole team"),
      context: z.string().describe("What you're building and where this sits. Enough that nobody needs to open a file."),
      happening: z.string().describe("What the code actually does right now — the behaviour, error or state."),
      problem: z.string().describe("What's wrong with that, specifically."),
      goal: z.string().describe("What should happen instead."),
      options: z.array(z.string()).min(2).describe("The plausible ways to get there. At least 2, concrete."),
      question: z.string().describe("The actual ask, stated last."),
      timeout_seconds: z.number().min(1).max(300).default(120).describe("Per round, not total"),
      max_rounds: z.number().min(1).max(5).default(3).describe("Debate rounds before the majority carries it"),
    },
  }, async (a) => text(await doConsult(a)));

  T("answer", {
    title: "Vote on a consult",
    description:
      "Pick one of the lettered options and say why in a line or two. Judge from what " +
      "the consult states — don't open files to answer; if you truly can't judge from " +
      "it, choose X and name exactly what's missing. If the consult goes to another " +
      "round you'll get the tally and everyone's reasoning, and you can hold or switch.",
    inputSchema: {
      from: z.string(),
      consult_id: z.number(),
      choice: z.string().describe("A, B, C... or X for none of these"),
      why: z.string().describe("One or two lines. Required — an unreasoned vote can't be debated."),
    },
  }, async (a) => text(doAnswer(a)));

  T("consult_get", {
    title: "Check a consult's state",
    description: "Status, current round, votes so far and the winner if it's settled.",
    inputSchema: { consult_id: z.number() },
  }, async (a) => text(doConsultGet(a)));

  T("brief", {
    title: "Read or write the shared project brief",
    description:
      "Call with no text to read it. The host writes it: goal, stack, conventions, " +
      "key files and their purpose. This is how a new session gets context for a few " +
      "hundred tokens instead of reading the whole repo.",
    inputSchema: { me: z.string(), text: z.string().optional() },
  }, async (a) => text(doBrief(a)));

  T("decide", {
    title: "Record a decision",
    description:
      "Log a settled decision and broadcast it, so nobody re-opens the debate or " +
      "builds against the old answer.",
    inputSchema: { me: z.string(), text: z.string() },
  }, async (a) => text(doDecide(a)));

  T("pause", {
    title: "Pause or resume the team (host only)",
    description:
      "Pause before redistributing work so nobody starts an item that's about to move. " +
      "Always resume afterwards — a team left paused is a stalled team.",
    inputSchema: { me: z.string(), on: z.boolean(), reason: z.string().optional() },
  }, async (a) => text(doPause(a)));

  T("plan_set", {
    title: "Publish the work breakdown (host)",
    description:
      "Replace the shared plan. Aim for 3+ small independent items per expected " +
      "session so the split divides evenly. Tag items so they can be matched to roles.",
    inputSchema: {
      items: z.array(z.object({
        title: z.string(), detail: z.string().optional(), tags: z.array(z.string()).optional(),
      })),
      replace: z.boolean().optional(),
    },
  }, async (a) => text(doPlanSet(a)));

  T("plan_get", { title: "Read the full plan", description: "Everything: items, owners, split, roster. Host-sized response — guests usually want recv or balance instead.", inputSchema: {} },
    async () => text(doPlanGet()));

  T("balance", {
    title: "Fair-share breakdown",
    description: "Target vs current item count per agent, and which items are still movable. Call after anyone joins.",
    inputSchema: {},
  }, async () => text(doBalance()));

  T("assign", {
    title: "Assign items and notify owners (host)",
    description: "Set owners; each agent is told automatically. Items already in progress with another owner are refused, so work in flight is never yanked.",
    inputSchema: { assignments: z.array(z.object({ id: z.number(), owner: z.string() })) },
  }, async (a) => text(doAssign(a)));

  T("plan_update", {
    title: "Update your item's status",
    description: "todo / in_progress / blocked / done. Host is notified automatically — no separate message needed. Mark in_progress before starting to protect the item from reassignment.",
    inputSchema: {
      id: z.number(), me: z.string(),
      status: z.enum(["todo", "in_progress", "blocked", "done", "cancelled"]).optional(),
      note: z.string().optional(),
    },
  }, async (a) => text(doPlanUpdate(a)));

  T("roster", { title: "Who's on the team", description: "Names, roles, task counts, pause state.", inputSchema: {} },
    async () => text(doRoster()));

  T("history", { title: "Replay recent traffic", description: "Last N messages. Keep the limit small.", inputSchema: { limit: z.number().min(1).max(200).default(20) } },
    async (a) => text(doHistory(a)));

  return s;
}

// ---------------------------------------------------------------- http
const app = express();
app.use(express.json({ limit: "8mb" }));
const transports = new Map();

app.post("/mcp", async (req, res) => {
  const sid = req.headers["mcp-session-id"];
  if (sid && transports.has(sid)) return transports.get(sid).handleRequest(req, res, req.body);
  if (!sid && isInitializeRequest(req.body)) {
    const t = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => transports.set(id, t),
    });
    t.onclose = () => { if (t.sessionId) transports.delete(t.sessionId); };
    await buildServer().connect(t);
    return t.handleRequest(req, res, req.body);
  }
  res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "no valid session id" }, id: null });
});
const bySession = async (req, res) => {
  const sid = req.headers["mcp-session-id"];
  if (!sid || !transports.has(sid)) return res.status(400).send("Invalid session id");
  await transports.get(sid).handleRequest(req, res);
};
app.get("/mcp", bySession);
app.delete("/mcp", bySession);

app.post("/api/join", (q, r) => r.json(doJoin(q.body)));
app.post("/api/send", (q, r) => r.json(doSend(q.body)));
app.post("/api/recv", async (q, r) => r.json(await doRecv(q.body)));
app.post("/api/consult", async (q, r) => r.json(await doConsult(q.body)));
app.post("/api/answer", (q, r) => r.json(doAnswer(q.body)));
app.get("/api/consult/:id", (q, r) => r.json(doConsultGet({ consult_id: q.params.id })));
app.post("/api/brief", (q, r) => r.json(doBrief(q.body)));
app.post("/api/decide", (q, r) => r.json(doDecide(q.body)));
app.post("/api/pause", (q, r) => r.json(doPause(q.body)));
app.post("/api/plan", (q, r) => r.json(doPlanSet(q.body)));
app.get("/api/plan", (_q, r) => r.json(doPlanGet()));
app.get("/api/balance", (_q, r) => r.json(doBalance()));
app.post("/api/assign", (q, r) => r.json(doAssign(q.body)));
app.post("/api/update", (q, r) => r.json(doPlanUpdate(q.body)));
app.get("/api/roster", (_q, r) => r.json(doRoster()));
app.get("/api/history", (q, r) => r.json(doHistory({ limit: Number(q.query.limit) || 20 })));
app.get("/health", (_q, r) => r.json({ ok: true, service: "pair-coding-bus", port: PORT, team: agents.size, paused: !!paused }));

app.listen(PORT, "127.0.0.1", () => console.log(`pair-coding bus on http://127.0.0.1:${PORT}`));
