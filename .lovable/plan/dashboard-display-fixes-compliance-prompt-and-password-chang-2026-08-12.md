# Dashboard display fixes, compliance prompt, and password change verification

## 1. Portfolio files show as previewable links
In the dashboard Portfolio section, uploaded files currently render as a plain bullet list of names. Render them the same way as NBI/Police files: clickable preview chips using the existing file preview component, driven by the already-loaded portfolio file URLs. Keep an "No files uploaded" placeholder when empty.

## 2. Trim the compliance summary fields
Remove the "Valid ID Type" and "Proof of Separation / COE" rows from the compliance details grid (the COE is already listed in the file list below, and there is no valid ID type field). The compliance summary keeps: Background Check Authorized, NBI Clearance Valid Until, Police Clearance Valid Until.

## 3. Next Step card when the profile is complete
When there are no incomplete sections: swap the arrow icon for a check icon (green tint), drop the "Next Step" label, and show a completion message instead. When sections remain incomplete, the card stays exactly as it is today.

## 4. Colorblind-friendly Valid ID link
In the Compliance step, replace the bare hyperlinked "Valid ID" wording with explicit link text: "Click on this link to see the list of accepted IDs", and add an underline plus external-link icon so the link is identifiable without relying on color.

## 5. Background check authorization prompt
When saving the Compliance section with the authorization checkbox unticked, show a dialog on the first save attempt:

Title: Background Check Authorization Required

Body: A background check is an important part of our compliance process and helps ensure that profiles are properly verified and ready for potential client placement. You have not yet authorized Cyberbacker to conduct a background check. Please review the authorization checkbox above before saving your compliance information.

The dialog only warns — it does not save. If the user presses Save again while still unticked, the save proceeds normally. The "already warned" flag resets when the user leaves the compliance section or ticks the box.

## 6. ISP sharable links in the work setup view
Add "Primary ISP Speedtest Link" and "Secondary ISP Speedtest Link" to the dashboard work setup summary, rendered as clickable links when present and "Not provided" when empty. The values are already loaded from the payload.

## 7. Change password requires the current password
Add a "Current password" field above the new password fields. On submit, the current password is verified against the account before the change is allowed; only when it matches do the new password and confirmation get submitted. A wrong current password shows an inline error and blocks the change. The new password still requires 8+ characters and must match the confirmation.

## Technical notes

- Files touched: `src/pages/Dashboard.tsx` (portfolio view, `ComplianceView`, `WorkSetupView`, Next Step card, compliance save guard), `src/components/steps/ComplianceStep.tsx` (link text), `src/components/common/ChangePasswordModal.tsx`.
- Portfolio previews reuse `FilePreviewLink` with the existing `portfolioFileUrls` state; no new fetches.
- The authorization prompt uses the existing `ConfirmDialog`/`Dialog` primitives with a local `warnedUnauthorized` ref in the dashboard save handler.
- Current-password verification calls the existing `login(email, currentPassword)` endpoint with the signed-in email from session storage; a rejected response means the password is wrong. No plaintext password is persisted anywhere. If you would rather have a dedicated verify endpoint on the backend, that can replace this call later without UI changes.
