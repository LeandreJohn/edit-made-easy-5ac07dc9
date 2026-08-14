# Background-check prompt in the wizard + career-sourcing entry route

## 1. Background check prompt in the wizard

Today the "Background Check Authorization Required" dialog only exists in the dashboard's Compliance save. Add the same behavior to the wizard's Compliance step (substep 11):

- Pressing Next while "I authorize Cyberbacker to conduct a background check" is unticked shows the same dialog (same title and wording) and blocks that one attempt.
- Pressing Next a second time while still unticked proceeds normally and saves.
- The "already warned" flag resets if the user ticks the box or leaves the Compliance step.

## 2. Rename `/sourcing/:hearfrom` to `/career-sourcing/:hearfrom`

- New route file for `/career-sourcing/$hearfrom`; the old `/sourcing/$hearfrom` route and page are removed and the generated route tree is regenerated so the URL resolves.
- Verified in the running preview with a real deep link (e.g. `/career-sourcing/facebook?ref=ABC123`) so we confirm it renders the wizard and prefills Referred By, rather than assuming.
- The completion screen's "Got it, thanks!" returns the applicant to `/career-sourcing/<hearfrom>`.

## 3. Correct the flags sent to the backend

Each entry URL sends exactly one acquisition flag set:

| Entry URL | Payload flags |
|---|---|
| `/head-hunting` | `headhunting: true` |
| `/davao-hub` | `davaohub: true` |
| `/source/:name` | `source: true`, `source_name: <name>`, `headhunting: false` |
| `/career-sourcing/:hearfrom` | `career_sourcing: true`, `hearfrom: <value>`, `headhunting: false`, `source: false` |

`ref` / `referred_by` keeps working on every URL, unchanged.

Note: both `/source/:name` and `/career-sourcing/:hearfrom` currently turn on the head-hunting flag mainly so the head-hunting-styled UI (e.g. the extra Personal Info block) stays visible. Removing that flag from the payload must not remove that styling, so the UI gate is separated from the payload flag.

## Technical details

- `src/lib/headhunting.ts`: add a UI-only `HEADHUNTING_UI` flag (`setHeadhuntingUi` / `isHeadhuntingStyle`) separate from the payload flag `HEADHUNTING`. Rename `SOURCING_HEARFROM` accessors stay as `setHearFrom` / `getHearFrom`.
- `src/pages/Source.tsx`: set head-hunting **style** only (`setHeadhuntingUi(true)`), `setSourcing(true)`, `setSourceName(name)` — no payload head-hunting flag.
- `src/pages/CareerSourcing.tsx` (renamed from `Sourcing.tsx`): head-hunting style only + `setHearFrom(hearfrom)`; sourcing/source stay false.
- `src/lib/apiClient.ts` flag injector: emit `headhunting: false` / `source: false` explicitly for the source and career-sourcing routes; replace `sourcing: true` with `career_sourcing: true` alongside `hearfrom`.
- `src/components/steps/PersonalInfoStep.tsx` (and any other `isHeadhunting()` UI gate): switch to `isHeadhuntingStyle()`.
- `src/routes/career-sourcing.$hearfrom.tsx` added, `src/routes/sourcing.$hearfrom.tsx` removed, `src/routeTree.gen.ts` regenerated.
- `src/pages/Index.tsx`: add an `authWarnedRef` guard in `handleNext` for `currentSubStep === 11`, reusing the dashboard's dialog copy via the existing dialog primitives.
- `src/components/steps/CompletionStep.tsx`: `homeHref` returns `/career-sourcing/<hearfrom>`.
