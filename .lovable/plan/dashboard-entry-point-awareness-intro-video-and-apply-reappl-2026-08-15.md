# Dashboard entry-point awareness, intro video, and apply/reapply cleanup

## 1. Intro video on the dashboard

- Show the same intro video modal on the applicant dashboard (and attendance page) when the profile completion is below 100%.
- Auto-opens once per session; a "Watch intro video" entry stays available so it can be replayed. It does not appear once the profile reaches 100%.

## 2. Remove the assessment gate from Apply / Reapply

- Clicking Apply Now / Reapply goes straight to the referral-code dialog and submits — no assessment step, no "complete the Values Assessment first" block.
- The separate "Take the Assessment" card stays as the only place to start an assessment, and it no longer needs to be hidden when the reapply CTA is visible.

## 3. Apply / Reapply button on the "Profile Complete" card

- When every required section is complete, the card gains an Apply Now / Reapply button using exactly the same label, eligibility, and 60-day rules as the header button (including the "Reapply in N days" state).

## 4. Remember the entry URL used to sign in

Today the head-hunting / source / career-sourcing flags only live in memory for the wizard session, so once the applicant lands on the dashboard they are lost on reload.

- Persist the acquisition entry (head-hunting, davao-hub, source + name, career-sourcing + hearfrom, or plain home) in session storage when the applicant opens one of those URLs.
- The apply/reapply request carries the same flag set the signup payload uses for that entry URL (`headhunting`, `davaohub`, `source`/`source_name`, `career_sourcing`/`hearfrom`, with the others explicitly false).
- Sign out from the dashboard or attendance page returns the applicant to the URL they came in through (e.g. `/career-sourcing/facebook`) instead of `/`.

## 5. Referral code prefilled on apply/reapply

- A `?ref=` value present on the URL used to reach the dashboard is stored and pre-filled into the Referred By input in the apply/reapply dialog, displayed the same locked/disabled way as elsewhere.

## 6. Background-check prompt in the wizard

The one-shot prompt is wired into the wizard's Compliance step but is reported as still misbehaving. First step is to reproduce it in the running preview (upload a valid ID, leave the checkbox unticked, press Next twice) and confirm what actually happens before changing logic — the fix follows from that observation, then it is re-verified in the browser so the first Next shows the prompt and the second one saves and advances.

## Technical details

- `src/lib/headhunting.ts`: back the acquisition flags with `sessionStorage` (entry kind, source name, hearfrom, ref) so they survive reloads and dashboard navigation; add a helper returning the entry path for redirects.
- `src/pages/HeadHunting.tsx`, `DavaoHub.tsx`, `Source.tsx`, `CareerSourcing.tsx`: persist the entry (and `ref`) rather than only setting in-memory flags; drop the unmount cleanup that currently wipes them.
- `src/lib/apiClient.ts`: existing flag injector reads from the persisted store, so the reapply call picks the flags up automatically.
- `src/pages/Dashboard.tsx`: remove `assessmentDone` gating from `handleReapplyClick` / `submitReapply`; simplify `showAssessmentCard`; add the CTA to the Profile Complete card; seed `reapplyCode` from the stored ref and render it disabled; sign-out navigates to the stored entry path; mount `IntroVideoModal` when `completionPct < 100`.
- `src/pages/Index.tsx`: verify and fix the `authWarnedRef` / `authPromptOpen` flow on substep 11.
