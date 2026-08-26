# Send "Other" degree text to the backend

When an applicant picks **Other** as their Degree / Field of Study, the free-text box they fill in is currently not sent to the backend — only the literal value "Other" is saved.

## What changes

- The education save request will include an extra field `other_degree` carrying the typed text whenever the selected degree is "Other".
- When the degree is anything else, `other_degree` is sent empty so a previously typed value doesn't linger.
- Loading a profile back into the dashboard will read `other_degree` so the specify box repopulates instead of appearing blank.

## Technical details

- `src/lib/apiClient.ts`
  - `updateEducation()`: add `other_degree: e.degreeField === 'Other' ? (e.degreeFieldOther ?? '').trim() : ''` to the PUT `/education` body.
  - Profile response type (line ~635): add `other_degree?: string` to the `education` shape.
- `src/pages/Dashboard.tsx`
  - Profile mapping (~line 321): set `degreeFieldOther: e.other_degree || ''`.
  - Education review block (~line 1816): show the specified text when degree is "Other".

No UI or validation changes; `degreeFieldOther` already exists in the `Education` type and the wizard step.
