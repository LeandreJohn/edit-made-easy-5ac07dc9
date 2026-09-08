# Disclaimer prompt on dashboard, FAQs, and wizard

## Goal
Show a single, consistent disclaimer message in three places:
> "Please make sure the information in your Profile Builder is accurate, complete, and up to date, as it may be reviewed and assessed at any point."

## 1. Dashboard prompt (when profile is incomplete)
- In `src/pages/Dashboard.tsx`, render a dismissible banner near the top of the dashboard main area when `completionPct < 100`.
- Show it once per browser session using `sessionStorage` key `cb_dashboard_disclaimer_seen` so it does not nag on every navigation.
- Use the existing amber/info alert styling pattern already used for backend tag notifications.
- Include a close/dismiss button that sets the session flag and hides the banner.

## 2. Help Center FAQ — Disclaimer section
- In `src/components/common/HelpCenterModal.tsx`, add a new "Disclaimer" section above or below the existing sections.
- Display the same verbatim text.
- Keep the existing sections unchanged.

## 3. Wizard prompt after closing the intro video
- In `src/pages/Index.tsx`, after the user closes the `IntroVideoModal` (i.e. `showIntroModal` transitions from true to false), show the same disclaimer text once.
- Use a simple inline alert/banner or a small dialog; prefer an inline banner just under the step title so it is visible but not blocking.
- Track with `sessionStorage` key `cb_wizard_disclaimer_seen` so it only appears the first time the intro video is closed in a session.
- If the intro video is skipped or already seen, still show the disclaimer on the first wizard start of the session.

## Files to edit
- `src/pages/Dashboard.tsx`
- `src/components/common/HelpCenterModal.tsx`
- `src/pages/Index.tsx`
