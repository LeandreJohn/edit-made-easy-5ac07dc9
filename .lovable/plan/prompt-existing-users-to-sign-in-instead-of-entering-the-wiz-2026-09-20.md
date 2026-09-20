# Prompt existing users to sign in instead of entering the wizard

## Background

The `/signup` endpoint now returns `200` with `existing: true` (plus the existing `contact_id` and a message telling the user to sign in) when the email already has an account, instead of throwing an error. The frontend's only duplicate-email handling was a catch-block on error messages, so an existing user currently sails through NDA → "Ready" → wizard as if the account were new.

## Change

**File: `src/lib/apiClient.ts`**
- Extend the `AuthResponse` interface with `existing?: boolean` and `message?: string` so the signup response exposes the new flag.

**File: `src/components/steps/WelcomeStep.tsx` — `handleProceed`**
- After `apiSignup(...)` succeeds, check `res?.existing`:
  - If `existing` is true: close the Ready dialog and the NDA modal, clear the signup-submitting state, and open the existing `existsOpen` dialog ("This email already has a profile" with **Forgot password?** and **Sign in instead** buttons). Do NOT save the returned contact_id, do NOT call `onStart()`, and do NOT enter the wizard. Focus the email input when the dialog is dismissed ("Sign in instead" already does this).
  - If `existing` is false or absent: current behavior (save contact_id, toast, proceed).
- Keep the existing catch-block duplicate detection as a fallback for older error-style responses.

## Verification

- `bun run build`.
- Playwright: submit signup with an already-registered email → expect the "This email already has a profile" dialog and no wizard entry; submit with a fresh email → proceeds as before (can't fully verify against the real backend from the preview; the flag logic is unit-level straightforward).
