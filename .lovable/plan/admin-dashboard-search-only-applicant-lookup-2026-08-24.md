# Admin Dashboard: search-only applicant lookup

Rework `/admin` into a single, clean search-driven applicant profile view matching the reference layout.

## What changes

1. **Hide the Settings tab** — the Applicants/Settings tab switcher is removed from view; `SettingsPanel` stays in the codebase for later use.
2. **Hide the applicant list** — the left sidebar list, pagination (Prev/Next), refresh button and the `getApplicants` page-fetch loop are removed from the UI. No list loads on page open.
3. **Search bar becomes the primary entry point** — full-width search box with a Search button, centered above the result card. Pressing Enter also searches.
4. **Search hits `/api/v1/app_site/dashboard/email/{email}`** — the current call uses `/dashboard/{email}`; it is corrected to `/dashboard/email/{email}` and the response is read from the documented shape (`{ success, data: [ ... ] }`, first record).
5. **Map all returned fields correctly** so everything displays:
   - `name`, `email`, `phone`, `date_added` (shown in the header block, Denver time for the date)
   - `profile_picture` rendered as the avatar
   - `values_proposition` -> About section
   - `skills` (JSON string) -> parsed into skill / category / proficiency with star ratings, grouped by category
   - `tools` (JSON string) -> parsed into tool + proficiency, shown with proficiency instead of bare names
   - `workexperience` (JSON string) -> parsed into title, employer, location, start/end date (Present when `currentlyWorking`), responsibilities, tools/platforms
   - All three fields are defensively parsed (already-array or JSON-string, malformed -> empty).
6. **Remove Upload Photo and View Assessment buttons.** Generate Resume PDF stays and keeps working off the searched applicant.
7. **Polish to match the reference** — collapsible ABOUT / CORE SKILLS / TOOLS / EXPERIENCE sections with chevrons, card container, empty and loading states ("Search an applicant by email to begin", spinner while searching, "No applicant found for that email"), consistent spacing and typography using existing design tokens.

## Technical notes

- `src/lib/apiClient.ts`: fix `getDashboardByEmail` path to `/dashboard/email/{email}` and type it against the `{ success, data: [...] }` envelope with the fields above.
- `src/pages/AdminDashboard.tsx`: drop list/pagination state (`applicants`, `page`, `hasMore`, caches, `MOCK_APPLICANTS` seeding, `getApplicants`), keep a single `applicant` result object; drop `photoDataUrl`/upload handler; keep skill/tool include-exclude toggles feeding the PDF generator.
- Resume PDF generation code is untouched apart from reading the new single-applicant object and using `profile_picture` as the photo source.
