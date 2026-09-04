# Dashboard gating, skip questions, and profile polish

## 1. Gate every dashboard step

All eleven sections become sequential in the existing sidebar order: Personal Information, Education, Professional Background, Work Experience, Tools & Platforms, Skills, Portfolio, Certifications, Value Proposition, Work Setup, Compliance.

A step unlocks only when every earlier step is satisfied. A step counts as satisfied when it has saved data, or when the applicant has answered "No" to its skip question.

Unlock-on-load rule: when data loads from the account, any later step that already has data automatically unlocks the earlier optional steps in front of it. So if a Value Proposition is already saved, Tools, Skills and Portfolio stop blocking, even if they came back blank.

## 2. Skip questions on the steps that don't have one

Work Experience, Certifications and Work Setup already ask a Yes/No question. Add the same style of question to:

- Tools & Platforms Used — "Do you use any tools or platforms?"
- Skills & Core Competencies — "Do you have skills you'd like to add?"
- Portfolio / Sample Works — "Do you have sample work to share?"

Answering No marks the step done and moves to the next one; the answer is remembered and can be changed later with the same "Change answer" link used elsewhere.

## 3. Green Edit button

The Edit button on each dashboard section becomes a solid green button with white text, a hover shade and a clear focus ring, so it reads as the obvious clickable action. Colours go into the shared theme tokens, not one-off values.

## 4. Personal Info address preview

In the read-only Personal Information view:

- If the street address has content, show street/city/state and hide the alternate address line.
- If it's empty and the alternate address has content, show the alternate address instead and hide the street/city/state fields.

## 5. Work Experience "No" saves a real entry

Answering No now sends a normal work-experience save containing one entry whose job title is "No Experience", with the other fields left blank — instead of sending an empty list.

## 6. Assessment step sizing

Shrink the embedded assessment frame so the page no longer stretches far below the fold, and move the Next / Submit guidance and controls to the top of the card so they're visible without scrolling.

## 7. Admin dashboard

An applicant whose only work-experience entry reads "No Experience" is displayed as having no work experience (the same empty state as a missing record), in both the profile tab and the generated resume.

## Technical notes

- `src/pages/Dashboard.tsx` — extend `GATED_ORDER` to all `SectionKey`s; add skip-answer state (persisted per section alongside the existing session state) folded into `sectionChecks`; add the "later step has data unlocks earlier optional steps" pass; update `PersonalView` address branch; green Edit button.
- New shared `SkipGate` component (extracted from the Work Experience pattern) reused by Tools, Skills and Portfolio in both the dashboard and the wizard steps.
- `src/index.css` / theme tokens — add a green action token for the Edit button.
- `src/components/steps/WorkExperienceStep.tsx` + the dashboard save path — on "No", emit `[{ title: 'No Experience', ... }]`.
- `src/components/steps/ValuesAssessmentStep.tsx` — reduce iframe height, hoist stage header/actions above the frame.
- `src/pages/AdminDashboard.tsx` — filter out entries whose title is `No Experience` when mapping `work_experience`.
