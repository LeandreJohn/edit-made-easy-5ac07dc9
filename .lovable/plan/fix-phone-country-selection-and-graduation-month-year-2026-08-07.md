# Fix phone country selection and graduation month/year

## 1. Phone country stays stuck on the first country

Confirmed cause: when a country is picked, the phone field fires two separate updates built from the same stale snapshot — one sets the country, the other sets the number. The number update wins and rewrites the old country back, so the dial code changes but the country name never does.

Fix: emit the new phone value and the new country in a single update.

- `src/components/common/PhoneInput.tsx`: change `onChange` to `onChange(value, countryName?)` and pass the newly selected country from the country handler (and from the dial-code handler when a typed dial code matches a country) instead of calling two callbacks.
- `src/components/steps/PersonalInfoStep.tsx` and `src/pages/Dashboard.tsx` (personal edit form): apply both `phoneNumber` and `phoneCountry` in one state update.

## 2. Graduation month/year

Current behavior: picking a month before a year discards the month (only the year is stored), and Next appears with a year-only value.

- `src/components/steps/EducationStep.tsx`: keep partial input — store `MM/` when only a month is chosen and `/YYYY` when only a year is chosen, and parse those partials back into the two dropdowns so the selection sticks in either order.
- `src/lib/validation/stepValidation.ts` (`isEducationValid`) and `src/lib/validation/wizardSchemas.ts` (`educationSchema`): require a complete `MM/YYYY` (both month and year), not just any non-empty string, so the Next button stays hidden until both are set. Undergraduate/currently-studying keeps its existing optional rule, but if either part is filled both must be.
- Show an inline hint when only one of the two is selected.

The same rules apply on the dashboard education section, which reuses these validators.
