# Quality-of-Life Improvements — Front End Recommendations

A prioritized list of front-end polish items. No code changes yet; pick the ones you want and I'll implement.

## Tier 1 — Highest impact, low risk

1. **Autosave + "draft restored" banner in the wizard**
   Persist wizard form state to local/session storage on every change and restore it on reload with a small "We restored your progress" notice and a "Start fresh" link. Prevents the worst possible user experience: losing a 20-minute application to a refresh or dropped connection.

2. **Unsaved-changes guard**
   Warn before closing the tab or navigating away from a wizard step / dashboard edit with pending changes.

3. **Real loading skeletons instead of blank areas**
   Dashboard, Attendance, and Admin currently pop from empty to full. Add skeleton cards for profile, stats, and document lists so the page never looks broken while fetching.

4. **Consistent error + retry states**
   One shared "Something went wrong — Retry" component for every failed fetch (dashboard, assessment status, admin lists), instead of silent empty screens. Include a friendly message for offline/network errors.

5. **Validation summary on failed Next/Submit**
   When a step is invalid, scroll to and focus the first invalid field and show a short list of what's missing at the top. Today the Next button just stays hidden/disabled, which leaves users hunting.

## Tier 2 — Flow and clarity

6. **Save-progress feedback**
   A subtle "Saved" indicator (timestamp) after each successful step submit, plus toast de-duplication so users aren't stacked with repeat toasts.

7. **Sticky step footer on mobile**
   Keep Back/Next visible at the bottom on small screens; today long steps require scrolling to the end to advance.

8. **Wizard progress clarity**
   Show "Step 4 of 12 — about 6 min left" and mark completed steps with a check in the sidebar, with clickable back-navigation to any completed step.

9. **File upload UX**
   Per-file progress bars, client-side size/type checks with a clear message before upload, thumbnail previews for images, and a remove/replace action on every uploaded item.

10. **Dashboard section deep-links**
    Reflect the active dashboard section in the URL (`/dashboard?section=education`) so refresh and browser Back behave correctly and links can be shared.

## Tier 3 — Polish and accessibility

11. **Empty-state design**
    Friendly illustrated empty states for no certifications, no work experience, no documents, no notifications — with the primary action inline.

12. **Accessibility pass**
    Labels tied to inputs, `aria-invalid` + `aria-describedby` on error fields, visible focus rings, keyboard access for all modals and dropdowns, and correct heading order.

13. **Mobile responsiveness sweep**
    Audit the widest surfaces (Dashboard 1.7k lines, Admin, WorkSetup tabs, assessment iframe) for horizontal overflow and cramped tab bars; convert tabs to a select on narrow screens.

14. **Motion and micro-interactions**
    Consistent step transitions, button pending spinners, and success checkmarks. Respect `prefers-reduced-motion`.

15. **Confirm destructive actions**
    Confirmation dialogs for removing uploaded documents, entries, and social links.

16. **Session expiry handling**
    Detect 401s globally, show a "Your session expired" dialog, and return the user to the same place after re-login instead of dumping them at the start.

## Tier 4 — Maintainability (invisible to users, speeds everything after)

17. **Split `Dashboard.tsx` (1,729 lines) and `AdminDashboard.tsx` (972 lines)**
    Extract each section view into its own file plus shared hooks for data mapping. Every future dashboard fix gets faster and safer.

18. **Centralize payload mapping**
    One `mapApplicantPayload()` module used by Dashboard, Attendance, and Admin so backend field changes are a one-file edit and the three views can't drift apart.

19. **Shared form-field primitives**
    A single `FormField` wrapper handling label, tooltip, error, and disabled styling, replacing repeated markup across the 14 step components.

20. **Extend the test suite**
    You already have `PhoneInput.test.ts`. Add tests for step validation rules, graduation-date parsing, profile-completion percentage, and reapply eligibility — the logic most likely to regress.

## Suggested first batch

If you want a single high-value slice: items **1, 2, 3, 4, 5** — autosave, unsaved-changes guard, skeletons, unified error/retry, and validation focus. They address the most common frustration points without touching business logic.
