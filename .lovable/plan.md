# Phone validation tests, preview polish, and dashboard fixes

## 1. Phone number tests + invalid-format highlight

- Add unit tests for the dial-code splitting logic in `PhoneInput` covering `+639458707854` → `+63` / `9458707854`, `+1...`, `+44...`, `+971...`, already-spaced values, unknown prefixes, and empty input, plus round-trip recomposition to `+63 9458707854`.
- Add light validation to the phone field: when the number part is missing, too short, or contains invalid characters for the selected dial code, the input border glows red (destructive ring) with a short helper message. Valid values render normally.

## 2. Graceful preview placeholders on the dashboard

- Every preview `Field` renders a muted em dash placeholder ("—" / "Not provided") when the value is null, empty, or an empty array, instead of rendering blank or crashing.
- File lists with no entries show "No files uploaded"; malformed JSON (e.g. `Social_Link`) is caught and skipped rather than throwing.
- Sections keep rendering all known fields so the applicant can see what is still missing.

## 3. Referred By: tooltip + consistent disabled styling

- In both the wizard's Personal Info step and the dashboard's Personal Information editor, the Referred By input uses the same disabled styling (muted background, lock affordance) and an info tooltip: it is set by the referral link used at signup and cannot be edited.

## 4. Signup "user already exists" prompt

- When signup fails because the email is already registered, the dialog message tells the user the account exists and offers two actions: sign in, or "Forgot password?" which opens the existing password-recovery dialog pre-filled with the entered email.

## 5. Work Setup added to dashboard step gating

- Gating order becomes: Personal Info → Education → Professional Background → Value Proposition → Work Setup → Compliance. Work Setup locks until Value Proposition is complete, and Compliance now also requires Work Setup.

## 6. Profile completion percentage counts uploaded files

The dashboard currently checks only newly picked `File` objects, so documents that already exist in the payload (returned as URLs) are ignored and the percentage reads low.

- Completeness checks accept either a newly selected file or an existing URL from the payload:
  - Work Setup: `primary_device_spec_files` counts as the device screenshot requirement.
  - Compliance: `valid_id_files` counts as the valid-ID requirement (same for NBI / police / COE where used).
- Applies to both the dashboard and the attendance view, and to the sidebar lock state and "Next Step" card, so all three agree.

## Technical notes

- Files touched: `src/components/common/PhoneInput.tsx` (+ new `PhoneInput.test.ts` for the split/format helper, exported for testing), `src/pages/Dashboard.tsx` (placeholders, gating order, completeness with URL fallbacks, Referred By styling), `src/components/steps/PersonalInfoStep.tsx` (tooltip/styling), `src/components/steps/WelcomeStep.tsx` (existing-user prompt), `src/lib/validation/stepValidation.ts` (optional URL-aware variants of the work setup / compliance checks).
- Tests run with the existing Vitest setup.
