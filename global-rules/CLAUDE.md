# Global rules (all projects)

> [!IMPORTANT]
> ## 🔴 LOAD THE SKILLS FIRST — BEFORE ANY WORK STARTS
> **Bago magsimula ang kahit anong trabaho, i-load muna ang skills na nakalista
> sa ibaba.** Hindi ito tinatanong, hindi ito inaalok bilang tickbox, at hindi
> ito hinihintay na hingin. Kung hindi pa naka-load ang isang skill na hinihingi
> ng pagkakataon sa ibaba, i-load ito bago buksan ang unang file.
>
> **I-load ang lahat ng kailangan sa ISANG bulk call**, at isang linya lang ang
> sinasabi tungkol dito — ang UI ay nagre-render na ng isang row kada skill na
> na-load, kaya ang listahan sa text ay pag-uulit lamang.
>
> ### 1. Kada BAGONG PROMPT — palaging ito
> | Skill | Kailan |
> |---|---|
> | `tulong` | bawat bagong prompt |
> | `caveman` | bawat bagong prompt |
>
> **Bawat bagong prompt sa isang session, hindi lang ang una.** Kung hindi
> na-load ang dalawang ito sa bagong prompt — o na-load noong nakaraang prompt
> pero hindi nagamit sa bagong isa — i-load silang muli. Ang "na-load na kanina"
> ay hindi sagot sa isang bagong prompt.
>
> ⛔ **Isang exception lang: ang prompt na TANONG.** Walang ginagawang trabaho
> doon, kaya walang skill na ilo-load. Ang tanong ay sinasagot nang diretso.
>
> ### 2. Kada BAGONG TASK — kahit sa loob ng parehong session
> | Kailan | Skill |
> |---|---|
> | **simula** ng task | `writing-plans` — nasa `tulong` na rin ito, pero ang task ang nagpapaputok nito, hindi ang command |
> | **katapusan** ng task | `verification-before-completion` |
>
> **Bawat bagong task, kahit pang-lima na ito sa iisang usapan.** Ang "na-load
> na ito kanina sa session na ito" ay hindi dahilan para laktawan ang bagong
> task — bagong task, bagong simula, bagong pagtatapos.
>
> ### 3. Pag may gagawing DOKUMENTASYON
> | Skill |
> |---|
> | `writing-plans` |
> | `unslop` |
> | `em-dash` |
> | `readable-content` |
>
> Kasama dito ang report, README, notes, plano, progress page at anumang prosa
> na babasahin ng tao.
>
> ### 4. Pag may gagawing DESIGN
> | Skill |
> |---|
> | `unslop-ui` |
> | `ui-ux-pro-max` |
> | `micro-interactions` |
>
> Kasama dito ang bagong screen, bagong component, restyle, spacing, layout,
> kulay, typography at interaction.
>
> ### Kung wala ang skill sa machine
> I-install ito nang tahimik (skills.sh muna, tapos skillsmp.com) at i-load. Kung
> bumigo ang install, sabihin ito sa **isang linya** at ituloy ang trabaho — ang
> nawawalang skill ay hindi kailanman humaharang, nagpapaliban o nagpapabagal sa
> task.
>
> **Check before you finish:** ang bawat skill na hinihingi ng klase ng trabahong
> ginawa ay na-load — `tulong` at `caveman` sa bagong prompt,
> `verification-before-completion` bago sabihing tapos, at ang dokumentasyon o
> design na set kung iyon ang ginawa.

> [!IMPORTANT]
> ## 🔴 EVERY REPLY STATES A PROGRESS PERCENTAGE — KAHIT BASH AT READ LANG ANG GINAGAWA
> **Bawat reply ay may porsyento, walang exception sa gitna.** Hindi lang sa
> dulo, hindi lang kapag may naibigay nang output. Ang reply na naglalabas lang
> ng `bash`, `grep`, `cat`, `find` o `Read` ay may numero pa rin — iyon mismo ang
> pinakamahalagang lugar nito, dahil doon walang ibang senyales na nakikita ng
> tao.
>
> | Use | Not |
> |---|---|
> | **Progress: ~40%** — numero, maaga sa reply | ibinaon sa huling talata, o wala man lang |
> | isang linya kung ano ang sakop ng numero | porsyento na walang scope — 40% ng ano? |
> | numero kahit `cat` at `grep` lang ang ginawa | "naghahanap pa" na walang numero |
> | **100%** kapag na-verify na ang lahat | 100% kapag nakasulat pa lang ang code at walang pinatakbo |
> | numero na pwedeng BUMABA kapag lumaki ang task | tahimik na pag-re-baseline para hindi umatras |
>
> - **Porsyento ng BUONG task na hiningi ng user**, kasama ang mga check — hindi
>   ng code na nagkataong naisulat. Ang paggawa at ang pagpapatunay na gumagana
>   ay parehong nasa denominator.
> - **Ang tool call ay hindi progreso.** Gumagalaw ang numero kapag may natapos
>   at na-verify, hindi kapag may binuksang file. Kaya tama lang na maraming
>   sunod-sunod na reply ang may parehong numero — ang mahalaga ay may numero.
> - **Kapag naka-block o naghihintay**, sabihin pa rin ang numero at kung ano ang
>   hinihintay. Ang nakatigil na 60% ay impormasyon; ang katahimikan ay hindi.
> - **Ang tanong na walang kalakip na trabaho ay walang porsyento.** Walang
>   nagaganap, kaya walang ire-report.
