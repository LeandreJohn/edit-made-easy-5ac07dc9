# Admin Resume PDF: name, toggles, location, experience details

Changes are limited to the Resume tab of `/admin` and the generated PDF.

## What changes

1. **Remove the last name from the resume** — the page-1 header, the continuation header on the left strip of following pages, and the downloaded filename use the first name only.
2. **Value Proposition toggle** — a checkbox in the Resume tab controls the "ABOUT ME" block. Checked (default) = included in the PDF; unchecked = the block and its divider are skipped and the layout closes the gap.
3. **Per-work-experience toggles** — each work experience gets its own checkbox, styled like the existing skill/tool toggles (checked = included, unchecked = dimmed and excluded). If every experience is unchecked, the EXPERIENCE heading and its divider are omitted.
4. **City and country under the profile picture** — the left panel already prints a location line; it will read the applicant's `city` and `country` fields directly (city in caps, country underneath) instead of splitting a combined string, so it still shows when only one of the two is present.
5. **Work experience displays properly** — each included entry prints job title, employer and location, the date range (start – end, or "Present" when currently working), the responsibilities as bullets, and a "Tools & Platforms" line when present. Missing pieces are skipped without leaving stray dashes, and blank-titled records are not rendered as empty blocks.

## Technical notes

- `src/pages/AdminDashboard.tsx` only.
- `ApplicantState` gains `includeAbout: boolean` and `enabledExperiences: Record<string, boolean>` (keyed by experience id); both are initialised to include-everything in `selectApplicant`, alongside the existing `enabledSkills` / `enabledTools`.
- Resume tab: new "Include in resume" controls — one checkbox row for Value Proposition, one list of checkbox rows for experiences (title + employer + date range as the label), reusing the current toggle-chip styling.
- `buildResumePdf`: header/continuation text drops `lastName`; the About section, its divider, the EXPERIENCE heading and its divider become conditional; the experience loop filters on `enabledExperiences` and renders the employer/location/date/tools lines through the existing `ensureSpace` pagination.
- `drawLeftPanelHeader` reads `applicant.personal.city` / `applicant.personal.country`.
- No API or data-mapping changes.
