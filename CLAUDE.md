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
> | `ponytail` | bawat bagong prompt |
>
> **Bawat bagong prompt sa isang session, hindi lang ang una.** Kung hindi
> na-load ang tatlong ito sa bagong prompt — o na-load noong nakaraang prompt
> pero hindi nagamit sa bagong isa — i-load silang muli. Ang "na-load na kanina"
> ay hindi sagot sa isang bagong prompt.
>
> #### ⛔ MAGKAPARES SILA — ang `caveman` lang na na-load ay BUG, hindi bahagyang pagsunod
> **Nangyari na ito, 23 September 2026:** na-load ang `caveman` sa isang bagong
> prompt at hindi ang `tulong`, at kinailangan pang ituro ni Ivan. Isang tanong
> ang sinasagot nito bago ang unang tool call: **nasa parehong mensahe ba ang
> dalawa?** Hindi → hindi pa nagsisimula ang trabaho.
>
> ⛔ **Ang bigat ng `tulong` ay hindi dahilan para laktawan ito.** Mahaba ang
> flow nito — tanong, plano, ranking, remote hunt, tickbox — at iyon ang
> eksaktong dahilan kung bakit ito nalalaktawan: mukhang mas mabilis kung wala
> ito. Hindi mabilis ang mali. Walang alinman sa mga ito ang lisensya para
> laktawan ito:
>
> | ⛔ Hindi dahilan | Bakit |
> |---|---|
> | "halata naman ang task, diretso na" | ang `tulong` mismo ang nagsasabi kung kailan diretso — hindi ako ang nagpapasya niyan bago pa ito ma-load |
> | "ayaw ni Ivan ng ceremony" | totoo iyon, at ang sagot doon ay **mabilis na flow**, hindi tinanggal na flow |
> | "hindi naman niya tinipa ang `/tulong`" | ang panuntunang ito ang nagpapaputok nito, hindi ang command. Ang command ay isa pang paraan lang |
> | "maikli lang naman ang prompt" | walang sinasabi ang haba ng prompt tungkol sa laki ng task |
> | "na-load ko na siya noong nakaraang prompt" | bagong prompt, bagong load. Nakasulat na ito sa itaas |
>
> ⛔ **Isang exception lang: ang prompt na TANONG.** Walang ginagawang trabaho
> doon, kaya walang skill na ilo-load. Ang tanong ay sinasagot nang diretso.
>
> ⚠️ **Makitid ang exception na iyon, at hindi ito butas.** Ang tanong ay
> tanong lamang kung **walang mababago sa disk o sa server** pagkatapos
> sumagot. Ang "pwede bang gawing puti yung sidebar?" ay hindi tanong — utos
> iyon na may nakasuot na tandang pananong. Kapag nag-aalangan: hindi tanong.
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
> ### ⛔ ANG AUTO-LOAD NA SKILL AY HINDI KAILANMAN NAGIGING TICKBOX
> **Nangyari na ito, 23 September 2026:** sa isang design task, inilagay ang
> `unslop-ui` bilang option sa tickbox ng `/tulong` step 6 — gayong nakalista
> ito sa itaas bilang awtomatiko. Isang pagkakamali iyon na may dalawang mukha:
> pwede itong hindi matikan, at pinapakita nito bilang pagpipilian ang bagay na
> hindi pinipili.
>
> **Ang panuntunan:** ang bawat skill na hinihingi ng seksyon 1, 2, 3 o 4 ay
> **na-load na** bago pa maabot ang anumang tickbox. Kaya wala na ito sa
> listahan ng kandidato — hindi bilang naka-tik, hindi bilang `(Recommended)`,
> wala talaga. Ang tickbox ay para sa mga **karagdagang** skill lamang.
>
> Pareho ito ng panuntunang taglay na ng `tulong` para sa
> `verification-before-completion`; ang sakop lang nito ay lahat ng awtomatiko,
> hindi iyon lang.
>
> ### Kung wala ang skill sa machine
> I-install ito nang tahimik (skills.sh muna, tapos skillsmp.com) at i-load. Kung
> bumigo ang install, sabihin ito sa **isang linya** at ituloy ang trabaho — ang
> nawawalang skill ay hindi kailanman humaharang, nagpapaliban o nagpapabagal sa
> task.
>
> **Check before you finish:** ang bawat skill na hinihingi ng klase ng trabahong
> ginawa ay na-load — `tulong` **at** `caveman` sa bagong prompt (dalawa, hindi
> isa), `verification-before-completion` bago sabihing tapos, at ang
> dokumentasyon o design na set kung iyon ang ginawa. At walang isa man sa
> kanila ang lumabas sa isang tickbox.

> [!IMPORTANT]
> ## 🔴 ANG BINUKSAN MONG BROWSER AY ISINASARA MO — WALANG NAIIWANG MCP PAGE
> **Ivan's instruction, 23 September 2026:** *"bakit pag nag mcp ka hindi mo
> sinasarado, ilagay mo yan sa rule"*. Naiwang nakabukas ang isang Chrome na may
> banner na *"Chrome is being controlled by automated test software"*, nakapatong
> sa screen niya, matagal pagkatapos ng check na pinagbuksan nito.
>
> **Ang panuntunan:** ang page na binuksan ko ay sinasara ko rin, sa parehong
> turn, bago ang final message. Hindi ito paglilinis na pang-susunod — ang
> naiwang window ay nasa screen ng tao, hindi sa akin, at siya ang nagsasara
> nito kung hindi ko ginawa.
>
> | Ginawa ko | Isinasara ko |
> |---|---|
> | `new_page` / `navigate_page` sa isang blangkong browser | `close_page` sa bawat page na binuksan ko |
> | ilang page sa isang session | lahat sila, hindi lang ang huli |
> | isang page na may nakabukas na dialog o menu | isara pa rin — hindi ito dahilan |
>
> ⛔ **Isang exception lang: ang page na hindi ako ang nagbukas.** Kung may
> naka-attach nang browser na may sariling tab ni Ivan, hindi ko iyon sinasara at
> hindi ko rin nila-`navigate` palayo sa kinaroroonan nito. Ang `list_pages` ang
> nagsasabi kung ano ang nandoon na bago ako dumating; iyon ang hangganan.
>
> ⚠️ **Pareho ito sa bawat server na may binubuksang session, hindi lang sa
> browser.** Ang naiwang `tail -f`, ang background process na hindi pinatay, ang
> dev server na pinaandar para sa isang check — lahat ng binuksan para sa isang
> check ay isinasara pagkatapos ng check na iyon.
>
> ⚠️ **ANG HULING PAGE AY HINDI MAAARING ISARA** — `close_page` ay tumatanggi
> dito (*"The last open page cannot be closed"*). Kaya ang huling page ay
> ibinabalik sa `about:blank`, na siyang kalagayan nito bago ako dumating.
> Hindi ito exception: ang punto ay walang naiiwang page na may laman ko, at
> iyon ay natutupad.
>
> **Check before you finish:** `list_pages` ay nagpapakita lang ng kung ano ang
> nandoon bago ako nagsimula — walang natirang page na akin, at ang huling isa
> ay `about:blank`.


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

> [!IMPORTANT]
> ## 🔴 SFTP WORKSPACE: I-DOWNLOAD MUNA BAGO MAG-EDIT, I-DIFF MUNA BAGO MAG-UPLOAD
> **Ivan's instruction, 30 September 2026.** Kapag SFTP ang koneksyon ng
> workspace sa server, ang server ang totoong kopya at ang local ay salamin
> lang nito. Pwedeng luma na ang local file, at pwedeng may ibang session o
> tao na nag-edit sa server habang nag-e-edit ako. Ang upload na hindi
> tumitingin ay tumatabon sa trabaho nila nang walang bakas.
>
> **Kailan ito tumatakbo:** may `.vscode/sftp.json` (o ibang SFTP config) ang
> workspace. Doon din kinukuha ang `host`, `port`, `username`, `password` at
> `remotePath`.
>
> ### 1. Bago mag-edit: i-download ang file mula sa server
> Hindi ine-edit ang local copy nang hindi muna kinukuha ang nasa server.
> ```sh
> sshpass -p '<password>' scp -o PubkeyAuthentication=no \
>   -o PreferredAuthentications=password -o StrictHostKeyChecking=no \
>   <user>@<host>:<remotePath>/<file> <local>/<file>
> cp <local>/<file> <scratchpad>/<file>.base    # itago ang base, kailangan ito sa step 2
> ```
> Ang `.base` ang sagot sa tanong na "ano ang itsura ng server noong nagsimula
> ako?". Kung wala ito, hindi na malalaman kung alin ang binago ko at alin ang
> binago ng iba.
>
> ### 2. Bago mag-upload: tiyaking akin lang ang pagbabago
> I-download ulit ang kasalukuyang kopya ng server, tapos ikumpara sa `.base`:
> ```sh
> sshpass ... scp <user>@<host>:<remotePath>/<file> <scratchpad>/<file>.server
> cmp -s <scratchpad>/<file>.base <scratchpad>/<file>.server && echo "walang bago sa server"
> ```
>
> | Resulta | Gagawin |
> |---|---|
> | pareho ang `.base` at `.server` | ligtas i-upload ang local |
> | magkaiba | may nagbago sa server habang nag-e-edit ako. **Huwag i-upload.** I-merge muna |
> | may conflict ang merge | huminto at itanong kay Ivan. Hindi ito nireresolba sa hula |
>
> Ang merge ay three-way, gamit ang `.base` bilang ninuno:
> ```sh
> git merge-file <local>/<file> <scratchpad>/<file>.base <scratchpad>/<file>.server
> # exit 0 = malinis na merge; exit >0 = may conflict markers, huminto
> ```
> Pagkatapos ng malinis na merge, basahin ang resulta. Nandoon dapat ang
> pagbabago ko **at** ang pagbabago ng server.
>
> ### 3. Pagkatapos mag-upload: patunayan
> ```sh
> md5 -q <local>/<file>; sshpass ... ssh <user>@<host> "md5sum <remotePath>/<file>"
> ```
> Dapat magkapareho. Ang upload na hindi na-checksum ay hindi pa tapos.
>
> ⛔ **Hindi ito dahilan para laktawan kapag "maliit lang ang edit".** Ang
> isang linya na na-upload sa ibabaw ng file na binago ng iba ay nagbubura pa
> rin ng buong trabaho nila.
>
> **Check before you finish:** bawat file na na-upload ay na-download muna bago
> ginalaw, na-diff laban sa server bago in-upload, at tugma ang md5 sa
> magkabilang dulo.
