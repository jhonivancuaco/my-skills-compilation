#!/usr/bin/env node
/**
 * bus — CLI for the pair-coding bus. Works in any Claude Code session
 * immediately: no MCP config, no session restart.
 *
 *   node bus.js join    --me host --role "PM + backend" --host
 *   node bus.js brief   --me host --file brief.md      # host writes it
 *   node bus.js brief   --me frontend                  # anyone reads it
 *   node bus.js plan    --file plan.json
 *   node bus.js balance
 *   node bus.js assign  --file assign.json  |  --item 3 --owner frontend
 *   node bus.js pause   --me host --on  [--reason "rebalancing"]
 *   node bus.js pause   --me host --off
 *   node bus.js update  --me frontend --item 3 --status done [--note "..."]
 *   node bus.js consult --from fe --to backend --context ".." --happening ".." \
 *                       --problem ".." --goal ".." --options "A|B" --q "..."
 *   node bus.js consult --file consult.json            # same fields as JSON
 *   node bus.js consult-get --consult 1
 *   node bus.js answer  --from backend --consult 1 --choice B "why in a line"
 *   node bus.js decide  --me host "auth returns {token, expiresAt}"
 *   node bus.js send    --from host --to '*' "schema frozen"
 *   node bus.js recv    --me host [--timeout 60]
 *   node bus.js roster | plan-get | history [--limit 20]
 */

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const cmd = args.shift();

function flag(n, d) {
  const i = args.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}
function bool(n) {
  const i = args.indexOf(`--${n}`);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}

const isHost = bool("host");
const on = bool("on");
const off = bool("off");
const port = flag("port", process.env.BUS_PORT || "7777");
const base = `http://127.0.0.1:${port}`;
const from = flag("from"), to = flag("to"), me = flag("me");
const role = flag("role"), skills = flag("skills"), file = flag("file");
const item = flag("item"), owner = flag("owner"), status = flag("status"), note = flag("note");
const q = flag("q"), context = flag("context"), options = flag("options");
const consultId = flag("consult"), choice = flag("choice");
const limit = flag("limit", "20");
const timeoutRaw = flag("timeout");
const timeout = Number(timeoutRaw ?? (cmd === "consult" ? "120" : "60"));
const body = args.filter((a) => !a.startsWith("--")).join(" ").trim();

const die = (m) => { console.error(m); process.exit(1); };
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch (e) { die(`Cannot read ${p}: ${e.message}`); } };
const readText = (p) => { try { return readFileSync(p, "utf8"); } catch (e) { die(`Cannot read ${p}: ${e.message}`); } };

async function call(method, path, payload) {
  let res;
  try {
    res = await fetch(base + path, {
      method, headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
  } catch {
    die(`Cannot reach the bus at ${base}.\nStart it with:  bash <skill-dir>/scripts/start.sh`);
  }
  if (!res.ok) die(`Bus error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  if (data && data.ok === false) process.exit(2);
}

switch (cmd) {
  case "join":
    if (!me || !role) die('Usage: bus.js join --me NAME --role "what you do" [--host]');
    await call("POST", "/api/join", { me, role, is_host: isHost, skills: skills ? skills.split(",").map((s) => s.trim()) : [] });
    break;

  case "brief":
    if (!me) die("Usage: bus.js brief --me NAME [--file brief.md]");
    await call("POST", "/api/brief", { me, text: file ? readText(file) : body || undefined });
    break;

  case "decide":
    if (!me || !body) die('Usage: bus.js decide --me NAME "the decision"');
    await call("POST", "/api/decide", { me, text: body });
    break;

  case "pause":
    if (!me || (!on && !off)) die("Usage: bus.js pause --me host --on|--off [--reason ...]");
    await call("POST", "/api/pause", { me, on, reason: flag("reason") });
    break;

  case "plan": {
    if (!file) die("Usage: bus.js plan --file plan.json");
    const items = readJson(file);
    if (!Array.isArray(items)) die("plan file must be a JSON array");
    await call("POST", "/api/plan", { items });
    break;
  }

  case "plan-get": await call("GET", "/api/plan"); break;
  case "balance": await call("GET", "/api/balance"); break;
  case "roster": await call("GET", "/api/roster"); break;
  case "history": await call("GET", `/api/history?limit=${limit}`); break;

  case "assign": {
    let assignments;
    if (file) assignments = readJson(file);
    else if (item && owner) assignments = [{ id: Number(item), owner }];
    else die("Usage: bus.js assign --file assign.json | --item N --owner NAME");
    await call("POST", "/api/assign", { assignments });
    break;
  }

  case "update":
    if (!item || !me) die("Usage: bus.js update --me NAME --item N --status done [--note ...]");
    await call("POST", "/api/update", { id: Number(item), me, status, note });
    break;

  case "consult": {
    const payload = file ? readJson(file) : {
      context, happening: flag("happening"), problem: flag("problem"),
      goal: flag("goal"), question: q,
      options: options ? options.split("|").map((s) => s.trim()) : undefined,
    };
    payload.from = from || payload.from;
    payload.to = to || payload.to;
    // Only override the file's value when --timeout was actually passed.
    if (timeoutRaw) payload.timeout_seconds = Number(timeoutRaw);
    const rounds = flag("rounds");
    if (rounds) payload.max_rounds = Number(rounds);
    if (!payload.from || !payload.to) die("consult needs --from and --to");
    if (!payload.context) {
      die(
        'Usage: bus.js consult --from NAME --to NAME|"*" \\\n' +
        '    --context "what you are building"  --happening "what it does now" \\\n' +
        '    --problem "what is wrong"          --goal "what should happen" \\\n' +
        '    --options "A thing|B thing"        --q "the question"\n' +
        "  Or put all of that in a JSON file and pass --file consult.json"
      );
    }
    await call("POST", "/api/consult", payload);
    break;
  }

  case "answer":
    if (!from || !consultId || !choice) {
      die('Usage: bus.js answer --from NAME --consult N --choice A "why in a line or two"');
    }
    await call("POST", "/api/answer", { from, consult_id: Number(consultId), choice, why: body || flag("why") });
    break;

  case "consult-get":
    if (!consultId) die("Usage: bus.js consult-get --consult N");
    await call("GET", `/api/consult/${Number(consultId)}`);
    break;

  case "send":
    if (!from || !to || !body) die('Usage: bus.js send --from NAME --to NAME "message"');
    await call("POST", "/api/send", { from, to, text: body });
    break;

  case "recv":
    if (!me) die("Usage: bus.js recv --me NAME [--timeout 60]");
    await call("POST", "/api/recv", { me, timeout_seconds: timeout });
    break;

  default:
    die("Commands: join brief decide pause plan plan-get balance assign update consult answer consult-get send recv roster history");
}
