# Admin Dashboard: bulk email search

Add a bulk lookup mode alongside the existing single-email search on `/admin`.

## What changes

1. **Mode toggle above the search bar** — "Single" (current behavior, unchanged) and "Bulk".
2. **Bulk input** — a textarea where the admin pastes multiple emails (one per line, or comma/semicolon separated). Input is split, trimmed, deduplicated and lightly validated before sending.
3. **Request** — one call to `/api/v1/app_site/dashboard/bulk-email` with body:
   ```json
   { "emails": ["john@example.com", "jane@example.com"] }
   ```
   Response is read from the same `{ success, data: [ ... ] }` envelope as the single lookup.
4. **Results list** — compact rows showing avatar, name, email, phone and applied date for each returned applicant. Clicking a row opens that applicant in the existing profile card (About / Core Skills / Tools / Experience) with Generate Resume PDF working as today.
5. **Not-found feedback** — emails submitted but missing from the response are listed under the results as "No match" so nothing silently disappears.
6. **States** — loading spinner while fetching, empty state when nothing matched, error toast on failure. A "Back to results" control returns from a profile to the list.

## Technical notes

- `src/lib/apiClient.ts`: add `getApplicantsByEmails(emails: string[])` posting to `/dashboard/bulk-email`, typed as `{ success: boolean; data: AdminApplicantRecord[] }`; reuse the existing `AdminApplicantRecord` type.
- `src/pages/AdminDashboard.tsx`: add `mode`, `bulkInput`, `results`, `missingEmails` state; reuse the current record-to-view mapper (skills / tools / workexperience JSON parsing) for each result so display logic stays single-sourced. The profile card component stays as-is and simply renders whichever applicant is selected.
- No changes to resume PDF generation beyond it reading the selected applicant.
