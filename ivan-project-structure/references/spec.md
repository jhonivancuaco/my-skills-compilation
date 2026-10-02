# Project structure spec: MVC with role-based grouping

A portable spec for a coding agent. It works for any JavaScript or TypeScript
project, frontend or backend: Next.js, React, PWA, Vue, Nuxt, Angular, Hono,
Express, and similar.

Use it in one of two ways:

- **Build mode:** set up a new project in this structure.
- **Restructure mode:** move an existing project into this structure.

## Rules that apply everywhere

1. **Do not change behaviour while moving files.** A restructure moves code
   and fixes imports, nothing more. If you find a bug, note it and report it
   at the end.
2. **Do not create empty folders.** Every folder below is optional until a
   file needs it. A backend has no `Views/` or `Styles/` unless it renders
   HTML.
3. **Use the project's real role names.** This spec writes `<role>` where
   examples would say `admin`, `owner` or `customer`. If the app has no roles,
   group by feature area instead (`billing`, `inventory`).
4. **Obey the framework's required locations.** When a framework insists on a
   folder (Next.js `app/`, Nuxt `pages/`, Angular `src/app/`), keep that
   folder and keep it thin. It routes to the layers. It does not replace them.
5. **Ask the rendering flow before building or restructuring.** One answer
   for the public pages, one for the dashboards. See "Rendering".
6. **Prove it works before you say it works.** See "Verification".

## The idea

Code is split into **layers by job**: routing, config, data, logic, screens,
styles. Inside each layer, files are **grouped by role**, one folder per role,
plus `Shared/` for what every role uses.

The same role name appears in the router, the controllers and the views. If
you know the role, you know where every file for it lives.

## The layers

| Layer | Job | Frontend | Backend |
|---|---|---|---|
| Router | Maps a URL to a View or a Controller. Nothing else | yes | yes |
| `Config/` | Routes, nav, constants, env reading | yes | yes |
| `Models/` | Types, and every read and write to the data source | yes | yes |
| `Controllers/` | The logic. Grouped by role | yes | yes |
| `Views/` | What the user sees. Grouped by role | yes | only if it renders HTML |
| `Middleware/` | Runs before a controller: auth, validation, rate limits | no | yes |
| `Styles/` | All CSS, grouped by layer | yes | only if it renders HTML |
| `store/` | Global client state | yes | no |
| `Helpers/` | Small pure functions with no project knowledge | yes | yes |

## The tree

### Frontend

```
src/
├── <router>/                   ROUTER ONLY (name depends on framework, see mapping)
│
├── Config/
│   ├── App.ts                  constants
│   ├── Nav.ts                  menu and sidebar entries
│   └── Routes.ts               every URL as a constant, plus homeFor(role)
│
├── Models/
│   ├── Entities.ts             types (split per entity when large)
│   └── Repository.ts           the only code that calls the API or storage
│
├── Controllers/                grouped by role
│   ├── <Role>/                 <Name>Controller.ts
│   └── Shared/                 used by two or more roles
│
├── Views/                      grouped by role
│   ├── components/             UI used by two or more roles
│   ├── layouts/                header, footer, shells used everywhere
│   ├── auth/                   sign in, register
│   ├── site/                   public pages
│   └── dashboard/
│       └── <role>/
│           ├── <Name>View.<ext>
│           └── partials/       components only this role uses
│
├── Styles/
│   ├── index.css               entry point, imports the rest in order
│   ├── theme.css               every token: colour, radius, size, duration
│   ├── base.css                html, body, headings, focus ring, reduced motion
│   └── components/             one file per component type: buttons.css, forms.css
│
├── store/                      one file per concern: auth.ts, ui.ts
└── Helpers/                    format.ts, csv.ts
```

### Backend

```
src/
├── index.ts                    entry: create the app, mount routes, start
├── routes/                     ROUTER ONLY
│   ├── index.ts                mounts every role router
│   └── <role>.routes.ts        URLs for one role, pointing at controllers
│
├── Config/
│   ├── App.ts                  constants
│   └── Env.ts                  reads and validates environment variables once
│
├── Models/
│   ├── Entities.ts             types and schemas
│   └── Repository.ts           the only code that talks to the database
│
├── Controllers/                grouped by role
│   ├── <Role>/                 <Name>Controller.ts
│   └── Shared/                 used by two or more roles
│
├── Middleware/
│   ├── auth.ts                 who is calling, and may they
│   └── validate.ts             request shape checks
│
├── Views/                      only if the server renders HTML or email templates
│   └── <role>/
│
└── Helpers/
```

## Framework mapping

Find the project's framework, then read across. Everything not listed stays
as in the tree above.

| Framework | Router folder | View file | Controller is | Global state |
|---|---|---|---|---|
| Next.js (App Router) | `src/app/` (required) | `<Name>View.tsx` | a hook, `use<Name>Controller` | `store/` (zustand, context) |
| React (Vite, CRA) | `src/router/` with `routes.tsx` | `<Name>View.tsx` | a hook, `use<Name>Controller` | `store/` |
| PWA | same as its UI framework | same | same | same |
| Vue (Vite) | `src/router/index.ts` | `<Name>View.vue` | a composable, `use<Name>Controller` | `store/` (Pinia) |
| Nuxt | `pages/` (required) | `<Name>View.vue` | a composable, `use<Name>Controller` | `store/` (Pinia) |
| Angular | `src/app/app.routes.ts` (required) | `<name>-view.component.ts` + `.html` | an `@Injectable` service, `<Name>Controller` | `store/` (signals, NgRx) |
| Express | `src/routes/` | only for server-rendered HTML | handler functions | none |
| Hono | `src/routes/` | only for server-rendered HTML | handler functions | none |

Framework notes:

- **Next.js / Nuxt:** each `page.tsx` or `pages/*.vue` only imports one View
  and renders it. Route groups in parentheses split public and signed-in
  pages without changing the URL, and are named after their rendering flow,
  like `(ssg)/` and `(csr)/` (see "Rendering").
- **Angular:** keep `src/app/` because the CLI needs it, and put the layer
  folders inside it (`src/app/Controllers/`, `src/app/Views/`). Register
  `Styles/index.css` in the `styles` array of `angular.json`, and leave
  component `styleUrls` empty.
- **Vue / Nuxt:** a `<style>` block inside a `.vue` file counts as CSS inside
  `Views/`. Do not add one. Use `Styles/`.
- **PWA:** the manifest and service worker stay where the build tool expects
  them (usually `public/`). Register the service worker once, in the app
  entry.
- **Express / Hono:** one router file per role, mounted in `routes/index.ts`
  (`app.use("/admin", adminRoutes)` or `app.route("/admin", adminRoutes)`).
  Role checks go in `Middleware/auth.ts` and are applied at the mount, not
  repeated inside each handler.

## Rendering

Before any Build or Restructure work, ask the user **two questions**, then
wait for the answers:

1. Which rendering flow for the **public pages** (home, marketing, sign in,
   register, 404)?
2. Which rendering flow for the **dashboards** (every signed-in area)?

Each answer is one of these six:

| # | Flow | What happens | Good for |
|---|---|---|---|
| 1 | **CSR** (client-side rendering) | Server sends an empty shell. The browser fetches data and renders everything | dashboards, anything behind sign-in, offline PWAs |
| 2 | **Traditional SSR** | Server renders the full page on every request, then sends it in one piece | pages that must be fresh on every request, SEO |
| 3 | **Modern SSR (streaming)** | Server renders on every request and streams the page in chunks. Fast parts arrive first, slow parts fill in behind loading states | fresh pages with slow data |
| 4 | **SSG** (static site generation) | Pages are built to HTML once, at build time | content that changes only on deploy |
| 5 | **ISR** (incremental static regeneration) | Built statically, then rebuilt in the background every N seconds or on demand | content that changes, but not per request |
| 6 | **SPR** (partial prerendering, PPR) | A static shell is prerendered, and the dynamic parts stream into it per request | mostly static pages with a few live parts |

How to ask:

- **List all six every time**, numbered, with the one-line "what happens". Do
  not use a picker that only fits four options. Asking in plain text is fine:
  "Public: 1 to 6? Dashboards: 1 to 6?"
- **Show what the project uses now** in a restructure, and say whether the
  framework supports each flow (see the table below). Mark unsupported ones
  instead of hiding them.
- You may say which flow you would pick and why. The user still decides.
- **Skip the question** only for a backend that serves no HTML (a pure JSON
  API). Skip the public question if the project has no public pages.

Rules for the answers:

- **One flow covers every dashboard, however many there are.** Admin, owner,
  player, staff: all use the dashboard answer. Set it once, in the layout that
  wraps every dashboard, not per role and not per page.
- **One flow covers every public page.** A single page gets a different flow
  only when the user names that page.
- **Name the route groups after the flow** when the framework has route
  groups, so the tree shows how each area renders: `(ssg)/` for public pages
  and `(csr)/` for dashboards, for example. When both answers are the same
  flow, name the groups by audience instead: `(public)/` and `(private)/`.
- **Changing the flow is a behaviour change.** In a restructure it gets its
  own stage (Stage 5), after the files have moved, and only because the user
  asked for it.
- **If the framework cannot do the chosen flow**, say so before starting and
  give two options: the nearest flow it supports, or the framework change
  needed to get it. Do not fake a flow.

### How each flow is done per framework

Confirm the details against the docs for the installed version before writing
code. Frameworks change these APIs between major versions.

| Framework | CSR | Traditional SSR | Streaming SSR | SSG | ISR | SPR |
|---|---|---|---|---|---|---|
| Next.js (App Router) | `"use client"` in the group's `layout.tsx`, data fetched in controllers | server components, `export const dynamic = "force-dynamic"`, no `loading.tsx` or `<Suspense>` | dynamic server components plus `loading.tsx` or `<Suspense>` boundaries | static by default, `generateStaticParams` for dynamic segments | `export const revalidate = <seconds>` (without Cache Components), or `'use cache'` plus `cacheLife` (with them) | Next 16: `cacheComponents: true` in `next.config`, static shell plus `<Suspense>` around dynamic parts |
| Nuxt | `routeRules: { "/dashboard/**": { ssr: false } }` | default (`ssr: true`) | not built in. Nearest: SSR with lazy components | `routeRules: { prerender: true }` or `nuxi generate` | `routeRules: { isr: <seconds> }` | not built in. Nearest: ISR plus server islands |
| Angular | default | `@angular/ssr` with `RenderMode.Server` | not built in. Nearest: SSR with incremental hydration | `@angular/ssr` with `RenderMode.Prerender` | not built in | not built in |
| React, Vue (Vite), PWA | default, and the only one built in | needs a meta-framework (Next.js, Nuxt, React Router framework mode) or a custom Vite SSR server | same as SSR | prerender plugin or a meta-framework | needs a meta-framework and a host that supports it | needs Next.js |
| Express, Hono (HTML only) | serve a static SPA bundle | render a template per request (`res.render`, `c.html`) | stream the response (`res.write`, Hono `stream` helpers) | build HTML with a script at build time and serve it statically | cache headers on a CDN: `Cache-Control: s-maxage=<n>, stale-while-revalidate` | not built in |

## One role, three folders

| Role | Router | Controllers | Views |
|---|---|---|---|
| `<role>` | frontend: `<router>/dashboard/<role>/`, backend: `routes/<role>.routes.ts` | `Controllers/<Role>/` | `Views/dashboard/<role>/` |

A role's `partials/` may not be imported by another role. When a second role
needs it, move it to `Views/components/`. Same for controllers: when a second
role needs one, move it to `Controllers/Shared/`.

## Data flows one way

```
Frontend:  route  ->  View  ->  Controller  ->  Models  ->  API or storage
Backend:   route  ->  Middleware  ->  Controller  ->  Models  ->  database
```

- The router only points somewhere. No logic, no data fetching, no styles.
- A View renders and calls its Controller. It never imports
  `Models/Repository`. Importing a type from `Models/Entities` is fine.
- A Controller holds the logic. It never contains markup (JSX, templates).
- A Model never imports from `Views/`, `Controllers/` or `routes/`.
- `Models/Repository.ts` is the only file that knows where data lives.
  Swapping the API or database should touch that file and nothing else.

### Allowed imports

| From | May import |
|---|---|
| Router | `Views/` (frontend), `Controllers/` and `Middleware/` (backend) |
| `Views/` | `Controllers/`, `Views/components/`, own role's `partials/`, `Config/`, `Helpers/`, types from `Models/Entities` |
| `Controllers/` | `Models/`, `store/`, `Config/`, `Helpers/` |
| `Middleware/` | `Models/`, `Config/`, `Helpers/` |
| `store/` | `Models/`, `Helpers/` |
| `Models/` | `Config/`, `Helpers/` |
| `Helpers/` | nothing inside `src/` |

## Styles

Only for projects that render HTML.

`Styles/index.css` imports from the broadest layer to the narrowest. Keep this
order, because later files win ties.

```css
@import "./theme.css";                  /* 1. values (tokens) */
@import "./base.css";                   /* 2. plain HTML elements */
@import "./components/buttons.css";     /* 3. component classes */
@import "./components/forms.css";
@import "./components/utilities.css";   /* 4. helpers, last */
```

- **Every colour, radius, size, shadow and duration is a token in
  `theme.css`.** Everything else reads `var(--token)`. No literal values.
- **No CSS inside `Views/`.** No `.css` files, no `<style>` blocks, no
  per-component stylesheets. Views use class names only.
- **Group CSS by component type, not by role.** A button looks the same for
  every role.
- **A role stylesheet is the exception.** Only when a style truly belongs to
  one role: `Styles/dashboard/<role>.css`, imported in `index.css`.
- **With Tailwind**, put `@import "tailwindcss";` first in `index.css`, map
  tokens to utilities in `Styles/tailwind.css` (`@theme inline { }` in v4),
  and put component classes in `@layer components { }`. Views never use raw
  colour classes like `bg-green-600`.
- **With Sass, CSS modules or styled-components**, the same rules hold:
  tokens in one theme file, component styles grouped under `Styles/`.

## Naming

| Thing | Form | Example |
|---|---|---|
| Layer folder | PascalCase | `Controllers/`, `Views/`, `Models/` |
| Role folder in `Controllers/` | PascalCase | `Admin/` |
| Role folder in `Views/` and the router | lowercase, same as the URL | `admin/` |
| Screen | `<Name>View` | `StaffView.tsx`, `StaffView.vue` |
| Controller | `<Name>Controller` | `BookingController.ts` |
| Frontend controller hook or composable | `use<Name>Controller` | `useBookingController` |
| Backend route file | `<role>.routes.ts` | `admin.routes.ts` |
| One-role component | `<role>/partials/<Name>` | `admin/partials/Sidebar.tsx` |
| Shared component | `Views/components/<Name>` | `Button.tsx` |
| CSS file | lowercase, plural | `buttons.css` |

Import through a path alias (`@/Controllers/...`), not long relative paths.
Set it in `tsconfig.json` or `jsconfig.json`, and in the bundler if it needs
its own copy (Vite `resolve.alias`).

## Build mode

1. Scaffold the framework as usual. Keep its required files where it wants
   them.
2. Add the `@/*` path alias pointing at `src/*`.
3. Frontend: create `Styles/theme.css` and `Styles/index.css` first, and point
   the app entry at `index.css`. Delete the scaffold's default global CSS.
4. Ask the two rendering questions (see "Rendering"), then create the route
   groups and set each flow once in its group layout.
5. Create `Config/Routes.ts` (frontend) or `routes/index.ts` (backend) before
   the first screen or endpoint.
6. Build each feature in this order: type in `Models/Entities`, data access in
   `Models/Repository`, controller, then the View or the route.
7. Create each folder only when its first file exists.

## Restructure mode

Work in stages. The project must build after every stage. Commit after every
stage, so each one can be undone alone.

### Stage 0: survey, change nothing

1. List every source file.
2. Record the baseline: run the type check, lint, tests and build from
   `package.json`. Save the output. Note what already fails, so you do not
   blame your own changes for it.
3. Identify the framework and read its row in "Framework mapping".
4. Find the roles or feature areas from the routes, the auth code and the nav.
5. Work out which rendering flow the public pages and the dashboards use
   today, then ask the two rendering questions (see "Rendering").
6. Write a table of old path to new path for every file. If the project has
   more than about 30 files, show the table to the user before moving
   anything.

### Stage 1: config and models

1. Move constants, env reading, routes and nav into `Config/`.
2. Move types and schemas into `Models/Entities`.
3. Move every API, database or storage call into `Models/Repository`.
4. Build.

### Stage 2: controllers and middleware

1. Frontend: pull state and logic out of screens into `use<Name>Controller`
   hooks or composables (Angular: services).
2. Backend: move handler bodies out of route files into controllers, and move
   auth and validation into `Middleware/`.
3. Place each controller under its role, or under `Shared/` when two or more
   roles use it.
4. Build.

### Stage 3: views and router

1. Move screens into `Views/dashboard/<role>/` and name them `<Name>View`.
2. Move one-role components into that role's `partials/`.
3. Move components used by two or more roles into `Views/components/`.
4. Reduce each route file to wiring only.
5. Build.

### Stage 4: styles (frontend only)

1. Create `Styles/` and move the global stylesheet into it.
2. Split it into `theme.css`, `base.css` and `components/*.css`. Copy rules
   exactly and keep their original order.
3. Move any per-component CSS or `<style>` blocks into the matching
   `components/*.css` file, converting literal values to tokens.
4. Point the app entry at `Styles/index.css`.
5. Build, and check the screens look the same as before.

### Stage 5: rendering (only if the answer differs from today)

1. Set the dashboard flow once, in the layout that wraps every dashboard.
2. Set the public flow once, in the layout that wraps the public pages.
3. Rename the route groups after the flows.
4. Build, and confirm each flow (see "Verification").

### Stage 6: clean up

1. Delete folders that are now empty, like old `components/`, `utils/`,
   `lib/` or `services/` folders.
2. Update the README and any docs that name old paths.
3. Run the full verification.

### Pitfalls

- **Case-only renames break on macOS and Windows.** `components` to
  `Components` is invisible on a case-insensitive disk. Rename in two steps:
  `git mv components tmp && git mv tmp Components`.
- **Move with `git mv`**, so history follows the file.
- **Search for string paths, not only imports.** Paths hide in config files,
  docs, test fixtures, `angular.json`, `vite.config`, `next.config` and
  `tsconfig` paths.
- **Do not rename exports while moving files.** Renames and moves in one
  commit make the diff impossible to review.

## Verification

Run the project's own scripts. Reading the code is not proof.

```bash
npx tsc --noEmit          # type check, if TypeScript
npm run lint
npm test                  # if tests exist
npm run build
```

Then check the structure. Each command should print nothing. Adjust `src` if
the framework keeps code elsewhere (`src/app` for Angular).

```bash
# Views must not touch the data layer
grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.vue' "Models/Repository" src/Views

# Models must not know about screens or routes
grep -rnE --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.vue' "from ['\"]@/(Views|Controllers|routes)" src/Models

# No CSS inside Views
find src/Views \( -name "*.css" -o -name "*.scss" -o -name "*.module.*" \)
grep -rln "<style" src/Views --include='*.vue'

# No literal hex colours outside theme.css
grep -rnE "#[0-9a-fA-F]{6}\b" src --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.vue' --include='*.css' --include='*.scss' | grep -v "Styles/theme"

# No dumping-ground folders
find src -type d \( -name utils -o -name common -o -name misc -o -name lib \)
```

Check the rendering flow:

- **Next.js:** the `next build` route table marks each route. `○` (static) and
  `●` (SSG with `generateStaticParams`) are prerendered, `◐` is partial
  prerender (SPR), `ƒ` is dynamic (SSR or streaming), and a revalidate value
  means ISR.
- **Any framework:** `curl -s <url> | grep "<a heading on the page>"`. It finds
  the text for SSR, SSG, ISR and SPR. It finds nothing for CSR, because the
  server sent an empty shell.
- **Streaming:** `curl -N <url>` shows the page arriving in more than one
  chunk.

Finally, run the app. Frontend: click through each role's main screens at
desktop and phone width. Backend: call one endpoint per role and check the
response and the auth rejection.

## Optional: enforce with ESLint

For larger projects, make the import rules fail lint:

```js
// eslint.config.mjs
export default [
  {
    files: ["src/Views/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/Models/Repository"], message: "Views go through a Controller." }],
      }],
    },
  },
  {
    files: ["src/Models/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/Views/*", "@/Controllers/*", "@/routes/*"], message: "Models know nothing about screens or routes." }],
      }],
    },
  },
];
```

## Signs the structure is slipping

- A route file or page holds logic, fetches data, or has more than wiring.
- A View imports `Models/Repository` or builds data by hand.
- A View has a literal colour, a `<style>` block, or its own stylesheet.
- One role imports another role's `partials/` or controller.
- A `utils/`, `common/`, `misc/`, `lib/` or `services/` folder appears.
- One CSS file keeps growing instead of splitting into `components/`.
- The same role has different names in the router, controllers and views.

## Done means

- [ ] Every file sits in the folder this spec names for it
- [ ] Each role uses the same name in the router, `Controllers/` and `Views/`
- [ ] Route files and pages contain wiring only
- [ ] All CSS is in `Styles/`, and all literal values are in `theme.css`
- [ ] No empty folders, and no `utils`, `common`, `misc`, `lib` or `services`
- [ ] Type check, lint, tests and build pass
- [ ] Every verification command prints nothing
- [ ] The user chose a rendering flow for public pages and for dashboards
- [ ] Every dashboard uses the dashboard flow, set once in its shared layout
- [ ] The build output or `curl` confirms each flow
- [ ] The app was run and each role was checked
- [ ] The README describes the new structure
