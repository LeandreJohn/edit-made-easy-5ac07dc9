# Admin dashboard DISC parsing + resume location spacing fixes

Small targeted fixes for the admin profile view and the generated resume PDF.

## What changes

1. **DISC assessment card rendering** — `src/pages/AdminDashboard.tsx`
   - The backend DISC score payload is a nested object: `{ "authentic": { "D": "67", ... }, "modified": { "D": "70", ... } }`.
   - Update `AssessmentCard` so it detects this `authentic` / `modified` structure and renders two separate, labeled mini-grids instead of flattening everything into plain key/value pairs.
   - Keep the existing behavior for flat score objects (e.g., Values assessment) so they continue to display as before.
   - Each sub-grid should label the section (Authentic, Modified) and list the dimensions as `D = 67`, `I = 28`, etc.

2. **Resume PDF city/country spacing** — `src/pages/AdminDashboard.tsx`
   - In `drawLeftPanelHeader`, increase the vertical gap between the city line and the country line so the country text no longer overlaps the city text.
   - Keep the existing centered alignment under the profile picture and the current font sizes.

## Out of scope

- No API or data-mapping changes.
- No changes to the Values assessment rendering style unless required to share the improved card logic.
- No changes to resume toggles, experience rendering, or profile sections.

## Files to edit

- `src/pages/AdminDashboard.tsx`
