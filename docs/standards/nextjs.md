# Next.js practices

App Router layouts/pages are Server Components by default. Client Components are needed for state, effects, and browser APIs; use the client boundary narrowly. [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).

## Proposed Weave policy

- Keep route files thin. Organize feature UI, hooks, and application behavior separately from the route tree. Named exports for reusable components; framework-required route default exports only.
- NestJS owns business behavior and persistence. Next.js may act as a server-side API client/BFF, but must not create a second business layer or import Prisma/backend internals.
- Put API access behind typed interface contracts. Wire the HTTP implementation at composition boundaries. Validate JSON responses and define predictable error shapes.
- Explicitly choose caching/revalidation per query using installed-version documentation. Never globally cache user-specific data. Avoid assuming old Next.js cache defaults.
- Keep secrets on the server; NEXT_PUBLIC values are public. Minimize data passed to client components. Treat route handlers and Server Actions as externally accessible entry points needing validation and authorization. [Data security](https://nextjs.org/docs/app/guides/data-security).
- Prefer URL state for shareable filters and local state for local interaction. Keep server state separate. Handle loading, empty, error, and unauthorized states.
- Use semantic HTML, accessible labels/focus, keyboard support, and design tokens. Prefer framework image/font tools where appropriate; measure bundle and interaction performance.
- Test component behavior and critical browser journeys. Verify production builds, metadata, accessibility, and request behavior before release. [Production checklist](https://nextjs.org/docs/app/guides/production-checklist).

Existing scaffold: the page fetches the API directly and trusts parsed JSON. Extract an API contract/adapter, validate the response, and compose a reusable status component during the standards implementation. Avoid creating speculative shared component packages before their responsibilities are known.
