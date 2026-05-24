---
artifact: ITER_03
status: ready
created: 2026-05-23
scope: Frontend shell — Vite project setup, routing, Zustand auth store, Axios client with token refresh, login/register pages, dashboard shell, settings page
sections_changed: [03, 05]
sections_unchanged: [01, 02, 04, 06]
---

# ITER_03 — Frontend Shell

## §01 · Concept
> Unchanged — see SKELETON.md §01

## §02 · Architecture
> Unchanged — see SKELETON.md §02

---

## §03 · Tech Stack

New dependencies for this iteration:

| Package | Purpose |
|---|---|
| `react`, `react-dom` | UI library |
| `@vitejs/plugin-react` | Vite plugin |
| `typescript` | type checking |
| `react-router-dom` v7 | routing |
| `zustand` | global state |
| `axios` | HTTP client |
| `zod` | schema validation |
| `sonner` | toast notifications |
| `vitest`, `@testing-library/react`, `jsdom` | unit + component testing (dev) |

---

## §05 · Frontend

### 1. Project Setup

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom zustand axios zod sonner
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add Vitest config to `vite.config.ts`:
```typescript
/// <reference types="vitest" />
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

`src/test/setup.ts`:
```typescript
import "@testing-library/jest-dom";
```

`.env.example`:
```
VITE_API_URL=http://localhost:8000
```

`vite.config.ts` — no special proxy needed; Axios uses `VITE_API_URL` directly.

### 2. Folder Structure

```
frontend/src/
├── main.tsx                  React root, providers
├── App.tsx                   router definition
├── config.ts                 export API_URL from import.meta.env
├── stores/
│   ├── authStore.ts          Zustand — user, tokens, isAuthenticated
│   └── sessionStore.ts       Zustand — sessions list, current session (stub for now)
├── services/
│   └── api.ts                Axios instance + interceptors
├── schemas/
│   └── user.ts               Zod schema for UserResponse
├── components/
│   ├── AppHeader.tsx
│   ├── ProtectedLayout.tsx
│   └── ApiKeyGuard.tsx
└── pages/
    ├── LoginPage.tsx
    ├── RegisterPage.tsx
    ├── DashboardPage.tsx     shell — header + empty state for now
    └── SettingsPage.tsx
```

`SessionPage.tsx` and all graph/chat components are introduced in ITER_04 and ITER_05.

### 3. Axios Client (`src/services/api.ts`)

Create a single Axios instance with `baseURL` set to `VITE_API_URL`.

**Request interceptor:** attach `Authorization: Bearer <token>` from `authStore` on every request.

**Response interceptor — token refresh:**
1. On 401 response: call `POST /auth/refresh` with `withCredentials: true`
2. If refresh succeeds: update token in `authStore`, retry original request once
3. If refresh fails: call `authStore.logout()`, redirect to `/login`

> **Gotcha — token refresh race condition:** Multiple concurrent requests receiving 401 will each independently try to refresh. The second refresh call will fail (token already rotated) and log the user out. Fix: track an in-flight refresh promise. If a refresh is already in progress, queue additional 401s and resolve them all with the same refresh result.

```typescript
let refreshPromise: Promise<string> | null = null;

// In 401 interceptor:
if (!refreshPromise) {
  refreshPromise = api.post("/auth/refresh", {}, { withCredentials: true })
    .then(res => res.data.access_token)
    .finally(() => { refreshPromise = null; });
}
const newToken = await refreshPromise;
// retry original request with newToken
```

> **Gotcha — httpOnly cookie cross-origin:** The refresh cookie is httpOnly and will not be sent unless `withCredentials: true` is set on the refresh call specifically. The regular Axios instance does not need `withCredentials` on every request — only the refresh call does.

### 4. Auth Store (`src/stores/authStore.ts`)

```typescript
interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}
```

Persist `accessToken` to `localStorage` so the user stays logged in on page refresh. On app load (`main.tsx`), call `authStore.fetchMe()` to validate the stored token and load the user profile.

`UserResponse` includes `has_api_key: boolean`. This is the flag used by `ApiKeyGuard`.

### 5. Routing (`src/App.tsx`)

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedLayout />}>
      <Route element={<ApiKeyGuard />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/session/:id" element={<SessionPage />} />  {/* introduced ITER_04 */}
      </Route>
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" />} />
  </Routes>
</BrowserRouter>
```

**`ProtectedLayout`** — if `!isAuthenticated`, redirect to `/login`. Otherwise render `<Outlet />`.

**`ApiKeyGuard`** — if `!user.has_api_key`, render a full-page banner: "Add your Anthropic API key in Settings to get started." with a link to `/settings`. Otherwise render `<Outlet />`.

### 6. Login + Register Pages

Standard controlled form with email + password fields. No library needed — plain `useState`.

On submit: call `authStore.login()` or `authStore.register()`. On success: navigate to `/dashboard`. On error: display the API error message inline below the form.

No validation library at this stage — just ensure fields are non-empty before submitting.

### 7. Dashboard Page (shell)

At this iteration the dashboard renders:
- `<AppHeader />` — logo + user name + logout button
- Empty state: "No analyses yet. Start your first one →" with a "New Analysis" button (button is non-functional in this iteration — wired in ITER_04)
- API key missing banner (yellow bar at top) is handled by `ApiKeyGuard` wrapping the route

Session list is implemented in ITER_04.

### 8. Settings Page

Four sections rendered as a single page (no sub-routes):

**Profile** — display name/email edit form. `PATCH /api/users/me`.

**API Key** — password-type input showing masked placeholder if key exists. A single "Save" button. `PUT /api/users/me/api-key`. On success, call `authStore.fetchMe()` to update `has_api_key`.

**Security** — change password form (current + new + confirm). `PATCH /api/users/me/password`.

**Danger Zone** — "Delete Account" button. Opens a confirmation modal requiring the user to type their password. `DELETE /api/users/me`. On success: `logout()` → redirect to `/login`.

### 9. AppHeader Component

Props: `{ sessionName?: string; onRename?: (name: string) => void }`.

Left side: logo + session name (if provided; double-click to edit inline).
Right side: user display name + "Settings" link + "Logout" button.

### 10. Providers (`src/main.tsx`)

```tsx
<BrowserRouter>
  <App />
  <Toaster />    {/* sonner */}
</BrowserRouter>
```

On app load, call `authStore.getState().fetchMe()` before rendering to validate any stored token and populate the user profile. If the token is stale, `fetchMe` triggers a refresh via the Axios interceptor; on failure it clears the store and the `ProtectedLayout` redirects to `/login`.

---

## §04 · Backend
> Unchanged — see ITER_02.md §04

## §06 · LLM / Prompts
> Unchanged — see ITER_02.md §06
