# Hide Manage Documents + dynamic /head-hunting/:role

## 1. Hide the Manage Documents link

- On the dashboard and attendance pages, the "Manage Documents" link under the Documents card is hidden. The Documents count stays visible.
- The modal component and its save logic stay in the codebase (unused for now), so it can be re-enabled later by restoring the link.
- The Help Center text that mentions "Manage Documents" is reworded so it doesn't point to a link the user can't see.

## 2. `/head-hunting/:role` dynamic entry URL

- New dynamic entry `/head-hunting/<role>` works like `/source/:name` and `/career-sourcing/:hearfrom`.
- Plain `/head-hunting` keeps working exactly as today (head-hunting flag, no role).
- `?ref=` continues to be captured and prefilled into the read-only Referred By field.
- Signup and every other API payload from that session carries:
  - `headhunting: true`
  - `role: "<value from the URL>"`
- The role persists for the whole session (survives reload and moving into the dashboard/attendance), so the Apply/Reapply submit from the dashboard also sends `headhunting: true` and `role: <value>` alongside `dashboard: true`.
- Signing out of the dashboard/attendance returns the applicant to `/head-hunting/<role>` (with `?ref=` when present), matching the other entry URLs.

## Technical details

- `src/pages/Dashboard.tsx`: remove the "Manage Documents" button from the Documents stat card; keep `ManageDocumentsModal` mounted/imported (state remains, just no trigger) so restoring is a one-line change.
- `src/components/common/HelpCenterModal.tsx`: adjust the copy referencing Manage Documents.
- `src/lib/headhunting.ts`: add `role` to `AcquisitionState` with `setRole` / `getRole`; include it in `EMPTY`; `getEntryPath()` returns `/head-hunting/<role>` when a role is set.
- `src/lib/apiClient.ts`: in the `request()` flag injector, add `getRole()` to the trigger condition and emit `role: <value>` (with `headhunting: true`) when set.
- `src/pages/HeadHunting.tsx`: read an optional `role` route param via `useParams`, call `setHeadhunting(true)` plus `setRole(role ?? '')`.
- `src/routes/head-hunting.$role.tsx` (new): `createFileRoute("/head-hunting/$role")` rendering the same page; `src/routeTree.gen.ts` updated accordingly.
- `src/App.tsx`: add `<Route path="/head-hunting/:role" element={<HeadHunting />} />` next to the existing head-hunting route.
