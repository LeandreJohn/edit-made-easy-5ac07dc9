# Fix Compliance lock after skipped sections + "Not Found" upload failures

## Problem 1 — Compliance stays locked when optional sections were skipped

Dashboard sections unlock in order. A section counts as passed when it has data, or when the applicant answered "No" to its Yes/No question (Work Experience, Tools, Skills, Portfolio, Certifications).

Those Yes/No answers are kept in `sessionStorage` only (`cb_skip_*`). So on a new sign-in, a returning applicant who previously skipped Tools or Portfolio has neither data nor an answer for that section, and every section after it — including Compliance — stays locked. Typing anything into the skipped section unlocks the chain again, which matches what's being reported.

There is already a bypass for this ("if a later section has data, don't block"), but Compliance is the last section in the order, so nothing comes after it and the bypass never applies.

### Fix

In `src/pages/Dashboard.tsx`:

- Change the unlock rule so only *required* sections can block: Personal Information, Education, Professional Background, Value Proposition, Work Setup. The optional five never lock anything behind them; their own Yes/No prompt still appears inside the section.
- Keep the existing "a later section already has data" bypass, and extend it so the section being checked also unlocks when Work Setup already holds saved data (covers Compliance, the last item).
- Persist the Yes/No answers per applicant in `localStorage` keyed by profile ID (`src/lib/skipAnswers.ts`), so a "No" answer survives signing out and back in instead of being lost with the session.

Result: an applicant whose Work Setup is filled from the backend can always reach Compliance, whether or not they skipped optional sections.

## Problem 2 — "Not Found" on file upload, then the save fails

The toast text comes straight from the server: the request returns HTTP 404 and the app shows the `detail` message, so the save is being rejected before it reaches the save handler.

The most likely trigger is payload size. Every uploaded file is currently sent three times inside the same JSON body — as `content_base64`, `base64`, and `data_url`. Base64 already inflates a file by ~33%, so a single 10 MB attachment becomes roughly 40 MB of JSON, and the Compliance save can carry four attachments at once. Gateways in front of the API commonly reject oversized bodies with a generic 404/HTML page, which surfaces here as "Not Found".

### Fix

In `src/lib/apiClient.ts`:

- Send each file's base64 content once. Keep `file_name`, `filename`, `content_type`, `mime_type`, `size`, and `content_base64`; drop the duplicate `base64` and `data_url` copies. This cuts the request body to about a third.
- Add a guard before sending: if the total encoded payload exceeds a safe threshold (about 15 MB), stop with a clear message naming the files to shrink, instead of letting the server reject it.
- Improve the error text so a 404/HTML response reads as "Upload failed — the file may be too large or the server is unavailable" rather than a bare "Not Found", and include the failing action in the message.

In the Compliance section (`src/pages/Dashboard.tsx`), when a save fails, keep the applicant in edit mode with their selections intact so nothing is lost on retry.

### Needs your confirmation

Dropping `base64` and `data_url` assumes the backend reads `content_base64`. If the backend actually reads one of the other two, tell me which and I'll keep that single field instead.

## Verification

- Build passes.
- With a profile that has Work Setup data and skipped optional sections, Compliance is reachable.
- Uploading a document in Compliance saves; an oversized file gives a clear size message instead of "Not Found".
