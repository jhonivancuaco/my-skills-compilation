---
name: ivan-project-structure
description: Ivan's project structure for any JavaScript or TypeScript codebase, frontend or backend (Next.js, React, PWA, Vue, Nuxt, Angular, Express, Hono). MVC layers (Config, Models, Controllers, Views, Styles, Middleware, store, Helpers) with every layer grouped by role, a thin router, one-way data flow and all CSS in a layered Styles folder, plus a rendering flow (CSR, SSR, streaming SSR, SSG, ISR, SPR) chosen by Ivan for public pages and for all dashboards. Use it to scaffold a new project in this shape, to restructure or clean up an existing project into it, to audit a repo against it, or to decide where a new file goes. Trigger whenever Ivan says "ivan structure", "ganitong structure", "ayusin mo yung structure", "gawin mong malinis yung folders", "i-group mo by role", "saan ilalagay to", or asks to reorganize, restructure, tidy or clean up folders, even if he does not name this skill.
---

# Ivan project structure

Code is split into **layers by job**. Inside each layer, files are **grouped by
role**, one folder per role plus `Shared/`. The same role name appears in the
router, `Controllers/` and `Views/`, so knowing the role tells you where every
file lives.

The full spec, with both trees, the framework mapping, the import table, the
styles rules and the staged migration, is in
[references/spec.md](references/spec.md). **Read it before moving or creating
any folder.** This file is the workflow, and the spec is the source of truth.

## The shape at a glance

```
src/
├── <router>/      routing only (app/, pages/, router/, routes/: depends on framework)
├── Config/        routes, nav, constants, env
├── Models/        Entities (types) + Repository (the only data access)
├── Controllers/   logic, grouped by role: <Role>/, Shared/
├── Views/         screens, grouped by role: components/, layouts/, dashboard/<role>/partials/
├── Middleware/    backend only: auth, validation
├── Styles/        index.css -> theme.css -> base.css -> components/*.css
├── store/         frontend global state
└── Helpers/       small pure functions
```

Data flows one way:

```
Frontend:  route -> View -> Controller -> Models -> API or storage
Backend:   route -> Middleware -> Controller -> Models -> database
```

## Workflow

### 1. Work out the job

| Ivan asks | Mode | What you do |
|---|---|---|
| new project, scaffold, "gawa ka ng bagong project" | Build | spec "Build mode" |
| clean up, restructure, "ayusin mo yung structure" | Restructure | spec "Restructure mode", stage by stage |
| "tama ba structure ko?", audit, check | Audit | run the check script, report, change nothing |
| "saan ilalagay to?" | Placement | answer from the spec's tables, change nothing |

An audit or placement question changes nothing on disk. Only Build and
Restructure move files.

### 2. Read the project before naming anything

- Find the framework from `package.json` and read its row in the spec's
  "Framework mapping". The router folder, View file type and Controller form
  all come from that row.
- Find the real roles from the routes, auth code and nav. Use those names, not
  the spec's examples. With no roles, group by feature area.
- Find framework-required folders (Next.js `app/`, Nuxt `pages/`, Angular
  `src/app/`). Keep them and keep them thin.

### 3. Ask the rendering flow, then wait

For Build and Restructure, ask Ivan two questions before any file moves: which
flow for the **public pages**, and which for the **dashboards**. Each answer is
one of six:

1. **CSR**: empty shell, the browser fetches and renders
2. **Traditional SSR**: full page rendered per request, sent in one piece
3. **Modern SSR (streaming)**: rendered per request, streamed in chunks
4. **SSG**: built to HTML once, at build time
5. **ISR**: static, rebuilt in the background on a timer or on demand
6. **SPR**: partial prerendering (PPR), a static shell with dynamic parts
   streamed in

List all six, numbered, every time. Six options do not fit a four-option
picker, so ask in plain text ("Public: 1 to 6? Dashboards: 1 to 6?"). In a
restructure, say which flow each area uses today, and mark any flow the
framework cannot do. You may recommend one, but Ivan picks.

The dashboard answer covers **every** dashboard, however many roles there are.
Set it once in the layout that wraps all dashboards, never per role or per
page. The public answer covers every public page unless Ivan names an
exception.

Skip the questions only for a backend that serves no HTML. The per-framework
"how" and the checks are in the spec's "Rendering" section.

### 4. Record a baseline before touching files

Run the project's own type check, lint, tests and build, and save the output.
Then run the structure check:

```bash
bash ~/.claude/skills/ivan-project-structure/scripts/check-structure.sh src
```

Pass a different root when the code lives elsewhere (`src/app` for Angular).
The baseline matters because it separates what was already broken from what
you broke.

### 5. Show the move table when the job is big

For a restructure over about 30 files, show Ivan a table of old path to new
path before moving anything. A wrong guess about roles is cheap to fix in a
table and expensive to fix after 80 `git mv` calls.

### 6. Move in stages

Follow the spec's stages in order: config and models, then controllers and
middleware, then views and router, then styles, then rendering (only if Ivan's
answer differs from today), then clean up. Build after
every stage. Commit after every stage if the repo uses git, so each stage can
be undone alone.

While moving:

- Use `git mv` so history follows the file.
- Rename case-only folders in two steps (`git mv components tmp && git mv tmp
  Components`), because macOS and Windows disks ignore case.
- Search for string paths too, not only imports: config files, docs, test
  fixtures, `tsconfig` paths, `vite.config`, `angular.json`, `next.config`.
- Move code without changing behaviour. A bug found on the way goes in the
  final report, not into the diff.
- Create a folder only when its first file exists.

### 7. Verify, then report

Run the baseline commands again, then the structure check. Compare against the
baseline. Confirm each rendering flow too: the `next build` route table (`○` or `●`
prerendered, `◐` partial, `ƒ` dynamic), or `curl -s <url>` finding page text for
everything except CSR. Then run the app: click each role's main screens for a frontend, and
call one endpoint per role for a backend.

Report in this order:

1. what moved, as a short summary
2. check results before and after, and the rendering flow each area now uses
3. anything still failing, with the reason
4. bugs noticed but not fixed

## Rules worth knowing without opening the spec

- The router only wires. No logic, no data fetching, no styles in `page.tsx`,
  `pages/*.vue` or `routes/*.ts`.
- A View never imports `Models/Repository`. A type from `Models/Entities` is
  fine.
- A Controller never contains markup.
- `Models/Repository` is the only code that knows where data lives.
- One role never imports another role's `partials/`. A second user means the
  file moves to `Views/components/` or `Controllers/Shared/`.
- All CSS lives in `Styles/`. Every colour, radius, size, shadow and duration
  is a token in `theme.css`. No `.css` files and no `<style>` blocks in
  `Views/`.
- No `utils/`, `common/`, `misc/`, `lib/` or `services/` folders. Each file
  goes to the layer that owns its job.
- Layer folders are PascalCase (`Controllers/`). Role folders are PascalCase in
  `Controllers/` and lowercase in `Views/` and the router, matching the URL.

## When the project does not fit

Some projects push back: a framework that fights a folder, a backend with no
roles, or a monorepo with several apps. Apply the spec to each app on its own,
keep the framework's required folders, and tell Ivan in one line which rule
you bent and why. Bending one rule on purpose is fine. Silently dropping the
structure is not.
