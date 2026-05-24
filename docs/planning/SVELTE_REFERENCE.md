---
artifact: SVELTE_REFERENCE
status: reference
created: 2026-05-23
scope: SvelteKit frontend delta — what changes from the React implementation. Not part of the active build path.
---

# SVELTE REFERENCE — IdeaLens Frontend (SvelteKit)

> This document captures what changes when implementing the IdeaLens frontend in SvelteKit instead of React.
> The React implementation (SKELETON.md + ITER_01 through ITER_07) is the active build path.
> Use this as a starting point if you ever want to build the SvelteKit version.
>
> Everything not mentioned here is identical to the React implementation.

---

## Stack Differences

| Layer | React (active) | SvelteKit |
|---|---|---|
| Framework | React 19 + Vite | SvelteKit 2 + Vite |
| State | Zustand | Svelte writable stores |
| Routing | React Router v7 | SvelteKit file-based routing |
| Graph | `@xyflow/react` | `@xyflow/svelte` |
| HTTP client | Axios | `fetch` wrapper (no Axios needed) |
| Forms | plain `useState` | SuperForms + Zod |
| UI primitives | plain HTML + CSS | Melt UI (headless) |
| Split panel | `react-resizable-panels` | `svelte-splitpanes` |
| Toasts | `sonner` | `svelte-sonner` |

---

## Routing

SvelteKit uses file-based routing. The equivalent of React Router's nested layouts:

```
src/routes/
├── (auth)/
│   ├── login/+page.svelte
│   └── register/+page.svelte
├── (protected)/
│   ├── +layout.ts          auth guard via load() + redirect()
│   ├── (requires-api-key)/
│   │   ├── +layout.ts      api key guard
│   │   ├── dashboard/+page.svelte
│   │   └── session/[id]/+page.svelte
│   └── settings/+page.svelte
└── +layout.ts              export const ssr = false
```

Auth guard in `(protected)/+layout.ts`:
```typescript
export async function load({ parent }) {
  const { user } = await parent();
  if (!user) throw redirect(302, "/login");
}
```

**Critical:** Add `export const ssr = false` to the root `+layout.ts`. IdeaLens is a SPA — server-side rendering is not compatible with the session-based auth flow.

---

## Stores (Svelte writable)

Replace Zustand with Svelte writable stores. Pattern:

```typescript
// src/lib/stores/authStore.ts
import { writable } from "svelte/store";

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);
  return {
    subscribe,
    async login(email: string, password: string) { ... },
    async logout() { ... },
    async fetchMe() { ... },
  };
}

export const authStore = createAuthStore();
```

Access in components: `$authStore.user` (Svelte auto-subscription syntax).

---

## HTTP Client

No Axios. Use a `fetch` wrapper in `src/lib/services/api.ts`:

```typescript
export async function apiFetch(path: string, init?: RequestInit) {
  const token = get(authStore).accessToken;
  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    // attempt refresh...
  }
  return res;
}
```

`PUBLIC_API_URL` comes from `$env/static/public` (SvelteKit's env handling).

- **AWS (CloudFront + EC2):** Set to `""` (empty string). CloudFront routes `/api/*` requests to the EC2 origin, so relative URLs work. The frontend and API share the same domain.
- **Railway + Vercel:** Set to the full Railway URL (e.g. `https://idealens-api.railway.app`). Frontend and API are on different domains, so an absolute URL is required. See `DEPLOYMENT.md §Option B`.

---

## SSE Client

Identical fetch-based approach as React (native `EventSource` is not used in either version). No changes needed.

---

## Graph Panel

`@xyflow/svelte` has the same API family as `@xyflow/react`:

```svelte
<script>
  import { SvelteFlow, Background, MiniMap, Controls } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";

  // nodeTypes MUST be defined at module level — not inside the component
  // same stable-reference gotcha as React
</script>

<SvelteFlow
  {nodes}
  {edges}
  {nodeTypes}
  on:nodedragstop={handleDragStop}
  on:nodeclick={handleNodeClick}
  on:nodecontextmenu={handleContextMenu}
  fitView
>
  <Background />
  <MiniMap />
  <Controls />
</SvelteFlow>
```

> **Gotcha — stable references:** In SvelteKit, `nodeTypes` must be defined at module level (outside the `<script>` block or in a separate file). Defining inside `<script>` causes the same remounting issue as React.

---

## Animations

SvelteKit has built-in transition directives:

```svelte
<!-- New node appearing -->
<div transition:scale={{ duration: 250 }} transition:fade>
  <AnalysisNodeComponent {data} />
</div>
```

For the 2-second highlight pulse on update: use a CSS keyframe class toggled via a store flag, same approach as React.

---

## Forms

SuperForms + Zod handles form state, validation, and submission:

```typescript
const form = await superForm(defaults(schema), {
  validators: zodClient(schema),
  onResult: ({ result }) => { ... }
});
const { form: formData, errors, enhance } = form;
```

```svelte
<form use:enhance>
  <input bind:value={$formData.email} />
  {#if $errors.email}<span>{$errors.email}</span>{/if}
</form>
```

---

## Production Docker Config

SvelteKit production uses `adapter-node`:

```bash
npm install @sveltejs/adapter-node
```

`svelte.config.js`:
```javascript
import adapter from "@sveltejs/adapter-node";
export default { kit: { adapter: adapter() } };
```

Production Dockerfile exposes port 80:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json .
RUN npm ci --omit=dev
ENV PORT=80
EXPOSE 80
CMD ["node", "build"]
```

Note: Dev server runs on port `3001` (set in `vite.config.ts`). Production container exposes port `80`. Both frontends expose port `80` in production — no infrastructure config changes needed when switching between React and SvelteKit.

---

## Dev Port

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [sveltekit()],
  server: { port: 3001 }  // React uses 3000; SvelteKit uses 3001
});
```

This allows both frontends to run simultaneously in local dev.
