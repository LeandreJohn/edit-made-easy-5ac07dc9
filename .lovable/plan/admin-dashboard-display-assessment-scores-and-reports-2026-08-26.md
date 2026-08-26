# Admin Dashboard: display assessment scores and reports

Parse and render the new `values_assessment_scores`, `values_assessment_result`, `disc_assessment_scores`, and `disc_assessment_result` fields returned by both the single-email and bulk-email admin endpoints.

## What changes

1. **Type update** — extend `AdminApplicantRecord` in `src/lib/apiClient.ts` with the four new assessment fields:
   - `values_assessment_scores?: string | Record<string, unknown>`
   - `values_assessment_result?: string`
   - `disc_assessment_scores?: string | Record<string, unknown>`
   - `disc_assessment_result?: string`

2. **Parsing** — in `src/pages/AdminDashboard.tsx`, add defensive JSON parsing for the two score fields (accept either a JSON string or an already-parsed object). Store the parsed objects and the report URLs on the mapped applicant state.

3. **Header display** — below the existing email / phone / applied date row, add a compact "Assessments" block:
   - Show each assessment as a small card/row with a label (Values Assessment, DISC Assessment).
   - Render the parsed scores in a readable layout (e.g. a short grid of key/value pairs, or a clean list if the object is flat). Keep it compact so the header does not dominate the page.
   - Render the report URL as a clickable link styled with the primary color and an external-link icon; `target="_blank"` and `rel="noopener noreferrer"` so it opens in a new tab.
   - If a score field or report URL is missing, show a subtle "No report available" / "No scores available" placeholder instead of hiding the section, so the UI is consistent.

4. **Visual polish** — use existing design tokens and spacing. Place the assessment block inside the existing header card, separated by a light top border or extra spacing so it feels grouped with the applicant identity but distinct from the collapsible sections below.

## Technical notes

- `src/lib/apiClient.ts`: only add the four optional fields to `AdminApplicantRecord`.
- `src/pages/AdminDashboard.tsx`: add parsing helpers next to `parseList`, extend `mapRecord`, and add the assessment JSX inside the profile header.
- No changes to search behavior, bulk behavior, resume PDF generation, or the admin settings panel.
