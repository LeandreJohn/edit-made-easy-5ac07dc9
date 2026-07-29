## 1. Dashboard / Attendance data mapping (`src/lib/apiClient.ts`, `src/pages/Dashboard.tsx`)

Rewrite `DashboardResponse` to match the real payload and fix every mis-mapped read.

Current bugs found in the loader:

- Personal info ignores `middle_name`, `date_of_birth`, `country`, `address`, `Referred By`, `Social_Link`.
- Profile photo reads `personal_info.photo_url` (does not exist) instead of top-level `profile_picture`.
- Work setup reads `noise_cancelling_headset` / `hd_webcam` / `primary_internet` / `secondary_internet`; payload uses `has_noise_cancelling_headset`, `has_hd_webcam`, `primary_internet_provider`, `secondary_internet_provider`, plus `*_sharable_link`, `detected_cpu/ram/storage`, `detection_consent`, `detection_source`, `device_spec[]`, `device_spec_files[]`.
- Work experience expects `employer`; payload has `company`/`position`/`employment_type`/`description`, and `current` (not `currently_working`).
- Compliance reads `valid_id_url` / `nbi_clearance_url` etc.; payload has `valid_id_files[]`, `nbi_clearance_files[]`, `police_clearance_files[]`, `COE`.
- Skills fall back only to `items`; also read `structured[]` when non-empty.
- `last_update_changes` is not read at all (Last Updated card).

Fixes: map all of the above, normalise ISO dates (`YYYY-MM-DD`) to the MM/DD/YYYY the UI uses, list every file in an array as a `FilePreviewLink`, and pass the extended data into `ManageDocumentsModal`.

## 2. Profile completion persistence

Completion is computed from the in-memory form state. Recompute it from the freshly-loaded backend payload (same field list: Personal Info, Education, Professional Background, Value Proposition, Work Setup required fields), and recompute after each successful save by re-fetching the dashboard rather than trusting local state, so a refresh shows the identical percentage.

## 3. New Assessment card (Dashboard only)

Inserted between Next Step and Last Updated when `can_do_assessment` is `"Yes"` or `null` **and** the Reapply button is hidden.

- Title "Take the Assessment", "Start Now →" link.
- Opens a non-dismissible modal (no overlay/Esc close) with an X button; runs the same IMX Values → DISC flow as the wizard (new code generated on open, Next during Values, Submit on DISC).
- Closes automatically once both results verify.
- If `can_do_assessment === "No"`, the card renders with a disabled Start Now.

## 4. Notification card (before Documents card)

Driven by the `tag[]` array, mapped through a new `src/data/tagNotifications.ts` built from the uploaded sheet (NR - NBI Processing, NR - No NBI, NR - Police Processing, NR - No Police, NR - Blurred Document, NR - Cropped Document, NR - Poor Upload Quality, NR - Invalid ID, NR - Primary Device Specs Missing, NR - Primary Speedtest Invalid). Unmapped tags (e.g. `profile-builder`) are ignored; card is hidden when no tag matches. "Invalid ID" message renders its "click here" as a link to the accepted-ID list.

## 5. Personal Information — Social Media Profiles

New section in `PersonalInfoStep.tsx` and the Dashboard Personal Info editor: repeatable rows of `[platform select] [url input] [remove]`. Platforms: Facebook, LinkedIn, Instagram, X (Twitter), TikTok, YouTube, Portfolio Website, Other Website. Zod URL validation, blank allowed, inline messages. Serialised to a JSON string `{"Facebook":"...","Instagram":"..."}` sent as `social_links` on `PUT /personal-info`; parsed back from `personal_info.Social_Link` (tolerating plain-string legacy values) on Dashboard/Attendance. make sure that this new field is not a requried field

## 6. International address

Country dropdown defaults to Philippines. PH → House/Street, Barangay, City/Province (required). Non-PH → State/Region, City, Postal Code (required), composed into the single `address` field the backend already stores as "Alternate Address". Validation schemas in `wizardSchemas.ts` updated for both branches, and the same rules reused by the dashboard editor.

## 7. Education

- Graduation date becomes Month + Year only (no day); year-only allowed.
- Optional when highest level is Some College / Undergraduate.
- Degree/Field of Study gains an "Other" option that reveals a required "Please specify your Degree or Field of Study" text field.

## 8. Professional Background

- Industry list gains "Others" → reveals required "Specify Industry".
- Role list extended locally in `industryRoleMatrix.ts` with the missing backend roles (Property Management, AI Faci Support, and any other gaps), with an "unavailable" flag rendering greyed-out non-selectable entries rather than hiding them.

## 9. Skills / Certifications / Resume

- Rename `Basic Video Editing` → `Video Editing` in `SKILL_CATEGORIES`.
- Certifications uploader accepts PDF/JPG/JPEG/PNG with accepted types shown beneath.
- Resume uploader: PDF/DOC/DOCX, accepted types + max size shown, posts to the existing resume-parse endpoint and auto-fills Name, Contact, Education, Employment, Skills. On failure shows "We couldn't automatically extract your information. Please complete the fields manually." and never blocks submission.

## 10. Work Setup equipment

Headset and Webcam become Yes/No radio groups (no free text), stored as booleans and sent as `"Yes"`/`"No"` exactly as the backend expects.

## 11. Reapply button

Disabled (not hidden) until Personal Info, Education, Professional Background, Value Proposition and required Work Setup fields are complete, with tooltip "Complete all required sections before reapplying."

## 12. Assessment iframe scrolling

The IMX iframe is fixed-height with internal scroll, which hides its own Next button. Switch to an auto-growing iframe: listen for `postMessage` height events and fall back to a tall min-height (e.g. `min(1600px, content)`) with `scrolling="no"`, so the page scrolls instead of the frame. Applied in both `ValuesAssessmentStep.tsx` and `AssessmentPage.tsx`.

## 13. General UX

Saving spinners on every Save button, a "Changes Saved" toast/inline confirmation, tightened validation copy, draft restore on refresh, and a mobile pass on the new cards and social-links rows.  
  
14. Create a copy of assessment URL the login there is POST /ph-assessment if it returned success true have the applicant take the assessment as normal then if it's status_code 403 or 404 popup a mesage stating 

```python
You are not eligible to access the Assessment
```

## Technical notes

- No backend changes. `social_links` is sent as a JSON string on the existing `PUT /personal-info`.
- Resume parsing will be wired to the existing endpoint — confirm the exact path/response shape if it is not `POST /parse-resume`, and I will adjust the one call site.
- Date normalisation helper added to `src/lib/date.ts` for ISO ⇄ MDY conversion used across the loader.