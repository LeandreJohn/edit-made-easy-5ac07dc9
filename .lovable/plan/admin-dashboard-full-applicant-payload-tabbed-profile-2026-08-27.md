# Admin Dashboard: full applicant payload + tabbed profile

The single-search and bulk-search endpoints now return the complete applicant record (personal info, education, professional background, work experience, tools, skills, portfolio, certifications, work setup, compliance, values/DISC). The admin profile view is rebuilt around that shape and split into two tabs.

## What changes

1. **New response mapping** — the record is nested now (`personal_info`, `education`, `professional_background`, `work_experience`, `tools`, `skills.items`, `skills.value_proposition`, `portfolio`, `certifications`, `work_setup`, `compliance`, `values`). Name is composed from `first_name` / `middle_name` / `last_name` / `suffix`; email, phone, `date_applied`, `last_update_changes`, `can_do_assessment` and `tag[]` come from the top level. Fields that can be a JSON string (e.g. `Social_Link`, `compliance.COE`, assessment scores) are defensively parsed; missing/null sections render nothing rather than breaking.

2. **Two tabs per profile**
   - **Applicant Profile** (default) — the full read-only record.
   - **Resume** — the existing resume builder: skill/tool include toggles and Generate Resume PDF, unchanged behavior, just moved under this tab.

3. **Applicant Profile tab sections** (collapsible cards, consistent with current styling)
   - Header: avatar, full name, email, phone, date applied, last updated, tags, assessment eligibility.
   - Assessments: Values score grid + DISC (authentic / modified / team plotting) + report links.
   - Personal Info: address parts, nationality, languages, date of birth, referred by, social links.
   - Education, Professional Background (industry, preferred roles, availability, hours).
   - Work Experience (title, employer, location, dates, Present when current, responsibilities, tools).
   - Skills grouped by category with star ratings; Tools with proficiency.
   - Portfolio (link + files), Certifications (title, org, dates, credential ID, certificate file).
   - Work Setup (devices, webcam/headset, ISPs, speedtest links, detected specs, spec screenshots).
   - Compliance (background check, valid ID, NBI + validity, Police + validity, COE).

4. **Links and files**
   - Every URL (speedtest links, social links, report PDFs, portfolio link) renders as an anchor opening in a new tab.
   - Every uploaded file (profile picture, portfolio files, certificates, device screenshots, IDs, clearances, COE) renders through the existing `FilePreviewLink` / `FilePreviewModal` so images and PDFs preview in-app, with an "open in new tab" control already built in.

5. **Bulk list** stays as-is (avatar, name, email, phone, applied date, click to open the profile, "No match" list), fed from the new mapping. Back to results still returns to the list.

## Technical notes

- `src/lib/apiClient.ts`: replace the flat `AdminApplicantRecord` with the nested shape above (all sections optional, `[k: string]: unknown` kept). Endpoints unchanged: `GET /dashboard/email/{email}` and `POST /dashboard/bulk-email`.
- `src/pages/AdminDashboard.tsx`: rewrite `mapRecord` to build a richer `AdminApplicant` object; add `profileTab` state (`'profile' | 'resume'`); keep `parseList` / `parseJsonObject` helpers, resume PDF generation and photo-to-dataURL loading untouched apart from reading the new fields.
- Reuse `formatDateDenver` for all dates (including the epoch-millis `date_of_birth`) and `FilePreviewLink` for file rendering — no new dependencies.
