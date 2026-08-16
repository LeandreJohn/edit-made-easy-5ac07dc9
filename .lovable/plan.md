# Meta Pixel + LinkedIn Insight Tag with conversion tracking

Neither tag exists in the app today, so both get installed and both fire the same conversion at the same two places.

## 1. Install both tags

Added to `index.html` head (base code only, loads on every page):

- Meta Pixel `847955697916211` — base snippet with `PageView`.
- LinkedIn Insight Tag, partner ID `8262162`.
- Both `<noscript>` image fallbacks go in `<body>` (HTML requires it — they cannot live in `<head>`).

## 2. Conversion fires on two buttons

| Where | Button | Events |
|---|---|---|
| Wizard completion screen | "Got it, thanks!" | Meta `Lead` + LinkedIn conversion |
| Dashboard | Apply Now / Reapply | Meta `Lead` + LinkedIn conversion |

On the dashboard, the event fires only after the apply/reapply request succeeds, so a failed attempt is not counted as a conversion.

## 3. LinkedIn conversion ID

LinkedIn's `lintrk('track', { conversion_id: … })` needs a numeric conversion ID created in Campaign Manager. You have not given one, so the code will read it from an optional env value (`VITE_LINKEDIN_CONVERSION_ID`). While it is unset, the LinkedIn call is skipped and only the Meta event fires; drop the ID in later and LinkedIn conversions start recording with no code change. Send it over and I'll hardcode it instead.

## Technical details

- `index.html`: Meta Pixel + LinkedIn base snippets in `<head>`; both `<noscript>` pixels at the top of `<body>`.
- New `src/lib/tracking.ts`: typed `window.fbq` / `window.lintrk` declarations and a single `trackApplicationLead()` helper that fires `fbq('track','Lead')` and, when a conversion ID is configured, `lintrk('track', { conversion_id })`. Guarded so it is a no-op when the scripts are blocked or not loaded.
- `src/components/steps/CompletionStep.tsx`: call `trackApplicationLead()` in the "Got it, thanks!" handler before the redirect.
- `src/pages/Dashboard.tsx`: call `trackApplicationLead()` in `submitReapply` after the request resolves successfully (covers both the top Apply/Reapply CTA and the one on the Profile Complete card, since both open the same dialog).
- Verification: load the preview with Playwright and confirm `window.fbq` and `window.lintrk` exist and that clicking "Got it, thanks!" issues the Meta tracking request.
