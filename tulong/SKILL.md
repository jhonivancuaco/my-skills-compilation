---
name: tulong
description: Ask the user what they want to do, draft the plan, rank every skill on this machine (workspace, personal, plugin, built-in), then ALWAYS search the open-source world too — skills.sh, skillsmp.com, GitHub, awesome lists, awesomeclaude.ai, onewave-ai, the open web, wherever skills are published — and suggest anything found that is not installed yet, show the install candidates as tickboxes and download only the ticked ones, then show the whole shortlist as tickboxes so the user can uncheck any, auto-load the ones kept, confirm, then do the work straight — only the task, no side jobs, no overthinking, no over-engineering, and reuse what already exists instead of writing a second version. Use when Ivan types /tulong, asks "anong skill ang gamitin", "anong pwede mong gawin", "which skill should I use", "tulungan mo ako", "help me pick a skill", "ano bang magagawa mo", or describes a task without naming any tool.
---

# Tulong — tanong, plano, hanap ng skill, tickbox, tapos gawin

Eight beats, in order. Do not skip one and do not reorder them.

1. **Tanong** — anong gusto mong gawin?
2. **Plano** — how it will be done, written out before any skill is picked.
3. **Local sweep** — every skill on this machine, ranked.
4. **Remote hunt** — **LAGING TUMATAKBO, walang kondisyon.** Search the open-source world, not one or two registries. Anything found that is not on the machine gets suggested. **Search only — install nothing yet.**
5. **Tickbox ng iinstall** — the install candidates, uncheckable; only the ticked ones get downloaded.
6. **Tickbox ng gagamitin** — the full shortlist, uncheckable.
7. **Auto-load** — load the kept ones into this session, **plus `verification-before-completion` always** (never a tickbox).
8. **Go?** — confirm, then start the plan.

Steps 1, 5, 6 and 8 are the **only** four times this skill asks anything.
Everything between them runs without prompting.

**Two separate tickboxes, on purpose.** Step 5 asks *what may be downloaded onto
the machine*; step 6 asks *what gets used for this job*. They are different
consents — a skill can be worth installing but wrong for today, and a skill
unticked at step 5 never exists to be ticked at step 6.

**Never stop at the recommendation.** Naming a skill is not an answer to
"ayusin mo yung X". The skill ends when the work is done, not when the pick is
announced.

---

## ⛔ DIRETSO SA TRABAHO — walang paligoy-ligoy, walang side job

**Gawin lang ang hiningi.** Ang task ang trabaho. Lahat ng iba ay abala — mabagal,
mahal sa token, at hindi hinihingi.

> **Kung naka-pm2 ang app, ang pm2 process ang ni-restart. Huwag nang tignan ang
> Apache.** Iyon ang buong panuntunan sa isang linya: hawakan lang ang bagay na
> aktwal na kasangkot, hindi ang lahat ng bagay na *pwedeng* kasangkot.

Ito ang bawal, sa bawat step ng flow na ito:

| ⛔ Bawal | ✅ Sa halip |
|---|---|
| Magbasa ng files "para malaman ang konteksto" gayong alam na ang target | Basahin lang ang file na aayusin |
| Grep sa buong repo gayong nabanggit na ang path | Puntahan ang path |
| Refactor na hindi hiningi, cleanup na "kasi nandito na rin ako" | Iwan. Isang linya sa dulo kung sulit banggitin |
| Ayusin ang ibang bug na nakita habang dumadaan | Isang linya sa dulo. Hindi detour |
| Magdagdag ng test, doc, o type na walang humihingi | Hindi bahagi ng task |
| Tignan ang buong system kung "may iba pang sira" | Ang task lang ang saklaw |
| Mahabang paliwanag bago magsimula | Isang linya, tapos gawin na |

**Sa step 2 (plano):** ang plano ay ang task lang. Ang step na hindi hinihingi ng
task ay padding — tanggalin bago pa ipakita. Mas maikling plano na tumpak ang mas
mahusay kaysa mahabang plano na kumpleto sa "baka".

**Sa step 3–4 (hanap ng skill):** isang ranking run sa loob, isang pasada sa
labas. Hindi limang variation ng query para "sigurado". Oo, obligado ang remote
hunt — pero isang pasada lang iyon, hindi imbestigasyon. Ang paghahanap ay
mabilis at libre; ang pag-install ang may bigat, at may sariling tickbox iyon.

**Sa step 7–8 (gamit ng skill):** ⚠️ **ang naka-load na skill ay hindi lisensya
para lumaki ang trabaho.** Marami sa kanila ay may mahabang checklist —
`ui-ux-pro-max` ay may buong design audit, `security-auditor` ay may buong
compliance sweep. Kung ang hiningi ay ayusin ang isang button, **ang button lang
ang aayusin.** Gamitin ang skill bilang paraan ng paggawa ng task, hindi bilang
listahan ng karagdagang trabaho. Ang skill ay sumusunod sa task; hindi ang task
sa skill.

**Kapag may nakitang iba na sira:** isang pangungusap sa dulo ng final message —
`Nakita ko rin: may stale import sa X.` Wala nang iba. Si Ivan ang magsasabi kung
aayusin iyon, at iyon ay bagong task, hindi extension ng kasalukuyan.

## ⛔ HUWAG MAG-OVERTHINK, HUWAG MAG-OVER-ENGINEER, AT DRY

Tatlong magkakaugnay na panuntunan sa paraan ng paggawa. Ang una ay tungkol sa
pag-iisip, ang pangalawa sa pagsusulat, ang pangatlo sa muling paggamit.

### 1. Huwag mag-overthink — kapag alam mo na, gawin mo na

**Kapag sapat na ang alam para kumilos, kumilos.** Ang pag-aaral ng tatlong
approach para sa isang one-line fix ay hindi pag-iingat, sayang na oras iyon.

| ⛔ Bawal | ✅ Sa halip |
|---|---|
| Maglista ng 3 approach tapos pipiliin ang halata | Piliin ang halata, sabihin sa isang linya kung bakit |
| "Let me consider the trade-offs…" sa isang rename | I-rename mo na |
| Ulitin ang kabisado na — muling basahin ang file na kababasa lang | Alam mo na. Tuloy |
| Magtanong ng malinaw naman sa repo | Tignan ang repo, huwag magtanong |
| Habulin ang edge case na hindi mangyayari | Ang totoong kaso ang ayusin |

Ang tanging tanong na sulit itanong ay iyong **magbabago ng gagawin**. Lahat ng
iba ay sagutin mo sa sarili mo at magpatuloy.

### 2. Huwag mag-over-engineer — ang pinakasimpleng gumagana ang tama

**Sagutin ang task, hindi ang haka-haka nitong lalaki pa.** Ang code na walang
tumatawag ay hindi flexibility, dagdag na aalagaan lang iyon.

| ⛔ Bawal | ✅ Sa halip |
|---|---|
| Abstraction para sa **isang** caller | Isulat nang diretso. Ab-abstract kapag may pangatlo na |
| Config flag / option na walang humihingi | Hard-code. Idagdag kapag hiningi na |
| Interface o base class para sa isang implementation | Ang klase mismo |
| Bagong utility file para sa 4 na linya | Ilagay sa file na gumagamit nito |
| Error handling para sa imposibleng state | Ang totoong failure mode lang |
| Cache, queue, o retry na walang measured na dahilan | Wala. Idagdag kapag may sukat na |
| "Para handa sa susunod" | Walang susunod hangga't hindi hiniling. YAGNI |

Ang test: **may tumatawag ba nito ngayon?** Wala → huwag isulat.

### 3. DRY — gamitin ang meron, huwag gumawa ng pangalawang bersyon

**Bago ka magsulat, tignan kung meron na.** Ang pinakakaraniwang pinagmumulan ng
drift sa repo na ito ay pangalawang sulat-kamay na bersyon ng bagay na meron na —
isa pang Avatar, isa pang card style, isa pang date formatter.

| ⛔ Bawal | ✅ Sa halip |
|---|---|
| Sulat-kamay na `<img>` para sa mukha ng tao | `Avatar.tsx` / `Avatar.jsx` — kayang-kaya na nito |
| Bagong card style na kamukha ng meron | I-import ang umiiral. Kulang? I-extend, huwag i-fork |
| Kopyahin ang bloke ng CSS sa pangalawang screen | Token o klase na parehong ginagamit |
| Ulitin ang parehong logic sa `app/` at `web/` | Kunin sa isang lugar kung kaya; kung hindi, isang linyang comment na magkapatid sila |
| Literal na hex na katumbas ng token | `var(--ink)` at iba pa — panuntunan na ito ng repo |

**Ang hangganan sa pagitan ng DRY at over-engineering** — mahalagang malaman,
kasi nagbabanggaan sila:

> Ang DRY ay **paggamit ng meron na**. Hindi ito pag-imbento ng abstraction sa
> ikalawang pagkakataon. Dalawang magkatulad na bloke ay kadalasang mas mabuting
> iwang dalawa; sa ikatlo, saka ka mag-isip ng pagsasama. Ang maagang abstraction
> ay over-engineering na naka-DRY lang ang pangalan.

---

## 1. Kunin ang task

**Args given** (`/tulong ayusin mo yung booking screen`) → that IS the task.
Skip straight to step 2. Do not ask anything.

**No args** (`/tulong` alone) → one `AskUserQuestion`, in Taglish, with concrete
options drawn from what is actually in this repo — not generic categories. The
automatic "Other" is the free-text escape.

Header `Gagawin`, question `Anong gusto mong gawin?`, e.g.:

- `Ayusin ang hitsura ng isang screen` — design, layout, kulay, spacing
- `Hanapin kung bakit may sira` — bug, error, ayaw gumana
- `Gumawa ng bagong feature` — bagong screen, endpoint, o flow
- `Suriin ang code bago i-deploy` — review, security, performance

If the answer is still vague (`ayusin mo to`), pull the concrete noun out of the
repo context yourself rather than asking a second time.

## 2. Gumawa ng plano — BAGO pumili ng skill

Write the plan first. The plan is what makes the skill search accurate: you
cannot rank skills against "ayusin mo yung booking" but you can rank them
against "read the availability endpoint, fix the timezone maths, re-check the
PWA screen, port the same fix to `web/`".

Show it as numbered steps — short, one line each, with the files or areas named:

> **Plano:**
> 1. Basahin ang `app/src/features/booking/BookingScreen.tsx` at ang `/availability` endpoint
> 2. Hanapin kung saan nawawala ang timezone offset
> 3. Ayusin sa `api/`, tapos sa PWA
> 4. Port ang parehong fix sa `web/` (CLAUDE.md rule — both trees)
> 5. Lint + tignan sa staging

Keep it to 3–7 steps. This plan is the thing step 8 asks about, and the thing
the loaded skills carry out — so it has to be real work, not a restatement of
the question.

Do **not** ask about the plan here. Step 8 is where it gets confirmed.

## 3. Local sweep — lahat ng nasa makina

```bash
node ~/.claude/skills/tulong/find-skill.mjs "<the task + the plan's key nouns>"
```

Feed it the task **and** the plan's concrete nouns — that is what makes this
better than ranking the raw question.

Pass `--root` for **every** working directory of the session, so workspace
skills are seen. In the PickleBallers workspace that is both trees:

```bash
node ~/.claude/skills/tulong/find-skill.mjs \
  --root /Users/jhonivancuaco/Documents/PICKLEBALLER-WORKSPACE/live \
  --root /Users/jhonivancuaco/Documents/PICKLEBALLER-WORKSPACE/staging \
  --limit 10 \
  "timezone bug sa booking availability endpoint, ayusin sa api at PWA at web"
```

Other flags: `--list` (browse everything by source), `--json` (structured),
`--limit N` (default 6), `--depth N` (nested `.claude/skills/` scan depth,
default 3).

Output per match: `name [source · invocable|REFERENCE-ONLY] score`, a `why:`
line naming the exact tokens that hit, the description, and the path.

**Read the ranking, then use judgment.** Score order is a strong hint, not a
verdict — a score-19 skill whose `why:` is all one stray token loses to a
score-13 one that plainly describes the task.

**⛔ Tanggalin sa shortlist ang `verification-before-completion`.** Kahit
lumabas ito sa ranking — at madalas lumalabas, dahil halos lahat ng task ay may
"tapos na ba?" na dulo — **huwag mo itong isasama sa mga kandidato.** Hindi ito
pinipili; **laging naka-load** (tingnan ang step 7). Ang paglalagay nito sa
tickbox ay nagbibigay ng ilusyon na pwedeng i-off — hindi pwede.

## 4. Hanap sa labas — LAGING TUMATAKBO, HANAP LANG, WALA PANG INSTALL

**Obligado ito at walang kondisyon.** Tumatakbo ang step na ito sa **bawat** run
ng `/tulong` — kahit mukhang perpekto na ang local sweep, kahit mataas ang score
ng #1, kahit halatang kaya na ng nasa makina. Walang "skip", walang "hindi na
kailangan", walang "sapat na ang local".

**Bakit.** Ang mga skill sa makinang ito ay litrato ng isang araw. Ang
open-source na mundo ay gumagalaw araw-araw — pwedeng may skill na mas bagay sa
task kaysa sa pinakamalapit na nasa disk, at hindi mo iyon malalaman kung hindi
ka titingin. Libre at mabilis ang tingin; ang hindi pagtingin ang mahal, dahil
hindi mo nakikita ang na-miss mo.

**Tatlong linya ang buong step:**

1. **Hanapin** — sa buong open source, hindi sa isa o dalawang registry.
2. **Isuggest ang bago** — anumang nahanap na **wala pa sa makina** ay pumapasok
   sa listahan ng kandidato sa step 5, kahit may maayos nang local match.
3. **Walang ini-install dito** — ang tickbox ng step 5 ang nag-iinstall.

> ⛔ **Walang na-download sa step na ito.** Hanap, basahin ang resulta, gumawa ng
> listahan ng kandidato. Ang `add` at `curl -o` ay nasa step 5 at tumatakbo lang
> pagkatapos tumik ni Ivan. Ang install bago ang tickbox ay bug sa flow, hindi
> shortcut.

### Saan hahanap — LAHAT ng kilalang pinagkukunan, hindi dalawang site lang

⛔ **Hindi sapat ang skills.sh at skillsmp.** Iyon ang dalawang registry na may
sariling API, kaya sila ang pinakamadaling tawagan — at iyon lang ang dahilan.
Hindi sila ang mundo. **Ang buong Tier 1 sa ibaba ay tinatakbo sa bawat run.**

#### Tier 1 — obligado, lahat ng ito, bawat run

| Pinagkukunan | Paano | Bakit hindi pwedeng laktawan |
|---|---|---|
| **GitHub repo search** | `api.github.com/search/repositories?q=…` — anonymous, ~10 req/min | **Ito ang pinaka-produktibo, malayo.** Dito nakita ang `rshankras/claude-code-apple-skills` (641★) at `conorluddy/ios-simulator-skill` (1219★) na wala sa kahit aling registry |
| **GitHub topics** | `q=topic:claude-skill`, `topic:claude-skills`, `topic:agent-skills`, `topic:claude-code-skills`, `topic:claude-code-plugin` | Ang tamang-tag na repo ay hindi laging tumatama sa keyword search |
| **Anthropic mismo** | hanapin ang `anthropics/skills` at ang skills sa loob ng `anthropics/claude-code` | Official, pinakamataas ang tiwala. Tignan ang pangalan bago i-assume — nagbabago ang layout |
| **skills.sh** | `npx skills find` — may install counts | Install count ang pinakamalinaw na trust signal |
| **skillsmp.com** | plain REST, may stars | Iba ang index nito sa skills.sh, kaya iba ang nahahanap |
| **Awesome lists** | hanapin sa GitHub ang `awesome claude code` / `awesome claude skills`, tapos i-raw ang README | Dito mauna ang bago bago pa ito ma-index ng registry |
| **awesomeclaude.ai** | `https://awesomeclaude.ai/awesome-claude-skills` — 204 skills, 13 kategorya; ang README ng `BehiSecc/awesome-claude-skills` ang pinagmulan | **Naka-curate at may kategorya**, at ang mga repo dito ay hindi lahat naka-index sa skills.sh o skillsmp — hal. `sanjay3290/ai-skills`, `webfuse-com/awesome-claude`, `obra/superpowers` |
| **onewave-ai** | `https://www.onewave-ai.com/resources/claude-skills` — 187 skills sa isang MIT repo, `OneWave-AI/claude-skills` | **Isang monorepo, isang folder kada skill**, kaya diretso ang raw fetch. Malakas sa business, sales, marketing, design — mga bihirang lumabas sa dev-heavy na registry |
| **Claude Code plugin marketplaces** | `/plugin marketplace add <owner/repo>` — ang plugin ay may kargang skills | Maraming skill ay naka-bundle sa plugin, hindi naka-solo |
| **Ang bukas na web** | `WebSearch` — `"claude skill" SKILL.md <topic> site:github.com` | Para sa wala sa alinmang registry |

#### Tier 2 — tignan kapag manipis ang nakuha sa Tier 1

| Pinagkukunan | Paano |
|---|---|
| **npm** | `npm search "claude skill <topic>"` — may naka-package bilang npm module |
| **Template/aggregator sites** | `claude-code-templates` at kauri — nagko-collect ng skills, agents at commands |
| **MCP registries** | smithery.ai, mcp.so, PulseMCP, Glama — kadalasan may kasamang skill ang MCP server |
| **Hugging Face** | may collections ng agent skills |
| **Community** | Reddit `r/ClaudeAI`, X, Discord — sa `WebSearch`, dito lumalabas ang pinakabago |

**Ang panuntunan ay saklaw, hindi bilang.** Hindi na "dalawa ang minimum" —
**lahat ng Tier 1.** Tigil lang kapag pare-parehong pangalan na ang lumalabas sa
tatlo o higit pang pinagkukunan; iyon ang senyales na naabot na ang dulo. Kapag
may pinagkukunang bumagsak (down, 429, nag-error ang CLI), **sabihin kung alin at
ituloy ang iba** — hindi ito dahilan para maging dalawa ang natakbo.

**Bagong registry na lumitaw bukas ay kabilang dito.** Ang listahang ito ay hindi
limitasyon — ito ang kilala ngayon. Kung may bago, idagdag sa Tier 1 at gamitin.

### skills.sh — `npx skills find`

The REST API at `skills.sh/api/v1` needs a Vercel OIDC token and will answer
`authentication_required` from curl. **Use the CLI instead** — it works
non-interactively as long as stdin is not a TTY, so pipe an empty line in:

```bash
echo "" | npx -y skills@latest find "playwright visual regression" 2>&1 | /usr/bin/head -30
```

Prints ranked `owner/repo@skill` lines with install counts and a `skills.sh`
URL. Install counts are the trust signal — prefer a few-thousand-install skill
from a known org over a 3-install one.

Peek inside a repo without installing: `npx -y skills@latest add <owner/repo> -l`.
The `-l` is a **list** flag; it downloads nothing.

### skillsmp.com — plain REST, no key needed

Anonymous access is 50 requests/day, 10/min — plenty for this.

```bash
curl -sS --max-time 25 \
  "https://skillsmp.com/api/v1/skills/search?q=stripe%20webhook&limit=8&sortBy=stars" \
  | python3 -m json.tool | /usr/bin/head -60
```

Each hit carries `name`, `description`, `author`, `stars`, `githubUrl` (a GitHub
**tree** URL) and `skillUrl`. Optional params: `page`, `category`, `occupation`,
`language`, `sortBy=stars|recent`.

### GitHub — repo search, walang token na kailangan

```bash
curl -sS --max-time 20 \
  "https://api.github.com/search/repositories?q=claude+skill+stripe+webhook&sort=stars&per_page=8" \
  | python3 -c "import json,sys;[print(r['stargazers_count'], r['full_name'], (r['description'] or '')[:70]) for r in json.load(sys.stdin)['items']]"
```

- **Repo** search answers anonymously (~10 requests/min). **Code** search does
  not — it needs a token, and there is no `gh` CLI on this Mac. Build the hunt on
  repo search plus raw `SKILL.md` fetches, not on `gh search code`.
- A hit is only a candidate once its `SKILL.md` has been seen:
  `curl -sSL --max-time 20 https://raw.githubusercontent.com/OWNER/REPO/main/SKILL.md | /usr/bin/head -20`
  — a collection keeps them at `skills/<name>/SKILL.md` instead of the root.
- Stars are the trust signal here, the way install counts are on skills.sh.

### Awesome lists at ang bukas na web

Curated collections carry the newest skills before either registry indexes them.
Find the list itself on GitHub (`awesome claude skills`), open its README raw,
and read the table.

For a task neither registry knows, `WebSearch` is the last pass — e.g.
`"claude skill" SKILL.md <framework> site:github.com`. What comes back is almost
always a repo; vet it exactly like a GitHub hit above.

⚠️ **Mas malawak ang hanap, mas mahigpit ang pagsala.** Ang galing sa registry ay
dumaan man lang sa isang listahan; ang galing sa raw na web ay wala. Bago
isuggest ang isang bagay na walang install count at walang stars, **basahin ang
`SKILL.md` nito.** Hindi mabasa → hindi ito pumapasok sa tickbox.

### awesomeclaude.ai — 204 curated, may kategorya

Ang site ay **visual front-end lang** ng isang awesome list, at Nuxt SSR ito —
~340 KB ng HTML kada hit. **Ang README ang hinihingi, hindi ang page**: pareho
ang laman, isang fetch, walang tags na aalisin.

```bash
curl -sSL --max-time 20 \
  https://raw.githubusercontent.com/BehiSecc/awesome-claude-skills/main/README.md \
  | grep -i "<topic>" | /usr/bin/head -20
```

- Ang bawat entry ay `[pangalan](github-url) — deskripsyon`, nakagrupo sa 13
  kategorya (Document, Development & Code, Data & Analysis, Security & Web
  Testing, Utility & Automation, at iba pa). May **Collections** section sa dulo
  — doon ang mga repo na maraming skill ang karga.
- **Walang install count at walang stars ang listahan mismo.** Kaya ang panuntunan
  sa itaas ang bumabagsak dito nang buo: basahin ang `SKILL.md` bago isuggest.
  Hindi mabasa → hindi ito pumapasok sa tickbox.
- Kapag bumagsak ang raw README (404, ibang branch), ang page ang fallback:
  `curl -sS --max-time 25 -A 'Mozilla/5.0' https://awesomeclaude.ai/awesome-claude-skills`,
  tapos salain ang tags.

### onewave-ai — 187 skills, isang MIT repo

Isang monorepo, at **isang top-level directory kada skill** — kaya ang GitHub
contents API ang pinakamalinaw na tingin, hindi ang page:

```bash
curl -sS --max-time 20 "https://api.github.com/repos/OneWave-AI/claude-skills/contents/" \
  | python3 -c "import json,sys;[print(i['name']) for i in json.load(sys.stdin) if i['type']=='dir']" \
  | grep -i "<topic>"
```

Tapos basahin ang `SKILL.md` nito bago isuggest:

```bash
curl -sSL --max-time 20 \
  "https://raw.githubusercontent.com/OneWave-AI/claude-skills/main/<skill>/SKILL.md" \
  | /usr/bin/head -20
```

- **Dito ito malakas:** sales, marketing at content, consulting, operations,
  design, Claude Cowork — mga bagay na manipis sa dev-heavy na registry. May
  coding skills din (52 sa 187).
- MIT lahat at isang may-ari, kaya isang tiwala ang tinitimbang — hindi
  isa-isang repo ng magkaibang tao.
- Ang install ay walang `npx skills` na daan: **raw fetch ng buong folder**, gaya
  ng GitHub sa step 5 sa ibaba.

### Ano ang isinusuggest — at ano ang hindi

**Ang panuntunan:** nahanap at **wala pa sa makina** → kandidato sa step 5.
Nahanap pero **naka-install na** → hindi na ito bagong install; kung bagay sa
task, dumidiretso ito sa shortlist ng step 6.

Pero ang pagiging kandidato ay hindi awtomatikong `(Recommended)`. Sa mga ito,
**ipinapakita pa rin ito sa tickbox pero hindi inirerekomenda** — nakikita ni
Ivan, siya ang bahalang tumik:

| Sitwasyon | Bakit hindi ito `(Recommended)` |
|---|---|
| May local match na, hindi lang perpekto | A usable local skill beats a downloaded specific one — it is already trusted, already read, already on disk. Ipakita ang bago; huwag itulak. |
| Generic na local skill ang sumasaklaw | `api-design-principles` on a webhook task is a real, working match. "Mas bagay sana kung may dedicated" is a wish, not a gap. |
| Mababa ang score pero tama naman ang `why:` | Score is a keyword heuristic. A score-7 skill whose `why:` genuinely describes the plan is a match; trust the `why:`, not the number. |
| Gusto ng pang-second opinion / reviewer | `/code-review`, `/security-review` and `/simplify` are built in and always available. |
| Ordinary code work — read, edit, fix, test | **No skill is needed at all.** This is the most common case by far. Doing the task directly is the right answer. |
| Walang install count, walang stars, hindi mabasa ang `SKILL.md` | Hindi lang ito hindi rekomendado — **hindi ito kandidato.** Huwag isama. |

**"Walang sulit i-install" ay tamang sagot, at madalas ito ang tama.** Laging may
nahahanap ang malawak na search; hindi lahat ng nahanap ay dapat mapunta sa
makina ni Ivan. Kung wala talagang sulit, sabihin sa isang linya kung ano ang
nakita at bakit walang pumasok, laktawan ang tickbox ng step 5, at dumiretso sa
step 6. Ang masamang match na na-download ay mas malala kaysa walang skill — file
iyon sa makina ni Ivan na tumatakbo nang buong agent permissions at hindi pa
nakakatulong.

⛔ **Ang obligadong hanap ay hindi obligadong install.** Magkaiba ang dalawa, at
ang paghalo sa kanila ang pinakamadaling paraan para mapuno ng basura ang
`~/.claude/skills/`. Hanap: laging. Install: kapag tinikan lang.

### Build the candidate list

Shortlist **at most 4** — that is one tickbox question, and more than a handful
of new skills for one job means the plan is too broad, not that the machine is
short of skills. A search this wide will often return more than four worth a
look; cut to the best four and say in one line what was dropped.

| Field | Where it comes from |
|---|---|
| name | `owner/repo@skill`, skillsmp's `name`, or the repo's skill directory |
| source | `skills.sh`, `skillsmp`, `github`, `awesomeclaude`, `onewave`, `web` |
| trust | install count (skills.sh), `stars` (skillsmp / GitHub), or **the `SKILL.md` you read** when it has neither |
| naka-install na? | already on disk → **not** an install candidate; it goes straight to step 6 |
| why | the numbered plan step it serves |
| collision | does `ls ~/.claude/skills` or the built-in list already hold this name? |

**Check the collision before showing it, not after.** A remote skill installs to
`~/.claude/skills/<name>/` and will shadow a same-named built-in —
`alirezarezvani/claude-skills@init` takes over `/init`. A colliding candidate is
shown with `[COLLISION — papatong sa /<name>]` in its label so an uninformed
tick is impossible.

## 5. Ano ang iinstall? — tickboxes BAGO mag-download

One `AskUserQuestion` with **`multiSelect: true`**, listing every candidate from
step 4. Nothing reaches the disk until this comes back.

- Header `I-install`, question
  `Alin sa mga ito ang iinstall? (alisan ng tick ang ayaw mong ma-download)`.
- **Order by recommendation, best first.** `(Recommended)` at the end of the
  label for the ones the plan actually needs.
- Label carries the name, the source and the trust number:
  `playwright-testing [skills.sh · 2.8K installs] (Recommended)`.
- The `description` is **why it is being installed** — the numbered plan step it
  serves — plus the repo it comes from, so the origin is visible before the tick.
- Flag `[COLLISION — papatong sa /<name>]` on any name clash from step 4.
- Max 4 options, so max 4 install candidates. If the hunt turned up more, cut to
  the best 4 and say in one line what was dropped.

**Unticked means never downloaded.** Do not install it "just in case", do not
install it and leave it unloaded, and do not re-propose it later in the same
run. If Ivan unticks everything, say so plainly and carry on with the local set.

### Then, and only then, install the ticked ones

**skills.sh** — one skill, globally, no prompts:

```bash
npx -y skills@latest add <owner/repo> -s <skill-name> -a claude-code -g -y --copy
```

- `-s <skill-name>` is **mandatory** — a repo can hold hundreds of skills
  (`alirezarezvani/claude-skills` has 341). Without it the installer stalls
  waiting for a picker that never renders, exits 0, and installs **nothing**.
- `-a claude-code` targets this agent; `-g` puts it in `~/.claude/skills/<name>/`;
  `--copy` writes real files instead of symlinks, so the ranking script sees it.
- Add `-p` instead of `-g` only when the skill is genuinely repo-specific.
- The installer prints a Socket/Snyk risk panel **after** the tick. If it comes
  back anything other than `Safe` / `0 alerts`, **stop and tell Ivan** — the tick
  was consent to install a skill believed clean, not consent to a flagged one.

**skillsmp.com, GitHub at web** — turn the tree URL into a raw URL and fetch the
`SKILL.md`:

```
https://github.com/OWNER/REPO/tree/BRANCH/path/to/skill
        ↓
https://raw.githubusercontent.com/OWNER/REPO/BRANCH/path/to/skill/SKILL.md
```

```bash
mkdir -p ~/.claude/skills/<name>
curl -sSL --max-time 20 \
  "https://raw.githubusercontent.com/OWNER/REPO/BRANCH/path/to/skill/SKILL.md" \
  -o ~/.claude/skills/<name>/SKILL.md
/usr/bin/head -5 ~/.claude/skills/<name>/SKILL.md   # confirm the frontmatter landed
```

**Read the fetched `SKILL.md` before it is used.** No Socket/Snyk gate on this
path — it is a raw file off the internet that will run with full agent
permissions. If it shells out to anything unexpected, delete it and say why.

If a skill has extra files (scripts, references) the single-file fetch misses
them — prefer the `npx skills add` route for those, or clone the subdirectory.

### Confirm each install actually landed

A zero exit code is not proof. Check the directory, every time:

```bash
ls -d ~/.claude/skills/<name> && /usr/bin/head -3 ~/.claude/skills/<name>/SKILL.md
```

Report the result in one line — `2 na-install: playwright-testing, stripe-webhooks`
— and if one failed, say which and carry on without it rather than retrying blind.

## 6. Ipakita lahat — tickboxes ng gagamitin

One `AskUserQuestion` with **`multiSelect: true`**. Every candidate from step 3
and every skill actually installed in step 5 goes in. Ivan ticks what he wants
used and leaves out the rest.

- Header `Skills`, question `Alin ang gagamitin? (alisan ng tick ang ayaw mo)`.
- **Order by recommendation, best first.** Put `(Recommended)` at the end of the
  label for the ones the plan actually needs, so the default read is obvious.
- The `description` of each option is **why it is here** — the step of the plan
  it serves. Not the skill's own blurb.
- Mark provenance in the label: `[workspace]`, `[personal]`, `[builtin]`,
  `[bago — skills.sh]`, `[bago — skillsmp]`, `[bago — awesomeclaude]`,
  `[bago — onewave]`.
- Mark `[REFERENCE-ONLY]` on any that cannot be `Skill()`-loaded, so an unticked
  one is an informed choice.
- ⛔ **Wala rito ang `verification-before-completion`.** Hindi ito option, hindi
  ito `(Recommended)`, hindi ito nakatick-by-default — wala talaga ito sa listahan.
  Awtomatiko itong naka-load sa step 7, kaya ang paglabas nito dito ay bug.

**A step-5 tick is not a step-6 tick.** Something just installed still has to be
ticked here to be used — mark it `(Recommended)`, since Ivan approving the
download is a strong signal, but do not treat it as already chosen.

## 7. Auto-load sa session

Load every ticked skill, now, before asking step 8:

- `invocable` → `Skill({ skill: "<name>" })`.
- `REFERENCE-ONLY` → **do not** call `Skill()`; it will not load. `Read` the path
  the ranking printed and follow it as guidance.
- Freshly installed ones → `Skill({ skill: "<name>" })` works the moment the
  directory exists; if it errors, `Read` `~/.claude/skills/<name>/SKILL.md`
  instead and carry on. Do not restart the session over it.
- Load them in the order they will be used — builder first, reviewer last.

### `verification-before-completion` — laging naka-load, hindi tinatanong

**Bago ang lahat ng ticked skill, i-load ito — tahimik, walang tanong.**

```
Skill({ skill: "verification-before-completion" })
```

- **Hindi ito lumalabas sa alinmang tickbox** (step 5 o step 6). Hindi ito
  pinipili ni Ivan dahil hindi ito optional — ito ang panuntunan na "patunay
  bago sabihing tapos", at yun ay totoo sa **bawat** task.
- **Kung hindi pa naka-install**, i-install muna — tahimik, walang tanong. Ito
  lang ang skill na pwedeng i-install nang hindi dumadaan sa tickbox ng step 5.
- **Kung bigo ang install, o wala na ang pinanggalingan** (404, offline, tanggal
  na sa registry), **huwag nang pilitin.** Sabihin sa isang linya na wala ito,
  huwag i-load, at ituloy ang trabaho nang wala nito. Hindi ito dahilan para
  ihinto ang task, at hindi ito sinusubukan muli sa parehong session.
- **Isang linya lang ang sasabihin tungkol dito** — hal. `+
  verification-before-completion (laging naka-load)`. Huwag ipaliwanag,
  huwag ipagtanggol, huwag gawing sariling talata.

Then say, in one or two lines, what got loaded and why that order:

> Naka-load: **systematic-debugging** (hanapin ang ugat ng timezone bug) →
> **ui-ux-pro-max** (ayusin ang screen) → **code-review** (bago i-deploy).
> `idiot-tester` ang #1 sa ranking pero QA persona 'yon, at ang hiningi mo ay
> ayusin, hindi suriin.

Once a skill is loaded, **its instructions outrank this file** for the work
itself. This file still owns step 8.

## 8. Okay na ba? — tapos simulan

Last question. Re-show the plan from step 2 — updated if a loaded skill changed
the approach — and ask whether to start.

`AskUserQuestion`, header `Simulan`, question `Okay na ba ang plano? Sisimulan ko na?`:

- `Sige, simulan mo na` — go
- `Ayusin muna ang plano` — take the correction, revise, ask again
- `Palitan ang skills` — back to step 6 with the same shortlist

On go, **do the work — diretso.** Follow the loaded skills, follow the plan,
report progress per the global rules. The plan's steps are the checklist:
nothing on it gets dropped without saying so, and **nothing that is not on it
gets done.** Both halves matter. A plan of five steps that ships seven is as
wrong as one that ships three.

No preamble before starting — the plan was already shown and approved at this
point, so restating it is dead air. Start at step 1 of the plan and go.

If the shortlist came back empty — nothing local fitted, and the remote hunt,
which always runs, found nothing worth installing — say so plainly and run the
plan directly with no skill loaded. A forced bad match is worse than none, and
doing the work with no skill at all is the ordinary case, not an admission of
failure.

---

## Gotchas

- **`-s <skill>` is not optional on `npx skills add`.** Omitting it on a
  multi-skill repo prints `Found 341 skills`, exits **0**, and installs nothing.
  A zero exit code is not proof of an install — check
  `ls -d ~/.claude/skills/<name>` before believing it.
- **Two tickboxes, and neither substitutes for the other.** Step 5 gates the
  download, step 6 gates the use. Installing something Ivan unticked at step 5 is
  the worst failure this skill has, because it puts a file on his machine he said
  no to. Searching is free and obligatory; downloading is neither.
- **The remote hunt has no off switch.** It is not gated on the local score any
  more — a perfect local match still gets a search run beside it. What a strong
  local match changes is the *recommendation*, never whether you look.
- **GitHub repo search is anonymous; code search is not.**
  `/search/repositories` answers without a token at ~10 req/min;
  `/search/code` returns 401, and `gh` is not installed on this Mac. Do not
  design the hunt around a CLI that is not there.
- **A hit is not a candidate until its `SKILL.md` has been read.** A registry hit
  carries a trust number; a repo off a web search carries nothing at all. Unread
  and untrusted means it never reaches the tickbox.
- **Do not ask an empty tickbox.** No remote candidates → skip step 5 entirely and
  go to step 6. A question with nothing worth ticking reads as a bug.
- **A remote skill can shadow a built-in.** `alirezarezvani/claude-skills@init`
  installs as `~/.claude/skills/init` and takes over `/init`. Before installing,
  check the name against the built-in list below and against `ls ~/.claude/skills`
  — rename the directory or skip it if it collides.
- **skills.sh REST is gated, the CLI is not.** `curl .../api/v1/skills/search`
  → `authentication_required` (Vercel OIDC). `npx skills find` needs no token.
  Do not report skills.sh as unreachable on the strength of the curl.
- **⚠️ `npx skills` dies under Node 18 — and `/usr/local/bin/npx` IS Node 18 on
  this Mac.** It crashes with `SyntaxError: The requested module 'node:util' does
  not provide an export named 'styleText'` (added in Node 20). Forcing
  `PATH=/usr/bin:/bin` makes it worse — `npx` disappears entirely
  (`command not found`). Resolve a Node 20+ binary first, e.g.
  `zsh -lc 'which -a node npx'` or an nvm/Homebrew path, and call that npx.
  **A crash here is not "skills.sh is down"** — it is the local Node version, and
  the remaining Tier 1 sources still have to run.
- **skillsmp search is noisy on short queries.** `q=ios` returns Cisco IOS
  patterns, SwiftUI collections and monorepo hits whose `stars` are the *parent
  repo's* (386,424 on one), so the number is not a per-skill trust signal there.
  Query with two or three specific words (`capacitor ios build`), and read the
  `githubUrl` — a hit buried at `…/docs/ja-JP/skills/…` is a translated copy, not
  a separate skill.
- **GitHub repo search out-performs both registries for anything niche.** On a
  Capacitor/iOS hunt the registries returned near-noise while repo search
  surfaced two skills over 600 stars. When a task is framework- or
  platform-specific, weight GitHub first.
- **`skills find` needs a non-TTY stdin** to print instead of prompting — hence
  the `echo "" |` prefix. Without it, it opens an interactive picker that a tool
  call cannot answer.
- **`timeout` does not exist on this Mac.** No coreutils in PATH; use the Bash
  tool's own `timeout` parameter, or `gtimeout` if it is ever installed.
- **`head` on this Mac is not GNU `head`.** `/Applications/XAMPP/xamppfiles/bin/head`
  shadows it and is perl's LWP `head` — `head -5` dies with `Unknown option: 5`.
  Use `/usr/bin/head` in any pipeline here.
- **Built-in skills are not on disk.** `/run`, `/code-review`, `/simplify`,
  `/loop`, `/schedule`, `/init`, `/dataviz`, `/security-review` and friends are
  injected into the prompt; `find /private/tmp/claude-501/bundled-skills -name SKILL.md`
  returns **zero**. They are hard-coded in the `BUILTIN` array at the top of
  `find-skill.mjs` — if the CLI ships a new one, add it there or the script is
  blind to it. Always sanity-check the ranking against the live skills listing
  in context, which is the real authority on what can load.
- **10 of the personal skills cannot be invoked.** They carry
  `user-invocable: false` + `disable-model-invocation: true` (`api-design-patterns`,
  `root-cause-tracing`, `hono-*`, `mongodb`, `typescript-core`,
  `express-production`, `dependency-audit`, `nodejs-backend`). They are absent
  from the slash-command list and `Skill()` will not load them. The script marks
  these `REFERENCE-ONLY` — `Read` them instead. `root-cause-tracing` ranks #1 on
  debugging queries, so this case comes up immediately, not rarely.
- **`node_modules` is pruned** by the workspace scanner, along with `.git`,
  `dist`, `build`, `.next`. A vendored package shipping its own `.claude/skills`
  will not pollute the ranking — verified with a decoy fixture.
- **Workspace skills get a +4 source bonus** so a repo-local `run-api` beats a
  generic `api-design-principles`. That is deliberate: the local one knows the
  ports and the accounts.
- **Taglish is handled by a hand-built lexicon**, not by the model — `ayusin→fix`,
  `pangit→design/ui/usability`, `bakit→root/cause/debug`, `tignan→review/audit`,
  `patakbuhin→run/launch/start`. `tignan` and `tingnan` are both mapped; that
  spelling split is the single most common miss. When a query obviously should
  have matched and did not, add the word to `LEX` rather than fighting the score
  — `patakbuhin` was missing at first and "patakbuhin mo yung api" returned
  `seo-audit` instead of `/run`.
- **English suffixes are stemmed** (`debugging→debug`, `testing→test`). Without
  it a login-bug query ranked `signup` above `systematic-debugging`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `no confident match` | Query was mostly stopwords. Re-run with the plan's concrete nouns (`booking availability endpoint`, `GCash payment`) instead of `ayusin mo to`. |
| Workspace skill missing from the ranking | `--root` was not passed for that directory, or it is deeper than `--depth 3`. Confirm with `--list` — it prints a `workspace` section when any are found. |
| `Skill()` fails with an unknown-skill error | It is `REFERENCE-ONLY`, or freshly installed and not yet registered. `Read` the printed path instead. |
| `npx skills add` exits 0 but nothing installed | `-s <skill>` was missing. Re-run with it. |
| `authentication_required` from skills.sh | That is the REST API. Use `echo "" \| npx -y skills@latest find "<query>"`. |
| skillsmp returns 429 | Anonymous cap is 50/day, 10/min. Wait a minute, or fall back to skills.sh. |
| awesomeclaude.ai returns a 340 KB wall of HTML | You fetched the page. Fetch `BehiSecc/awesome-claude-skills`'s raw `README.md` instead — same list, no tags. |
| A OneWave skill has no `npx skills` entry | It never had one. `OneWave-AI/claude-skills` is a plain monorepo — install it by raw-fetching the skill's folder. |
| Raw `SKILL.md` fetch 404s | The tree URL's branch is not `main`, or the skill lives one directory deeper. Open the `githubUrl` and copy the real path. |
| `Unknown option: 5` from a pipeline | XAMPP's `head`. Use `/usr/bin/head`. |
| `command not found: timeout` | Expected on this Mac. Use the Bash tool's `timeout` parameter. |
| Ranking looks stale after adding a skill | No cache — it reads disk each run. The skill dir must contain `SKILL.md` exactly, with `---` frontmatter and a `name:`. |
