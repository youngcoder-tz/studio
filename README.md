# GN-Apex Workspace Studio

A standalone, schema-driven no-code editor for **GN-Apex workspace-mode
templates**. It composes portal pages from the client SDK's registered component
set, themes them with design tokens, previews the draft against the real portal,
and publishes — without ever letting an author touch a deployment.

It is a **separate project** on purpose. It is not a route inside `gn-apex` or
`console`, because it needs a different layout (three panes, no sidebar), a
different release cadence, and — most importantly — an editor codebase that
cannot drift into the portal's own build. It talks to the backend over the
authoring API; it ships nothing to a visitor.

```
studio/           ← this project
  src/lib/         contract, API client, editor state machine, validation
  src/components/  palette, layers, inspector, panels, preview, toolbar
  src/app/         launcher, the studio shell, the preview host
```

---

## Why it exists

The workspace mode (`GENERAL`, `E_COMMERCE`, `NON_PROFIT`, `EDUCATION`,
`PARTNER`) decides which components a project can use and which pages it can
have. Before the Studio, changing any of that meant editing the client repo and
redeploying. The Studio turns it into data: a project's portal is a document —
`pageLayouts`, `globalTokens`, `seo`, `i18n` — and the backend compiles and
serves that document to the SDK's renderer.

Two guardrails from `workspace-mode-driven-ui.md` shape the whole design and are
worth stating because they constrain what the UI is allowed to do:

- **No free-form canvas.** An author arranges *registered components* with typed
  props. There is no HTML box, no CSS panel, no arbitrary markup.
- **No per-template deployment.** A template is a document, not a build. Every
  project runs the same portal code and differs only by its document.

The Studio honours both by construction: every edit is a typed
`WorkspaceOperation`, and every operation is validated by the backend's compiler
before it is persisted.

---

## Running it

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3010
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the GN-Apex backend (default `http://localhost:3001`). |
| `NEXT_PUBLIC_PREVIEW_ORIGIN` | The portal's origin, if it is not the Studio's own. Comma-separate several to allow more than one. |
| `NEXT_PUBLIC_PREVIEW_PROXY` | Set to `1` to route the preview frame through the same-origin `/preview` proxy (needed only when the portal blocks cross-origin framing). |

### Authentication

The Studio needs a **dashboard identity** (a user JWT), not an SDK key. Every
route it uses under `/workspace/:projectId/*` is guarded by
`JwtAuthGuard` + `ProjectPermissionsGuard`, deliberately: those routes expose the
draft document and the publish lever, and a machine credential shipped into a
browser has no business touching either.

Two ways in, both supported by `src/lib/api/client.ts`:

1. **Ambient cookie** — deploy the Studio behind the same parent domain as the
   API and `credentials: 'include'` does the rest. This is the recommended
   production setup; no token handling at all.
2. **Bearer token** — a dashboard JWT, persisted in `sessionStorage` under
   `gnapex.studio.accessToken`. Useful in development and for embedding.

A `401` triggers one transparent refresh attempt (`POST /auth/refresh`),
de-duplicated across concurrent requests.

---

## How an edit happens

The architecture is **local-first, server-authoritative**, and that is the
single most important thing to understand before changing the editor.

```
  author acts
      │
      ▼
  typed WorkspaceOperation ──► applied locally, immediately (optimistic)
      │                        canvas + layer list update in the same frame
      ▼
  pending queue ──► debounced 1200ms ──► POST /workspace/:id/operations
      │
      ▼
  backend compiles the whole document ──► returns the authoritative document
      │
      ▼
  store adopts it. If it differs from the local copy, the server's wins.
```

- **Every edit is an operation.** There is no "mutate the document object"
  path. Dropping a component, dragging it, changing a prop, toggling a token —
  all produce an operation. This makes undo operation replay and means the wire
  format and the local model are the same thing.
- **The backend is the only authority on validity.** `compile()` re-parses
  everything from scratch. The Studio's local reducer is a fast approximation
  that produces a *candidate*; it never has the last word.
- **Conflicts are surfaced, never retried.** A `409` means someone else saved
  while you were editing. The store enters an explicit `conflict` state and the
  UI stops autosaving until the author chooses: reload theirs, or keep theirs.
  Blindly overwriting another author's work is the one unforgivable failure mode
  here.

The local evaluator (`src/lib/editor/reducer.ts`) mirrors the backend's
semantics deliberately, with comments tying each subtle case back to its backend
counterpart. Two worth knowing:

- A prop value of `null` **deletes** the key (as `node.updateProps` documents).
- There is **no single `hidden` flag**. Visibility is per breakpoint
  (`hideOnMobile` / `hideOnDesktop`); "hidden" in the UI means hidden on both.

---

## Draft and live

Two revisions are tracked per workspace: `draftRevision` (advances on every
draft write) and `liveRevision` (advances only on publish). The toolbar shows
both, always, because the gap between them *is* the amount of unpublished work.

This is what makes previewing safe. A `?preview=draft` read needs either a
signed preview token or a real dashboard identity; an SDK key is explicitly not
enough, and a denied draft read returns **404**, not 403, so it does not confirm
that a draft exists.

The Studio does not render a draft itself. It frames the **real portal**:

- `NEXT_PUBLIC_PREVIEW_ORIGIN` set → the frame points straight at
  `https://<portal-origin>/portal/…?preview=draft&previewKey=…`.
- Not set → a relative `/portal/…` URL, for a portal served behind the same
  reverse proxy as the Studio.
- `NEXT_PUBLIC_PREVIEW_PROXY=1` → the frame points at the Studio's
  `src/app/preview/route.ts`, which fetches the portal document and re-serves it
  from the Studio's own origin. This is the fallback for a portal that sends
  `X-Frame-Options`/`frame-ancestors` blocking a cross-origin frame; the route
  injects `<base href="<portal-origin>/">` so the portal's `/_next` assets still
  resolve to the portal.

The `src` passed to the proxy is validated against an allow-list on every
request — an unvalidated frame source would be a clickjacking vector. There is
exactly one renderer, and it belongs to the client's site.

### The two reversals — do not confuse them

| Action | Endpoint | Effect |
| --- | --- | --- |
| **Discard draft** (toolbar) | `POST /projects/:id/workspace-template/revert` | Throws away unpublished work. **Visitors are unaffected.** |
| **Roll back live** (History panel) | `POST /workspace/:id/revert { revision }` | Makes the live site match an older revision, published forward as a new `ROLLBACK`. **Visitors are affected immediately.** |

Both are confirmed, and they live in different places on purpose.

---

## The inspector is generated, not written

`src/components/inspector/field-renderer.tsx` renders one control per
`ManifestFieldType` and **no bespoke UI per component**. Adding a component to
the backend registry adds a working editor for it with no frontend change — the
manifest already describes every field.

Two properties are maintained on purpose:

- **LIST is recursive.** A repeater's `itemFields` are themselves
  `ManifestField`s, so a list of lists works with no special-casing.
- **Nothing is invented.** An unrecognised field type falls back to a JSON
  editor rather than silently dropping the value, so a forward-compatible
  manifest never loses data.

The tabs mirror the document's own splits: *Content* is `props`, *Layout* is the
component's `layout` meta, *Data* is `binding` (offered only when the manifest
declares bindable props), *Advanced* is the escape hatch.

---

## Tokens are security-relevant

The SDK's `NexusProvider` takes every global token and writes it to
`document.documentElement.style` as a CSS custom property — on every visitor's
page. A token is therefore **arbitrary CSS injected into the public site**.

The backend enforces the real boundary (the key must survive the SDK's
camelCase→kebab conversion into a legal custom-property name; the value must be
a safe CSS value). `src/lib/validate.ts` mirrors those rules so the panel can
show the rejection **as the author types**, rather than on the next save. The
mirror is intentionally exact: anything the backend accepts, this accepts. When
they disagree the backend wins and the diagnostics land inline — a confusing UX,
never a security gap.

---

## Contract drift

`src/lib/contract.ts` mirrors the backend's shapes and is **duplicated, not
imported**. The backend is a NestJS app; importing its Zod kernel into a Next.js
bundle would drag Prisma and `@nestjs/*` into the browser.

The duplication is bounded by a rule: anything the backend can *reject* is
validated by the backend. These types only need to be good enough to render a
form and build a request. So a drift here surfaces as a compiler error at the
call site or an inline 4xx diagnostic — never as silent corruption.

When the backend's manifest or operation shapes change, update
`src/lib/contract.ts` in the same change.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3010. |
| `npm run build` | Production build. |
| `npm run start` | Serve a production build. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint (flat config, `eslint-config-next`). |

---

## What the backend must provide

The Studio is only as useful as the API behind it. It expects:

| Method | Path | Used for |
| --- | --- | --- |
| `GET` | `/workspace/:projectId/manifest` | Component registry, page catalog, tokens, data sources. |
| `GET` | `/workspace/:projectId/document` | The draft document. |
| `GET` | `/workspace/:projectId/sync-status` | Polled to notice an out-of-band publish. |
| `POST` | `/workspace/:projectId/operations` | The primary edit path (batched). |
| `PUT` | `/workspace/:projectId/document` | Whole-document replace (rare). |
| `POST` | `/workspace/:projectId/publish` | Publish the draft. |
| `POST` | `/workspace/:projectId/revert` | Roll live back to a revision. |
| `GET` | `/workspace/:projectId/history` | Revision ledger. |
| `GET` | `/workspace/:projectId/history/:revision` | One revision's document. |
| `GET` | `/workspace/:projectId/diff` | Structural diff between revisions. |
| `GET` | `/projects/:projectId/workspace-template/gallery` | Template gallery. |
| `POST` | `/projects/:projectId/workspace-template/select` | Apply a template to the draft. |
| `POST` | `/projects/:projectId/workspace-template/revert` | Discard the draft. |
| `POST` | `/projects/:projectId/workspace-template/preview-token` | Mint a draft-preview link. |
| `GET` | `/projects` · `/auth/session` | The launcher's project list and identity. |
# studio
