# Fix profile completion broken by the new graduation date rule

## Confirmed cause

The backend returns `graduation_date` as an ISO date (`"2021-05-20"` in the sample payload). The dashboard stores that value as-is (`src/pages/Dashboard.tsx`, education mapping), but the new validator `isGraduationComplete` only accepts `MM/YYYY`. So a fully filled education section now fails validation, the Education check goes false, the completion percentage drops, and the sidebar gating locks every step after Education.

## Fix

1. Add one shared normalizer in `src/lib/validation/stepValidation.ts` (exported, reused everywhere):
   - `"2021-05-20"` / `"2021-05"` -> `"05/2021"`
   - `"05/2021"` -> unchanged
   - `"2021"` -> year-only, still treated as incomplete
   - blank / unparseable -> `""`
2. Normalize on load: `Dashboard.tsx` maps `graduation_date` through the normalizer before setting education state, so both the editor dropdowns and validation see `MM/YYYY`.
3. Validation accepts a normalizable value: `isGraduationComplete` normalizes first, then checks `MM/YYYY`. Same for `educationSchema` in `wizardSchemas.ts`, so legacy ISO values from the API never block Next or Save.
4. `EducationStep.splitGraduation` already handles ISO — keep it, but route it through the same helper so there is a single source of truth.
5. Preview display: the Graduation Date field renders a readable `May 2021` instead of the raw stored string.
6. Outgoing payload stays as today (`MM/YYYY` on `PUT /education`), so nothing changes for the backend.

## Verification

- Run the education/dashboard checks against the sample payload: Education, Professional Background, Value Proposition, Work Setup and Compliance all count as complete and the percentage reads 100%.
- Add unit tests for the normalizer (ISO, `YYYY-MM`, `MM/YYYY`, year-only, blank, junk) plus an `isEducationValid` case using the sample payload's education object.
- Typecheck + existing test suite, and a browser pass on the dashboard to confirm the percentage, sidebar unlocking and the education editor dropdowns pre-fill correctly.
