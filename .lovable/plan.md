Persist unrecognized degree values as "Other" in dashboard education

When the backend returns a degree that is not in the predefined list, the dashboard currently drops it into the Degree / Field dropdown directly. If it is not one of the known options, the dropdown shows blank and the custom value is lost on the next save.

## What changes

- When mapping the backend education payload in `src/pages/Dashboard.tsx`, check whether `e.degree` exists in the known `FIELDS_OF_STUDY` list.
  - If it is in the list, keep the current mapping (`degreeField = e.degree`, `degreeFieldOther = e.other_degree`).
  - If it is not in the list (or is empty), set `degreeField` to `"Other"` and `degreeFieldOther` to the original `e.degree` value (falling back to `e.other_degree` if `e.degree` is empty).
- Export `FIELDS_OF_STUDY` from `src/components/steps/EducationStep.tsx` and import it in `src/pages/Dashboard.tsx` so the same canonical list is used in both places.

## Technical details

- `src/components/steps/EducationStep.tsx`
  - Add `export` to the `FIELDS_OF_STUDY` constant.
- `src/pages/Dashboard.tsx`
  - Import `FIELDS_OF_STUDY` from `EducationStep.tsx`.
  - In the education loader block (~line 316), replace the direct `degreeField: e.degree || ''` mapping with a normalization helper:
    ```ts
    const rawDegree = e.degree || '';
    const isKnownDegree = FIELDS_OF_STUDY.includes(rawDegree);
    const degreeField = rawDegree && !isKnownDegree ? 'Other' : rawDegree;
    const degreeFieldOther = rawDegree && !isKnownDegree ? rawDegree : (e.other_degree || '');
    ```
- No changes to `EducationStep.tsx` UI/validation, `EducationView`, or `apiClient.ts`; the previous `other_degree` save path already supports sending the free-text value back.
