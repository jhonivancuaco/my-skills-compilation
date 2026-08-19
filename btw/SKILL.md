---
name: btw
description: Sagutin ang isang side question — "by the way…" — nang hindi ginagalaw ang trabahong kasalukuyang ginagawa. Isang tuwid na sagot mula lang sa nasa usapan na, walang tool, walang edit, walang command, walang bagong task. Ito ang katumbas ng built-in /btw (na terminal-only) para magamit sa Claude Code VSCode extension at sa kahit anong session. Use when the user types /btw, or opens a message with "btw", "by the way", "side question lang", "tanong lang pala", "off-topic lang", "sandali lang, tanong" — a quick aside while another task is in flight.
argument-hint: <ang side question mo>
disable-model-invocation: false
---

# /btw — side question, hindi interruption

Isang tanong sa gilid. **Sagutin mo lang, tapos.** Walang trabahong sisimulan,
walang trabahong ihihinto.

Ito ang stand-in ng built-in `/btw` na gumagana lang sa terminal. Doon, isang
hiwalay na magaan na agent ang sumasagot sa isang panel sa tabi, habang tuloy
lang ang main agent. Dito, ikaw pa rin, pero **sundin mo ang parehong hangganan**
— iyon ang buong punto ng skill na ito.

## Ang lima ka utos

1. **Isang sagot lang, dito na mismo.** Walang follow-up turn, walang "next step".
2. **⛔ WALANG TOOL.** Walang Read, walang Bash, walang Grep, walang Edit, walang
   Write, walang WebFetch, walang subagent, walang deploy. Kahit isa.
3. **Ang alam mo lang ay ang nasa usapan na.** Sagutin mula sa context na nasa
   window na. Kung wala roon ang sagot — **sabihing hindi mo alam**, at kung anong
   kailangang tingnan para malaman. Huwag manghula ng mahaba.
4. **⛔ Huwag mangako ng aksyon.** Bawal ang *"Let me check…"*, *"I'll run…"*,
   *"Titingnan ko muna…"*, *"Tignan natin ang file…"*, *"Gagawin ko na…"*.
   Kung ang sagot ay nangangailangan ng pagtingin sa isang file, sabihin mo kung
   **aling file** ang may sagot — huwag mo itong buksan.
5. **⛔ Huwag galawin ang main task.** Hindi nababago ang todo list, hindi
   nadadagdagan ang task queue, hindi nauusad at hindi naaatras ang trabaho.
   Ang `/btw` ay **hindi** bagong task — tanong ito, kaya hindi ito pumapasok sa
   listahan ng session.

## Ang tono

- **Maikli.** 1–3 pangungusap, o maikling bullets kung listahan ang tinatanong.
  Hindi report, hindi essay, walang preamble.
- **Unang linya, sagot na agad.** Walang "Good question", walang paulit-ulit na
  pag-restate ng tanong.
- **Sundin ang wika ng tanong.** Tagalog → Tagalog. English → English.
  Taglish → Taglish.
- Kung *"ano to?"* / *"anong ginagawa nito?"* / *"paano gumagana?"* ang tanong,
  **bullets sa pagkakasunod ng nangyayari**, salitang pang-araw-araw — gaya ng
  nasa global rules.
- Huwag banggitin na ikaw ay "na-interrupt" o kung ano ang "ginagawa mo kanina" —
  mali ang framing na iyon. Isa itong tanong sa gilid, hindi paghinto.

## Percentage

- **Walang bukas na task → walang percentage.** Tanong lang ito. Diretso sa sagot.
- **May bukas pang task sa session → isang linyang footer lang sa dulo**, para
  makita na buhay pa ang trabaho at hindi ito nagalaw:

  `**Progress: 60%** — hindi nagalaw ng side question na ito; balik sa <task>.`

  Isang linya. Huwag ulitin ang buong task list.

## Walang tanong ang ipinasa

Kapag `/btw` lang ang tinipa, walang sinusundan na tanong — **isang linya lang
ang isagot**: *"Ano ang side question?"* Huwag maghanap, huwag magbuod ng
nakaraan, huwag mag-imbento ng tanong.

## Kailan ito hindi na `/btw`

Kapag may **utos** ang mensahe, hindi na ito side question — trabaho na iyon.
*"btw, ayusin mo yung header"* ay task. Sabihin sa isang linya na trabaho iyon,
tapos gawin sa normal na paraan: pumasok sa task list, may percentage, may
verification, may report question sa dulo. Ang `/btw` ay para sa **puro tanong**
lang.
