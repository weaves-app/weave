# Web

Read root AGENTS.md and docs/standards/{nextjs,typescript,testing-and-delivery}.md.
Use App Router server components by default and small client islands for interactions. Validate external JSON as unknown. Keep secrets in server-only environment variables; no Prisma/backend internals in clients. Reuse components with explicit variants and @weave/design-tokens; include loading/empty/error/accessibility states. Default exports are allowed only where Next requires entrypoints/configs. Avoid build-time public environment values for images promoted across environments. Test behavior, not implementation. Keep API calls in a typed client with an injected interface transport.
