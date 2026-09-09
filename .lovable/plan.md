# Dashboard gating fix, tracking move, and small UI polish

## 1. Dashboard steps unlock when there is no data

Cause found in `src/pages/Dashboard.tsx`: a section counts as "done" either when it has saved data **or** when a Yes/No skip answer of "No" is stored. Those skip answers live in the browser session and are also written by the wizard, so a leftover "No" (for example on Certifications) makes a later section look done. The rule "if a later section is done, unlock everything before it" then unlocks the whole sidebar even for a brand-new, empty profile.

Fix:

- The "a later section unlocks the earlier ones" rule will only consider sections that hold **real saved data**, never sections that are only marked done by a "No" answer.
- Skip answers still count for the section they belong to (answering No to Tools still lets you move past Tools), but they no longer unlock unrelated earlier steps.
- Work Experience will only count as done when it holds a real entry, a "No Experience" entry saved on the account, or an explicit "No" answer — not merely a non-empty in-memory list.
- When the account loads with no saved data at all, any leftover skip answers from a previous wizard session are cleared, so a fresh profile starts fully locked except Personal Information.

Verification: run the dashboard in the browser with an empty profile and confirm only Personal Information is clickable, then with a partly filled profile confirm the correct steps unlock.

## 2. Move the tracking event to the signup step

The conversion event currently fires on the wizard's final "Got it, thanks!" screen. It moves to the **"Continue Building My Profile"** button in the sign-up dialog, firing only after the account is created successfully. The dashboard Apply/Reapply event stays exactly as it is.

## 3. Green "Start Assessment" button

The assessment card's button becomes a green button with white text and a subtle, slow pulsing glow (a soft ring that breathes, no size jump), plus hover and focus states. Motion is disabled for users who prefer reduced motion, and the button stays plain grey when the assessment is already completed. The green tone is added to the shared theme tokens.

## 4. Assessment step: one set of controls

In the wizard's Assessment step, the Previous/Next row at the bottom of the page is removed; only the set already moved above the assessment frame remains.

## 5. Skipped wizard steps get the green check

Answering "No" and continuing on an optional step currently jumps ahead without marking the step complete on the left. Each skip will mark its step done, so the green check appears the same way as a normally completed step.

## Technical notes

- `src/pages/Dashboard.tsx` — split `sectionDone` into `sectionHasData` and `sectionSatisfied`; `isSectionLocked` uses `sectionHasData` for the look-ahead unlock and `sectionSatisfied` for the "previous steps complete" test; clear stale skip answers via `clearSkipAnswers()` once after load when no section has data; style the assessment button.
- `src/components/steps/WelcomeStep.tsx` — call `trackApplicationLead()` in `handleSignUp` after the signup request resolves.
- `src/components/steps/CompletionStep.tsx` — remove the `trackApplicationLead()` call.
- `src/index.css` / Tailwind config — green action token plus a `breathe` keyframe/utility honouring `prefers-reduced-motion`.
- `src/pages/Index.tsx` — remove the second `WizardNavigation` render for sub-step 12; in each `onSkip` handler, add the current sidebar step to `completedSidebarSteps` before advancing.
