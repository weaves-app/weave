# Validate revised WEA-10 Next.js authentication

Use the existing WEA-10 worktree. Approved design is signup/signin/required verification plus existing Home; invitations are deferred.

## Owner configuration

Set the following in ignored `apps/web/.env.local` in this worktree, never in chat or committed files:

```dotenv
CLERK_PUBLISHABLE_KEY=pk_test_<your development key>
CLERK_SECRET_KEY=sk_test_<your development secret>
```

Use one Clerk development application for the environment shared with Pravin. Enable email/password, email verification codes, and Google for all users in Clerk SSO connections. Keep unrelated mandatory signup fields/session tasks disabled for this skeletal flow. Development Google uses Clerk shared OAuth credentials; production needs custom Google credentials configured in Clerk. Owner configures settings; this session does not provision accounts, grants, secrets or settings implicitly.

After scenario agreement/implementation, run `npm run dev --workspace=@weave/web` and test in Chrome/Safari/another system browser. Authorize a disposable test identity; complete password, verification code and Google account consent steps yourself. Validate signup → required verification → Home, signout → same-account signin → Home, Google signup/signin, cancellation/retry, wrong codes, reload/signout/protected access. No demo success substitutes for provider acceptance.

Run relevant web tests after slices, then `npm run verify` and `npm run test:integration` with the documented local database prerequisites. Record current results, RED/GREEN ordering, screenshots, and blockers in evidence. Remote CI/code-owner review and Pravin’s native checks remain separate mandatory delivery requirements. No overall ticket Done from web completion.
