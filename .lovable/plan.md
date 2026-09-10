# Fix: Compliance stays locked even when Work Setup is filled in

## What's happening

In the Dashboard, each section unlocks only when the sections above it are complete. Compliance sits right after Work Setup, so it stays locked whenever Work Setup is judged incomplete.

Work Setup is judged complete by `isWorkSetupValid` (`src/lib/validation/stepValidation.ts`), which now requires the speedtest field to match:

```text
/^(https?:\/\/)?(www\.)?speedtest\.net\//i
```

Two ways this rejects a profile that really is filled in:

1. The pattern requires a slash after the domain, so a stored value like `https://www.speedtest.net` (no path) fails.
2. Any link the applicant saved before this rule existed — a share link on another speedtest domain, a shortened link, or an uploaded screenshot instead of a link — fails too, even though the backend has the data.

The check also needs primary device screenshots; those already fall back to backend URLs, so they are not the likely blocker. Which of the two above applies to this specific account is unconfirmed, so step 1 below is a quick check of the actual saved value before the fix lands.

## Plan

1. **Confirm** — open the account in the preview, read the Work Setup values coming from the backend, and note which required field the completion check rejects.

2. **Separate "complete" from "correctly formatted"** (`src/lib/validation/stepValidation.ts`)
   - `isWorkSetupValid` (used for unlocking sections and the completion percentage) requires the speedtest link to be *present*, not to match the speedtest.net pattern.
   - Keep a separate `isWorkSetupSaveValid` that additionally enforces the speedtest.net format. This is used only when the applicant is editing and saving the section, so new entries still have to be proper speedtest.net links while previously saved data never locks anyone out.

3. **Loosen the pattern itself** so legitimate links stop being rejected: allow the domain with or without a trailing path and accept speedtest.net subdomains.
   ```text
   /^(https?:\/\/)?([a-z0-9-]+\.)*speedtest\.net(\/|$)/i
   ```

4. **Wire the save-time check** — `src/pages/Dashboard.tsx` `isDraftSectionValid` for `workSetup` uses the stricter save variant; the sidebar gating and percentage (`sectionChecks`) use the relaxed one. The wizard's Work Setup step keeps its current inline error on the ISP tab.

## Verification

- Build passes.
- With a profile that has Work Setup data from the backend, Compliance is unlocked and the percentage counts Work Setup as done.
- Editing Work Setup and typing a non-speedtest link still shows the error and blocks Save.
