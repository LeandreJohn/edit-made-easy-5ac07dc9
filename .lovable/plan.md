# Send the account email with the Personal Info save

The email an applicant signs in or signs up with is remembered for the session and sent along whenever Personal Info is saved — from the wizard and from the dashboard.

## Behaviour

- Successful sign-in: the entered email is stored in the session.
- Successful sign-up: the new account email is stored in the session.
- Saving Personal Info (wizard or dashboard) includes that email in the request.
- If no email is in the session (e.g. a page opened without signing in), the field is sent empty; nothing else changes.

## Technical changes

**`src/components/steps/WelcomeStep.tsx`**
- After a successful `apiLogin`, call `saveApplicantIdentity({ email })`.
- After a successful `apiSignup`, call `saveApplicantIdentity({ email })` alongside `saveContactId`.

**`src/lib/apiClient.ts`**
- In `updatePersonalInfo`, add `email: loadApplicantIdentity()?.email ?? ''` to the PUT `/personal-info` body. No other payload key changes; the existing new-contact-id handling stays as is.

Both the wizard (`submitSubstep` case 1) and the dashboard call `updatePersonalInfo`, so one change covers both paths.
