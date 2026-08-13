# Add /sourcing/:hearfrom entry route

A new dynamic entry URL that mirrors `/source/:name`, but tags the contact with a "heard from" value instead of a source name, while still honoring the `?ref=` referral code.

## What gets built

1. **New route `/sourcing/:hearfrom`** — behaves exactly like `/source/:name`: it renders the normal application wizard, keeps the head-hunting styled flow active, and reads `?ref=` from the URL to prefill the read-only "Referred By" field.

2. **Signup payload** — while this route is active, every API payload (including signup) carries:
   - `sourcing: true`
   - `hearfrom: "<value from the URL>"`
   - `ref` / `referred_by` when a `?ref=` code is present (unchanged behavior)

3. **Return-home behavior** — the completion screen's "Got it, thanks!" button returns applicants who came from `/sourcing/:hearfrom` back to that same URL, matching how `/source/:name`, `/head-hunting`, and `/davao-hub` already work.

4. **Referral audit across all entry URLs** — verify and harden that signup passes `ref` from `/`, `/head-hunting`, `/davao-hub`, `/source/:name`, and the new `/sourcing/:hearfrom`. Today the signup screen reads `?ref=` from the current URL only; if the query string is lost (for example a refresh after navigating within the wizard), the code is dropped even though it was already captured. Signup will fall back to the referral code stored for the session so the value is never lost.

## Technical details

- `src/lib/headhunting.ts`: add module state `SOURCING_HEARFROM` with `setHearFrom` / `getHearFrom`, alongside the existing flags.
- `src/lib/apiClient.ts`: in the `request()` flag injector, when a hearfrom value is set add `sourcing: true` and `hearfrom: <value>` to the JSON body. Existing `source` / `source_name` injection for `/source/:name` is left as is.
- `src/pages/Sourcing.tsx` (new): copy of the `Source.tsx` pattern — reads the `hearfrom` param, sets head-hunting + hearfrom state on mount, clears it on unmount, reads `?ref=`, renders `<Index defaultReferralLink={ref} />`, and renders `NotFound` when the param is missing.
- `src/routes/sourcing.$hearfrom.tsx` (new): `createFileRoute("/sourcing/$hearfrom")` pointing at the new page. The generated route tree picks it up automatically.
- `src/components/steps/CompletionStep.tsx`: add a `getHearFrom()` branch to `homeHref` returning `/sourcing/<hearfrom>`.
- `src/components/steps/WelcomeStep.tsx`: signup referral becomes `searchParams.get('ref') || sessionStorage.getItem('cb_referrer') || ''`, matching the session capture already done in `Index.tsx`.
