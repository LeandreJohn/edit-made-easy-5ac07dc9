# Apply/Reapply payload flag + remove Referral Link field

## 1. Add `dashboard = true` to the apply/reapply submit

When an applicant submits Apply Now / Reapply from the dashboard, the request body will carry `dashboard: true` alongside the existing fields, so the backend can tell the submission came from the dashboard rather than the wizard.

Technical: in `src/lib/apiClient.ts`, `reapply()` body becomes `{ contact_id, referrer, date_applied, dashboard: true }`. Existing acquisition flags (headhunting / source / career_sourcing / hearfrom / ref) injected by the request interceptor stay unchanged.

## 2. Remove the Referral Link field from Personal Info

The "Referral Link" input (shown on head-hunting style entries) is removed from the wizard's Personal Info step. The read-only "Referred By" field stays as is.

Technical:
- `src/components/steps/PersonalInfoStep.tsx`: delete the `isHeadhuntingStyle()` Referral Link block and its now-unused import if nothing else uses it.
- Keep `referralLink` in the type/payload plumbing (sent as empty string) so no other code paths break.
