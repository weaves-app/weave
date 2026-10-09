# Web

Read root AGENTS.md and docs/standards/{nextjs,typescript,testing-and-delivery}.md.
Use App Router server components by default and small client islands for interactions. Validate external JSON as unknown. Keep secrets in server-only environment variables; no Prisma/backend internals in clients. Reuse components with explicit variants and @weave/design-tokens; include loading/empty/error/accessibility states. Default exports are allowed only where Next requires entrypoints/configs. Avoid build-time public environment values for images promoted across environments. Test behavior, not implementation. Keep API calls in a typed client with an injected interface transport.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
