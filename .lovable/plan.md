# Plan: Standalone `/assessment` page + Values button relabel

## Goal

Add a public `/assessment` URL that lets a user (already reachable in another CRM step) run the IMX Values + DISC assessments without going through the full wizard. On submit, it POSTs Email / First name / Last name to `/us-assessment`, stores the returned `contact_id`, and then reuses the existing `AssessmentStep` component (Values → DISC) with a custom completion screen. Also relabel the wizard/Reapply assessment step's primary button so it reads **Next** during Values and **Submit** only during DISC.

## Changes

### 1. New API helper — `src/lib/apiClient.ts`
Add:

```ts
export interface UsAssessmentResponse { contact_id: string; /* pass-through */ }
export async function createUsAssessmentContact(payload: {
  email: string; firstname: string; lastname: string;
}): Promise<UsAssessmentResponse>
```

POSTs to `${API_BASE}${PREFIX}/us-assessment` (same base/prefix pattern as existing helpers). Returns the `contact_id` from the JSON body. Throws with a readable message on non-2xx (mirrors other helpers).

### 2. New page — `src/pages/AssessmentPage.tsx`

Route added in `src/App.tsx`:

```tsx
<Route path="/assessment" element={<AssessmentPage />} />
```

Three internal phases:

1. **`form`** — Card matching the app's existing card/muted-bg styling (see `CompletionStep` / wizard shell). Fields: Email (required, email regex), First name (required), Last name (required). Submit button uses `.btn-primary`. On submit:
   - Call `createUsAssessmentContact({...})`.
   - Save `{ contactId, email, firstName, lastName }` in local state and mirror to `localStorage` (`cb_us_assessment_identity`) so a refresh keeps the session.
   - Move to `assessment` phase.
   - Error → inline destructive alert, button re-enabled.

2. **`assessment`** — Renders the existing `AssessmentStep` with the ref API, passing `contactId`, `email`, `firstName`, `lastName`, and `onCompleted` (marks internal state → completion phase). Below the iframe, a single primary button reused from the existing pattern:
   - Label: **Next** while phase is Values, **Submit** while phase is DISC.
   - Disabled + cooldown handled via the same `checkAndAdvance()` return values (`'advance' | 'stay' | 'incomplete' | 'error'`) — `'incomplete'` triggers a 30-second countdown identical to Index/Dashboard.
   - The step-header instruction block on this page reuses the exact copy already rendered inside `AssessmentStep` (the "Please complete the embedded assessment below…" panel) plus one added line: *"The assessment is embedded in this page — you don't need to close your browser if it asks you to. When you finish the Values assessment click **Next**, and when you finish DISC click **Submit**."*

3. **`done`** — New completion card (visual language borrowed from `CompletionStep`: rounded card, arched primary header, animated check badge, Cyberbacker logo). Copy:
   - Heading: *"Congratulations — assessments completed!"*
   - Body: *"Your Values and DISC assessments have been submitted successfully. Our team will review your results and reach out with the next steps."*
   - Single **OK** button → resets state (clears the localStorage identity, resets to `form` phase, stays on `/assessment`).

No download buttons anywhere (matches existing rule: PDF downloads are admin-only).

### 3. Values button label change (wizard + Reapply)

Files: `src/pages/Index.tsx` and `src/pages/Dashboard.tsx`.

Both currently render `WizardNavigation` for the assessment step. Pass `nextLabel` based on the ref's current phase:

- While the AssessmentStep is in Values (or loading) → `nextLabel="Next"`.
- While in DISC → `nextLabel="Submit"` (and `isLast` handling stays as-is).

Implementation: expose a lightweight `getPhase()` on `AssessmentStepHandle` (returns `'values' | 'disc' | 'completed' | 'loading' | 'error'`), then in the parent compute `nextLabel` from that phase (read via a `useState` tick updated in an `onPhaseChange` callback added to `AssessmentStep`). `AssessmentStep` fires `onPhaseChange(phase)` in the same `setPhase` sites it already has.

The instruction block copy inside `AssessmentStep` gets the same added sentence about the embedded flow so it's identical across wizard, Reapply, and `/assessment`.

### 4. No changes to
- Backend contract for `/us-assessment` (assumed already live per user).
- `AssessmentResult`, `AdminDashboard`, other steps, or styling tokens.
- Existing routes.

## Technical notes

- `AssessmentStep` already caches Values/DISC codes and done-flags in `localStorage` keyed by `contactId`, so the `/assessment` flow naturally resumes on refresh once we've persisted the identity.
- `contact_id` is already forwarded on every IMX payload from `AssessmentStep` — no changes needed there.
- The completion screen's **OK** clears `cb_us_assessment_identity`, `cb_imx_values_code_<cid>`, `cb_imx_disc_code_<cid>`, and their `_done_` counterparts so a second user on the same browser starts fresh.

## Files touched

- `src/App.tsx` — add route.
- `src/pages/AssessmentPage.tsx` — new.
- `src/lib/apiClient.ts` — add `createUsAssessmentContact`.
- `src/components/steps/ValuesAssessmentStep.tsx` — add `onPhaseChange` prop, `getPhase()` on the handle, appended instruction sentence.
- `src/pages/Index.tsx`, `src/pages/Dashboard.tsx` — dynamic `nextLabel` based on phase.
