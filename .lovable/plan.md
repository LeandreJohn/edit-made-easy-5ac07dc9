# Use the newest profile ID, and fully reset when returning to Welcome

## Goal

1. When saving Personal Information, if the server replies with a profile ID (`contact_id`), store that one and use it for every following save.
2. When someone goes back to the Welcome screen from the wizard, wipe everything saved for that session so the next person starts clean.

## Part 1 — Adopt a returned profile ID

Today `updatePersonalInfo` in `src/lib/apiClient.ts` is typed as returning only `{ success }`, and its response is ignored by both callers, so a new ID from the server is silently dropped.

Changes:
- `src/lib/apiClient.ts`
  - Type the `/personal-info` response as `{ success: boolean; contact_id?: string }`.
  - In `updatePersonalInfo`, if the response contains a non-empty `contact_id` that differs from the one sent, call `saveContactId(newId)` and return the response. This makes the swap automatic for every caller.
  - `submitSubstep` case 1: return the resulting ID (or void) so the wizard can react; keep the other cases unchanged.
- `src/pages/Index.tsx` (wizard) — after the Personal Info save, re-read the stored ID (`loadContactId()`) for subsequent steps instead of holding a stale value in a local variable, so later substeps post against the new ID.
- `src/pages/Dashboard.tsx` — after `updatePersonalInfo`, refresh the local `contactId` from storage so the following saves, refresh, and assessment calls use the new ID.

Because the ID lives in `localStorage` under `cb_contact_id` and every call reads it through `loadContactId()`, replacing it in one place propagates everywhere.

## Part 2 — Clear session data on return to Welcome

`handleBackToWelcome` in `src/pages/Index.tsx` currently clears only the wizard step state and the autosaved draft. Extend it to clear:

- the stored profile ID (`clearContactId()`)
- the saved name/email identity (`clearApplicantIdentity()`)
- the Yes/No answers for optional sections (`clearSkipAnswers()`)
- session flags: `cb_wizard_state_v1`, `cb_wizard_disclaimer_seen`, `cb_intro_video_shown`, `cb_dashboard_section`, `cb_dashboard_disclaimer_seen`, `cb_assessment_done_*`
- cached assessment codes for the old ID: `cb_imx_values_code_*`, `cb_imx_disc_code_*`, and their `_done_*` twins
- the form itself — reset it back to the blank defaults so the email/password and all answers on the Welcome screen start empty

Referral/acquisition context (`cb_referrer`, `cb_acquisition`) is kept, since it describes which link the visitor arrived through, not their answers.

Implementation detail: add a single `clearSessionData()` helper (in `src/lib/apiClient.ts` or a small new module) that performs the wipe, including a prefix sweep over `localStorage`/`sessionStorage` keys starting with `cb_imx_` and `cb_assessment_done_`, and call it from `handleBackToWelcome`.

## Verification

- Build passes.
- Wizard: save Personal Info, confirm the stored ID matches whatever the server returned and later steps post that ID.
- Wizard: click back to Welcome, confirm the email/password fields and all stored answers are empty and no profile ID remains.
