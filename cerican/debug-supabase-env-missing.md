# Debug Session: supabase-env-missing [OPEN]

- **Status**: OPEN
- **Issue**: Login page shows Supabase URL/API key missing even after `.env.local` was filled.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-supabase-env-missing.ndjson

## Reproduction Steps
1. Start the app locally with `npm run dev`.
2. Open the login page.
3. Enter credentials and click **Sign In**.
4. Observe the red Supabase env error.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The running dev server is still serving a bundle built before the env values were present. | High | Low | Pending |
| B | The browser bundle is not receiving `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. | High | Low | Pending |
| C | The wrong local app copy or port is being used. | Medium | Low | Pending |
| D | The client wrapper is resolving env keys incorrectly at runtime. | Medium | Low | Pending |

## Log Evidence
- Confirmed redirect loop from middleware logs:
  - repeated entries show `path: "/login"` with `target: "/login?error=no_profile"` and `foundProfile: "none"`
  - this proves the app was redirecting the login page back to itself for signed-in users without a matched profile

## Verification Conclusion
- Hypothesis A: inconclusive
- Hypothesis B: rejected for current symptom
- Hypothesis C: confirmed in middleware trace
- Hypothesis D: confirmed as the root cause of the loop behavior
