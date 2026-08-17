# Dashboard & wizard refinements

## 1. Referral Link asterisk (Personal Info)
The "Referral Link" field in the wizard's Personal Info step uses the required-style label. Switch it to a plain label (no red asterisk) so it reads as optional. No validation change.

## 2. Denver time everywhere
A `todayMDT()` helper already formats dates in `America/Denver`. Extend this into a small shared date/time module so every displayed date and time in the app renders in Denver time:
- Add `formatDateDenver()` and `formatTimeDenver()` helpers next to the existing date utilities.
- Use them for the dashboard/attendance "Last updated" time, attendance clock in/out times, the wizard's autosave "saved at" time, and any other rendered timestamp.
- Show a short "MT" suffix on displayed clock times so the timezone is unambiguous.

## 3. Work Setup: Next button in the dashboard
When the Work Setup section is being edited and the active tab is **Device Specification**, show a green **Next** button to the right of Save that switches the tab to **ISP Setup**. Once the ISP Setup tab is active, the Next button hides. Save/Cancel behave as today.

## 4. Focus the first invalid field on save
Today Save is simply disabled with a hint. Instead, when a save is attempted with missing required data, scroll to and focus the first invalid field and mark it with the existing red error styling. Implementation: give required inputs stable identifiers per section, and on save run the section validator, find the first failing field, `scrollIntoView` + `focus()` it, and show a toast naming what's missing.

## 5. Assessment card gated on 100% profile
The "Take the Assessment" card and its Start button appear only when the profile completion is 100% **and** the backend `can_do_assessment` is yes. Below 100% the card is hidden entirely.

## 6. Assessment completion gates Apply/Reapply
Add an `assessmentCompletedThisSession` state (kept in `sessionStorage`, keyed by contact id):
- Set to true when the dashboard assessment dialog confirms completion (the existing "advance" result).
- The Apply Now / Reapply button — both in the header and on the Profile Complete card — only renders when this state is true (in addition to the existing 60-day and section-completeness rules).
- Once completed, the assessment cannot be restarted for the rest of the session: the Start Assessment button becomes a disabled "Assessment completed" state. It becomes available again in a new session, and only while `can_do_assessment` is yes.

## 7. Uploaded files visible immediately after save
Files currently appear only after a page refresh because the read-only view renders from the URL lists returned by the backend, which are not refreshed after a save. Fix: after a successful save, re-fetch the profile payload (the same loader used on mount) so portfolio, compliance and work-setup file lists — plus completion percentage — update in place. Keep the optimistic local state so the section does not flicker.

## Technical notes
- Files touched: `src/components/steps/PersonalInfoStep.tsx`, `src/lib/date.ts` (new Denver helpers), `src/pages/Dashboard.tsx`, `src/pages/Index.tsx`, and `src/components/steps/WorkSetupStep.tsx` (tab control already exposed via `activeTab`).
- No backend/API contract changes; item 7 reuses the existing profile fetch.
