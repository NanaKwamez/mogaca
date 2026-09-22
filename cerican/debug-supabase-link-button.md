# Debug Session: supabase-link-button
- **Status**: [OPEN]
- **Issue**: Supabase link/connect button shows no working result, and login/profile resolution is failing even though Supabase credentials exist in `.env.local`.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-supabase-link-button.ndjson

## Reproduction Steps
1. Try to connect or use the Supabase integration/button.
2. Observe that nothing useful happens.
3. Try to log in to the app.
4. Observe that profile resolution may fail with `no_profile`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The built-in Supabase integration is not actually linked to this workspace, so integration-backed actions fail silently. | High | Low | Pending |
| B | The app env vars are present and usable, but some flows still depend on the broken integration path. | High | Low | Pending |
| C | Remote auth users exist, but `user_id` links in `staff`, `students`, or `guardians` are missing or inconsistent. | High | Medium | Pending |
| D | Student login fails because student lookup lacks the same fallback strategy used for staff and guardians. | Medium | Low | Pending |
| E | Server-side account creation/linking is using the wrong server key variable, causing partial auth setup. | Medium | Low | Pending |

## Log Evidence
- Pending

## Verification Conclusion
- Pending
