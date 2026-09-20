# Adopt a new Contact ID returned by the Personal Info save

When the Personal Info save responds with a different applicant ID, the app should switch to that ID for every following save. If the response has no ID, or repeats the current one, the existing ID stays in use.

## Behaviour

- Personal Info save succeeds and the response contains an applicant ID that differs from the stored one -> store the new ID and use it for all later saves in that session (education, professional background, work setup, compliance, reapply, assessment, etc.).
- Response contains the same ID, no ID at all, or only a success flag -> keep the current ID, no change.
- The ID is read from the common spellings the backend may use: `contact_id`, `contactId`, `cid`, `CID`, `id`, including one level of nesting under `data` / `contact`.
- Only non-empty string/number values count; blank or null values are ignored.

## Technical changes

**`src/lib/apiClient.ts`**
- Widen the `updatePersonalInfo` response type to allow the ID fields, and add a small `extractContactId(res)` helper that scans the known keys (top level plus `data`/`contact`) and returns a trimmed non-empty ID or `null`.
- Make `updatePersonalInfo` return the parsed response, and after a successful call, if `extractContactId` yields an ID different from `loadContactId()`, call `saveContactId(newId)` and return it to the caller.
- `submitSubstep` case 1 forwards the result so wizard callers can pick up the new ID.

**`src/pages/Index.tsx` (wizard)**
- `contactId` is read once per submit at line ~334; after `submitSubstep` for substep 1, re-read `loadContactId()` for the rest of the flow so later substeps and the completion/finish call use the updated ID.

**`src/pages/Dashboard.tsx`**
- `contactId` is currently captured once at component scope (line 140). Change it to state initialised from `loadContactId()`, and after the Personal Info save (line ~580) update that state when the returned ID differs, so subsequent section saves, the reapply call and the assessment launch use the new ID.

No backend or payload shape changes; the ID sent in each payload simply follows the stored value.
