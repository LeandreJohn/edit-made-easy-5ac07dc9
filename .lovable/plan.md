# Plan: Welcome BG + Dashboard/Attendance Redesign

## 1. Assets (bundled real PNGs, offline-safe)

Copy the two uploaded PNGs into `src/assets/` so they're bundled by Vite (no `.asset.json`, works offline):
- `src/assets/welcome-bg.png` ← `Welcome_BG.png`
- `src/assets/dashboard-banner.png` ← `Dashboard_attendance_banner.png`

## 2. Welcome card (`WelcomeStep.tsx`)

Replace the current left-side visual with the new globe artwork:
- Set the left panel background to `url(welcome-bg.png)` with `bg-cover bg-center` on a dark navy fallback.
- Keep the white heading "Your gateway to world-class remote career opportunities" overlaid bottom-left, matching the reference.
- Right side (logo, headings, email/password, Create My Profile / Forgot / Sign In) unchanged.

## 3. Dashboard & Attendance shared shell (`Dashboard.tsx`)

### Header
- Left: existing `cyberbacker-logo` (Profile Builder lockup).
- Right: replace the standalone "Sign out" pill with **user chip** — avatar (photo if uploaded, else generic icon) + full name + chevron. Clicking opens a dropdown:
  - `User` icon — My Profile (scrolls to Personal Info)
  - `Lock` icon — **Change Password** (opens modal)
  - `HelpCircle` icon — **Help Center** (opens FAQ modal)
  - separator
  - `LogOut` icon (red) — Sign out
- Keep the **Reapply** button to the left of the chip on `/dashboard` only, gated (see §7).

### Welcome banner
- Full-width blue card using `dashboard-banner.png` as the right-anchored background image (clipboard + plant art baked into the PNG).
- Left content: avatar circle (photo or placeholder with a small camera badge), "Welcome back," then `{firstName} {lastName}`, then the quote *"You're doing great! Complete your profile to increase your chances of getting matched with the right opportunity."*
- **Dashboard only:** right side shows Profile Completion — big `NN%`, progress bar, "Great progress! Keep it up." caption. **No** "Continue Profile" button.
- **Attendance:** omit the Profile Completion block entirely; banner shows only the greeting/quote.

### Profile Completion calculation (dashboard only)
Count filled vs total across these step groups, **excluding Work Experience, Certifications, Portfolio**:
- Personal Info required fields
- Education required fields
- Professional Background required fields
- Tools (≥1 selected)
- Skills (≥1 selected)
- Value Proposition (non-empty)
- Work Setup required fields (device + ISP as per wizard validation)
- Compliance required fields
Percentage = filled / total × 100, rounded. Progress bar uses existing primary color.

### Stat cards row
Remove the **Assessments** card entirely (both pages). Keep:
- **Documents** card — "N Uploaded", link **Manage Documents** → opens modal (see §6).
- **Next Step** card *(dashboard only, removed on attendance)* — see §5.
- **Last Updated** card — timestamp of last profile save.

## 4. FAQ / Help Center modal + "Need Help?" sidebar block

Add a **Need Help?** card under the step sidebar (both pages) with copy from reference and a `Go to Help Center` button that opens the **FAQ modal**:
- Modal contents: brief "How to use the App" walkthrough (steps overview, saving progress, reapply rules, assessment flow).
- Two external link buttons:
  - Cyberbacker Home → `https://cyberbackercareers.com/`
  - Application FAQs → `https://cyberbackercareers.com/faq/`
- Same modal is reused by the header dropdown's **Help Center** item.

## 5. Next Step card (dashboard only)

Compute an ordered list of steps with missing required data (same rules as profile completion, plus Work Experience / Certifications / Portfolio if the user answered "Yes" but left entries blank). Card shows the **first missing step name**; a small list underneath enumerates the rest. **Start Now** navigates the sidebar to the first missing step and scrolls to it.

## 6. Manage Documents modal

Tabbed dialog (Portfolio / Work Setup / Compliance — **no Certifications tab**):
- **Portfolio tab**: portfolio link + files dropzone. Save button → `POST /update-portfolio-file` with `contact_id`.
- **Work Setup tab**: primary + secondary device screenshots, speedtest screenshots, system-spec doc uploads. Save → `POST /update-work-setup-files`.
- **Compliance tab**: Valid ID, NBI, Police, Proof of Separation. Save → `POST /update-compliance-files`.
- Each tab has its own Save button that only submits its tab's payload; existing files are pre-listed with `FilePreviewLink` and can be replaced.

Add three helper functions in `src/lib/apiClient.ts`: `updatePortfolioFiles`, `updateWorkSetupFiles`, `updateComplianceFiles` (multipart POST including `contact_id`).

## 7. Reapply gating

`canReapply` becomes: `daysSince ≥ 60` **AND** `isSubStepValid` passes for Personal Info, Education, Professional Background, Value Proposition, and Work Setup required fields. Button hidden (not just disabled) when the data gate fails; tooltip explains the 60-day cooldown when that's the blocker.

## 8. Change Password modal

New modal reachable from the header dropdown:
- Fields: New Password, Confirm New Password (with show/hide, zod validation: min 8, must match).
- Submit → `POST /change-password` with `{ contact_id, new_password }`. Toast on success, close modal.
- Add `changePassword` helper to `apiClient.ts`.

## 9. Validation parity in Dashboard & Attendance edit forms

Reuse `isSubStepValid` from `src/lib/validation/stepValidation.ts` to gate each step's **Save** button on both `/dashboard` and `/attendance`, mirroring the wizard's Next-button rules (Save disabled until required fields for that step are valid).

## Technical notes
- No backend/schema changes beyond the three new file-update endpoints + `change-password` (frontend calls only; assumes backend exists).
- All new images imported as ES modules from `src/assets/` — no CDN pointer, so they work offline.
- Icons throughout the dropdown use `lucide-react` (`User`, `Lock`, `HelpCircle`, `LogOut`) for visual consistency.
- Attendance page is the same component with `variant="attendance"`; conditionally hide Profile Completion block, Next Step card, and Reapply button when variant is attendance.
