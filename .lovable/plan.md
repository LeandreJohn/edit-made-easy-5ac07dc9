# Add Google Analytics conversion tracking

Wire the provided GA4 tag (`G-W5KXFNHJF0`) into the app so it fires at the same conversion points as the Meta Pixel and LinkedIn Insight Tag.

## 1. Load the Google tag

Add the provided base snippet to `index.html` `<head>`, after the existing Meta and LinkedIn base codes:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-W5KXFNHJF0"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-W5KXFNHJF0');
</script>
```

## 2. Fire GA conversions where Meta/LinkedIn fire

Extend `src/lib/tracking.ts`:

- Declare `window.gtag`.
- In `trackApplicationLead()`, also call `gtag('event', 'generate_lead')` (GA4's standard lead event), guarded so it is a no-op if the script is blocked.

This automatically covers the two existing call sites:

- `src/components/steps/WelcomeStep.tsx` — "Continue Building My Profile" / sign-up flow.
- `src/pages/Dashboard.tsx` — successful Apply/Reapply submission.

## 3. Track SPA route changes as page views

Because the app is a single-page app, the initial `config` only records the first page load. Add route-change tracking in `src/App.tsx`:

- Use `useLocation` from `react-router-dom` inside a small wrapper component.
- On location change, call `gtag('event', 'page_view', { page_path: location.pathname })`.

## 4. Verification

Run `bun run build` and confirm no errors.
