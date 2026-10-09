# Verify woven artwork

From the repository root, install the locked dependencies with `pnpm install --frozen-lockfile`. Use the documented local database environment (`.env.example`) and run `pnpm run verify` plus `pnpm run test:integration` with DATABASE_URL configured. The integration suite expects the local PostgreSQL service and built API.

For targeted tests, run `node --import tsx --test test/auth-artwork.test.tsx test/auth-motion.test.tsx` from `apps/web/`. Start the production web build with the existing start script and configured Clerk environment. Inspect sign-in: one-second all-sides entrance, exact resting still, no layout shift or replay on form editing. Check reduced motion, narrow screens, no JavaScript, blocked/slow media and signup's static hero. Never submit real credentials as part of decorative-artwork checks.

Use `docs/design/auth-artwork.md` for asset hashes and reproducible export instructions. See `evidence.md` for what was actually run and remaining browser checks.
