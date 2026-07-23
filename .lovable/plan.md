## 1. Welcome page — background + heading position (`src/components/steps/WelcomeStep.tsx`)

- Change the left panel background from `bg-cover bg-center` to `bg-cover bg-no-repeat` with `background-size: 110% auto` (or `background-size: cover; background-position: center`) so the globe artwork fully bleeds and the powder-blue → white gradient border of the PNG stops showing.
- Add a subtle `scale-105` on the background layer as a safety net for future viewport sizes.
- Move the "Your gateway to world-class remote career opportunities" heading from bottom-left to vertically centered: change the outer flex from `justify-end` to `justify-center`, keep the text left-aligned.

## 2. Dashboard + Attendance shared header/banner (`src/pages/Dashboard.tsx`)

### Profile avatar

- Remove the camera badge (`<span>` wrapping the `Camera` icon at line ~735). Keep the circular avatar with photo/placeholder only.
- Drop the now-unused `Camera` import.

### Banner background stretch

- Same fix as the welcome bg: swap `bg-cover bg-right` for a background style with `background-size: cover; background-position: right center` and scale up slightly so the left/right edges of `dashboard-banner.png` no longer show. Keep the primary-color gradient overlay.

## 3. Manage Documents modal (`src/components/common/ManageDocumentsModal.tsx`)

Restructure so every uploader is on its own row (no two-column grids) and existing uploads render inline with `FilePreviewLink` above the dropzone.

### Portfolio tab

- Remove the Portfolio Link field entirely (input + label + `LinkIcon`).
- Keep only the file dropzone + existing-files list.
- Save call: continue to use `updatePortfolioFiles(contactId, pFiles)` — drop the `pLink` argument from both the modal and the `apiClient.updatePortfolioFiles` signature so payload matches the wizard's Portfolio step (files only).

### Work Setup tab

- Remove Primary ISP Speedtest + Secondary ISP Speedtest dropzones and their state (`wsPrimarySpeed`, `wsSecondarySpeed`).
- Keep Primary Device Screenshots and Secondary Device Screenshots, each on its own row with existing screenshots rendered as `FilePreviewLink` chips above the dropzone.
- `updateWorkSetupFiles` payload trimmed to `{ primaryDeviceScreenshots, secondaryDeviceScreenshots }`.

### Compliance tab

- Convert the 2-column grid to a single stacked column.
- Add Valid Until date input under NBI Clearance (`nbiValidity`) and Police Clearance (`policeValidity`) — same MDY picker pattern used in `ComplianceStep.tsx`.
- Each existing file (Valid ID, NBI, Police, COE) shown as `FilePreviewLink` above its dropzone when present.
- Save call: extend `updateComplianceFiles` payload with `nbi_validity` and `police_validity` (already accepted by `updateCompliance` backend endpoint — mirror the field names).

### Payload parity

- Update `src/lib/apiClient.ts` helpers so each Manage Documents save posts the same shape as the corresponding wizard step (just omitting fields not exposed in the modal). No new endpoints.

### Existing-data wiring

- Extend the `existing` prop passed from `Dashboard.tsx` with `nbiValidity` and `policeValidity` (read from the profile payload's `compliance.nbi_validity` / `compliance.police_validity`), and pre-fill the new date inputs.

## 4. Wizard sidebar icons (`src/components/wizard/WizardSidebar.tsx` + `src/types/application.ts`)

- Add an `icon` field to each entry in `STEPS` using consistent `lucide-react` icons: `User` (Personal Info), `GraduationCap` (Education), `Briefcase` (Professional Bg), `History` (Work Experience), `Wrench` (Tools), `Sparkles` (Skills), `FolderOpen` (Portfolio), `Award` (Certifications), `MessageSquareQuote` (Value Prop), `Monitor` (Work Setup), `ShieldCheck` (Compliance), `ClipboardCheck` (Assessment), `CheckCircle2` (Completion). Icons stay the same size (`w-4 h-4`) and render to the left of the step label in both mobile and desktop layouts.
- Uniform styling: icons inherit text color from the active/complete/inactive state classes already applied to the label.
- The Icons also reflect in the dsahboard and in the attendance dashboard if the step is done in the wizard make sure the check still shows replacing the icon

## 5. Next Step card icon color (`src/pages/Dashboard.tsx`)

- Change the Next Step card's icon container from `bg-accent/10` + `text-accent-foreground` to a purple palette: `bg-purple-500/10` + `text-purple-600` (Calendar icon). Keeps hierarchy consistent with the other stat cards.

## 6. Help Center / FAQ modal (`src/components/common/HelpCenterModal.tsx`)

Rewrite the copy in a cleaner, more professional tone and split it into two contexts so the same modal serves both `/dashboard` and `/attendance`:

- **Getting started** — clarify auto-save only applies to the **wizard**; dashboard/attendance edits require pressing **Save** on each section.
- **Editing your profile** — unchanged intent, tightened wording.
- **Managing documents** — unchanged intent, tightened wording.
- **Reapplying (Dashboard only)** — unchanged intent.
- **Assessments** — unchanged intent.
- **Attendance dashboard** (new section) — explains:
  - Log in at the start of your shift and log out at the end of the day.
  - The three login-status options:
    1. **Available for training only** — you're on shift for internal training sessions.
    2. **Available for client matching only** — you're ready to be paired with a client but not attending training.
    3. **Available for training and client matching** — you're open to both simultaneously.
  - Pick the status that reflects today's availability so the recruitment team can match you correctly.

Pass an optional `variant?: 'dashboard' | 'attendance'` prop from the two callers to reorder/emphasize sections; both include the two external link buttons (Cyberbacker Home, Application FAQs).

## 7. Profile data mapping — dashboard + attendance (`src/pages/Dashboard.tsx`, `src/lib/apiClient.ts`)

Align the profile loader with the sample payload structure:

- **Personal info**: read `personal_info.middle_name`, `date_of_birth`, `country`, `Referred By` → surface in the Personal Info edit form (already has fields; wire the reads).
- **Personal info location**: prefer the composed `personal_info.address` if `street`/`barangay`/`city` are absent.
- **Profile picture**: use top-level `profile_picture` as the fallback for `photoPreview` when `personal_info.photo_url` is empty.
- **Date applied / Last updated**: use top-level `date_applied` for Date Applied and `last_update_changes` for the Last Updated card (parse ISO timestamp).
- **Work experience**: map `company` → `employer`, `position` → `title`, `employment_type` → new dashboard column (currently ignored), `description` → `responsibilities`, `start_date`/`end_date`/`currently_working` → existing fields.
- **Tools**: map array of `{category, name, experience}` → `{tool: name, proficiency: experience}`; keep category for display grouping.
- **Skills**: prefer `skills.structured[]` (`{skill, level, years}`) when present, fall back to `skills.items[]`. Populate `valueProposition` from `skills.value_proposition`.
- **Portfolio**: files already mapped; ensure link uses `portfolio.link`.
- **Certifications**: map `{title, issuer, date}` → `{title, organization: issuer, dateCompleted: date}`.
- **Work setup**: additionally read `device_spec[]`, `device_spec_files[]`, `detected_cpu`, `detected_ram`, `detected_storage`, `detection_consent`, `detection_source` and surface uploaded spec files as `FilePreviewLink`s in the Work Setup section.
- **Compliance**: read arrays `valid_id_files[]`, `nbi_clearance_files[]`, `police_clearance_files[]`, `COE[]` (list every file, not just the first) plus `nbi_validity`, `police_validity`, `valid_id` (label). Pass these to the Manage Documents modal via the extended `existing` prop.

All mapping happens in the existing `useEffect` loader; no new endpoints.

## Technical notes

- No backend changes; existing endpoints (`/portfolio`, `/work-setup`, `/compliance`, `update-portfolio-file`, `update-work-setup-files`, `update-compliance-files`) already accept the trimmed payloads.
- All new icons imported from `lucide-react`.
- No behavior change to the wizard's Portfolio step (link stays in the wizard, removed only from Manage Documents modal per request).
- Attendance page continues to hide the Profile Completion block, Next Step card, and Reapply button (unchanged from prior plan).