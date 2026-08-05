# Referral capture, dashboard data fixes, phone parsing, and step gating

## 1. Referral (`ref`) on signup

- Signup payload gains an explicit `ref` value taken from the `?ref=` URL parameter (the existing `referred_by` key stays for backwards compatibility).
- The captured referral code is stored for the session so later steps can read it.

## 2. "Referred By" field in Personal Information

- New read-only **Referred By** field in the wizard's Personal Info step, pre-filled from the captured `?ref=` value (hidden when there is no referral).
- Same field appears in the dashboard's Personal Information preview, populated from `personal_info["Referred By"]`.
- The field stays disabled in edit mode — it can never be changed by the applicant, and its value is passed through unchanged on save.

## 3. Dashboard data mapping against the new payload

Rework the dashboard loader so every field in the new payload renders in preview:

- Personal info: `Referred By`, `Social_Link` (JSON string like `{"Facebook":"..."}` — parse into the social links list), `address` fallback for non-PH applicants.
- Work experience: `title`, `employer`, `startDate`/`endDate` (`YYYY-MM`), `currentlyWorking`, `responsibilities`.
- Certifications: show `certificate_url` as a viewable/downloadable file link, plus `expirationDate` and `credentialId`.
- Work setup: read `primary_device_spec_files` and `secondary_device_spec_files` (current code reads the wrong keys, so device screenshots do not display), plus detected CPU/RAM/storage and both ISP links.
- Compliance: `COE` may be a plain string rather than a file list — render it as text when it is not a URL; keep `valid_id_files`, `nbi_clearance_files`, `police_clearance_files` and validity dates.
- Skills: use `items` when `structured` is empty; group by category in the preview.
- Top level: `profile_picture`, `date_applied`, `last_update_changes`, `can_do_assessment`, `tag[]`, `last_stage_date_changed`.

## 4. Reapply / Apply Now button

- Eligibility is computed from `last_stage_date_changed` instead of `date_applied`:
  - null/blank → eligible, button reads **Apply Now**.
  - 60+ days since that date → eligible, button reads **Reapply**.
  - otherwise → shows the remaining-days countdown, disabled.
- Existing section-completeness requirement stays in place.

## 5. Phone number parsing fix

The current splitter grabs `+` plus up to 4 digits, so `+639458707854` becomes `+6394` / `58707854`.

- Replace it with a dial-code match against the country list, preferring the longest valid dial code (and the applicant's selected country when it matches), so `+639458707854` → `+63` / `9458707854`.
- Works for any country (`+1`, `+44`, `+971`, …); unknown prefixes fall back to the shortest sensible split rather than a fixed 4 digits.
- Recomposition on save keeps the existing `+63 9458707854` string format so the backend payload is unchanged.

## 6. Dashboard sidebar step gating

- Sidebar sections become sequentially locked like the wizard: **Personal Info → Education → Professional Background → Value Proposition → Compliance**. Each is disabled until the previous one is complete, with a tooltip explaining why.
- The remaining sections (Tools, Skills, Work Experience, Certifications, Portfolio, Work Setup) stay freely accessible.

## Technical notes

- Files touched: `src/lib/apiClient.ts` (signup `ref`), `src/components/steps/WelcomeStep.tsx` (pass `ref`), `src/components/steps/PersonalInfoStep.tsx` (+ `src/types/application.ts` for a `referredBy` field), `src/components/common/PhoneInput.tsx` (dial-code splitting), `src/pages/Dashboard.tsx` (payload mapping, reapply logic, sidebar gating, disabled Referred By).
- Section-completeness reuses the existing `src/lib/validation/stepValidation.ts` helpers already used by the dashboard.
