# Shared packages

Read root rules. Share small platform-neutral contracts, pure logic and semantic design tokens. Never import application internals or platform renderers into shared contracts/tokens. Avoid speculative abstractions. Add meaningful behavior tests when packages contain behavior.

Use @weave/typescript-config and @weave/eslint-config. UI design tokens are a source-only ESM package consumed by bundling clients. Any runtime package consumed by the API must compile to JavaScript/declarations with explicit exports and a build task; do not rely on Node type stripping for backend portability.
