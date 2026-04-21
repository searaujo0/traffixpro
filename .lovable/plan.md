

## Fix: Facebook OAuth callback never executes

### Problem

The Facebook OAuth flow completes on Facebook's side, but when the user is redirected back to `traffixpro.lovable.app/auth/facebook/callback`, the callback page never actually runs. Two issues cause this:

1. **Route nesting bug**: The file `auth.facebook.callback.tsx` becomes a child route of `auth.tsx` (TanStack Router convention: dots = parent/child). But `auth.tsx` renders a login form without an `<Outlet />`, so the callback component is never mounted.

2. **Redirect loop**: `auth.tsx` detects the user is already logged in and immediately redirects to `/` or `/meu-painel`, so `finishMetaConnection` never gets called. The Facebook code is lost and no connection is saved.

### Solution

Rename the callback route file so it is NOT a child of the auth route. This way it renders independently and can execute the token exchange.

### Steps

1. **Rename route file** from `src/routes/auth.facebook.callback.tsx` to `src/routes/auth_.facebook.callback.tsx`
   - The underscore after `auth` tells TanStack Router this is a layout-less route (not a child of `auth.tsx`)
   - The route path stays `/auth/facebook/callback` but renders independently

2. **Update the route definition** inside the renamed file:
   - Change `createFileRoute("/auth/facebook/callback")` to match the new file convention (the auto-generated route tree will handle the path)

3. **Verify `routeTree.gen.ts`** regenerates correctly with the callback route having `getParentRoute: () => rootRouteImport` instead of `AuthRoute`

4. **Add error logging** to the callback page so if `finishMetaConnection` fails, the user sees what went wrong (currently errors may be swallowed silently)

### No database or backend changes needed

The server functions (`finishMetaConnection`, `listMetaConnections`) are working correctly. The problem is purely that the callback UI component never mounts due to the routing structure.

