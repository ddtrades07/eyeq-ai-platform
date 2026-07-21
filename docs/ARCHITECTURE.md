# Architecture

EyeQ AI is a single Next.js 15 application that owns the entire surface: marketing, staff console, patient portal, REST API mirrors, and server actions.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│                 UI  (RSC + client components)              │
│   /(staff)/*   /portal/*   /(auth)/*   marketing            │
└─────────────────────────────────────────────────────────────┘
                  │                  │
                  ▼                  ▼
   ┌────────────────────┐   ┌─────────────────────┐
   │ Server Actions     │   │ Route Handlers       │
   │ src/server/actions │   │ src/app/api/*        │
   └────────────────────┘   └─────────────────────┘
                  │                  │
                  ▼                  ▼
   ┌─────────────────────────────────────────────────┐
   │     Domain libraries  (src/lib/*)              │
   │   auth · rbac · audit · storage · ai · zod      │
   └─────────────────────────────────────────────────┘
                  │                  │
                  ▼                  ▼
        ┌─────────────────┐   ┌─────────────────┐
        │   Prisma + PG   │   │   Supabase      │
        │  (data of record)│   │ (Auth + Storage)│
        └─────────────────┘   └─────────────────┘
```

## Request flow (staff)

1. Browser request hits `src/middleware.ts`.
2. Middleware refreshes the Supabase cookie via `updateSession` and gates non-public routes.
3. Server component runs `requireStaffUser()` which calls `getCurrentUser()` (cached per request).
4. Page calls a `src/server/queries/*` helper for reads or imports a server action for writes.
5. Server actions wrap their work in `action({ schema, handler })`:
   - Zod validates input
   - `assertPermission(...)` enforces RBAC
   - `assertSameOrg(...)` blocks cross-tenant access
   - Prisma performs the work
   - `audit()` records the event
   - `revalidatePath(...)` invalidates the relevant route

## Multi-tenancy

Every row has `organizationId`. There is no row-level security trickery in app code; isolation is enforced by:

- `assertSameOrg(user, row)` on every read/mutate of an org-scoped resource.
- Server actions never trust the caller-supplied `organizationId`; they always derive it from the resolved session.

## RBAC

`src/lib/auth/rbac.ts` declares the permission grid as `Role -> Set<Permission>`. UI uses `hasPermission` to hide affordances; the server enforces it via `assertPermission`. The dual check matters: never trust the client.

## AI provider abstraction

`AIProvider` is a small interface (`complete`, `embed?`, `reviewImaging`). `getAIProvider()` picks the implementation based on `AI_PROVIDER`. Feature code never imports a concrete provider directly.

## Audit log

`audit(...)` is invoked from every mutation. It supports three sinks (DB / stdout / external) so you can adapt to your observability stack. Failures never block the originating operation.

## Storage

Imaging uploads are direct-to-Supabase. The server mints a one-time signed PUT URL via the service-role client (server only), records the path on `ImagingCase`, and never proxies bytes itself. Downloads are similarly signed.

## State management

- Server: `getCurrentUser()` cached per request; data fetched via Prisma.
- Client: TanStack Query for any client-side async work; Zustand for ephemeral UI prefs (`useUiStore`).
- Forms: native `<form>` + server actions; no client framework lock-in.
