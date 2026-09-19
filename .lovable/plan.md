# Form fixes, pay range field, and dashboard polish

## 1. Wrong fields flagged as required

Confirmed cause: when Save fails, the dashboard picks the *first empty input it finds in the page*, regardless of whether that field is actually required. That is why Middle Name, Suffix and the country-code search box light up red, and why it jumps straight to Street Address past fields that are required but filled differently (dropdowns, pickers).

Fix:
- Tag each required control with a field name (`data-field="firstName"` etc.) in Personal Info, Education, and Professional Background.
- Replace the "first empty input" guess with a real list of missing required fields produced by the existing validators, then highlight **every** missing one and scroll to the first.
- City / Municipality and Barangay are only added to that required list when the country is Philippines.
- Optional fields (Middle Name, Suffix, country code search, Referred By) are never highlighted.
- The same highlighting runs on every failed save, so filling Street Address and saving again still flags whatever else is missing.

## 2. Tools & Platforms and Skills cannot be saved when answering "No"

Confirmed cause: the dashboard's Save check for those two sections still demands at least one selected item, ignoring the "No" answer.

Fix: treat a "No" answer as a valid, saveable state for Tools, Skills, Portfolio, Certifications and Work Experience, and send the empty selection to the server.

## 3. Education: High School Graduate does not save

Confirmed cause: the degree field is hidden for High School Graduate, so an empty degree is sent and the save is rejected.

Fix: send `degree: "N/A"` when the highest level is High School Graduate (wizard and dashboard both use the same sender).

## 4. Document uploads failing on small files

The upload path was already slimmed down earlier; remaining failures need a reproduction. Plan:
- Log the exact server response (status + body) on upload failure so the cause is visible instead of a bare toast.
- Retry once automatically on a transient failure, and keep the selected files so the applicant can retry without re-picking.
- Show file name and size in the error message.

If a specific failing file/account can be shared, that will pin down whether it's file type, name characters, or a server-side issue.

## 5. Dashboard polish

- Hide the "Reapply in N days" countdown (both places it appears); the button simply isn't shown until eligible.
- Move the Assessment dialog's Next/Submit buttons to the top of the dialog, matching the wizard, and remove the bottom row.

## 6. New field: Current Pay Range (Professional Background)

Matches the attached reference: a labelled slider with an info icon, the selected range shown in a pill above the handle, and the low/high endpoints under the track.

Steps (slider positions, left to right):
Below $400 · $400–$599 · $600–$799 · $800–$999 · $1,000–$1,199 · $1,200–$1,399 · $1,400–$1,599 · $1,600–$1,799 · $1,800–$1,999 · $2,000–$2,499 · $2,500–$2,999 · $3,000–$3,499 · $3,500–$3,999 · $4,000 and above

Under the slider:
- Disclaimer text: "We may ask for proof of prior compensation to validate states current earnings."
- A checkbox "Prefer not to disclose". When ticked, the slider is disabled/greyed and the saved value becomes `Prefer not to Disclose`.

Appears in both the wizard step and the dashboard Professional Background section (edit + read-only view), and is included in the professional-background payload as `current_pay_range`.

## Technical notes

- `src/components/steps/PersonalInfoStep.tsx`, `EducationStep.tsx`, `ProfessionalBgStep.tsx`: add `data-field` attributes; new pay-range control.
- `src/pages/Dashboard.tsx`: replace `focusFirstInvalidField` with validator-driven multi-field highlighting; `isDraftSectionValid` accepts skip answers for optional sections; hide `daysLeft` countdown; assessment dialog button placement; pay-range in edit/view.
- `src/lib/validation/stepValidation.ts`: add a `getMissingRequiredFields(section, data)` helper returning field keys, reused by the highlighter.
- `src/lib/apiClient.ts`: `degree: 'N/A'` for High School Graduate; add `current_pay_range` to the professional-background body; richer upload error reporting.
- `src/types/application.ts`: add `currentPayRange` to `ProfessionalBackground`.
