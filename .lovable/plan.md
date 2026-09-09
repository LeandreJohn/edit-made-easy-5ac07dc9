# Restrict File Uploads to Images/PDF + Validate Speedtest Links

## Goal
Two small validation tightenings across the app:

1. **File uploads** — every upload dropzone only accepts JPEG, PNG, GIF, or PDF files.
2. **ISP speedtest links** — the primary/secondary ISP speedtest fields only accept URLs from `www.speedtest.net` (with or without `https://`).

## Changes

### 1. File uploads (images + PDF only)

**`src/components/wizard/FileDropzone.tsx`** (central dropzone used everywhere):
- Change the allowed-types logic so that by default only `image/jpeg`, `image/png`, `image/gif`, and `application/pdf` are accepted (both the native file-picker `accept` attribute and the post-selection filter, so drag-and-drop is covered too).
- Show a clear error toast when a disallowed file is dropped/picked (e.g. "Only JPEG, PNG, GIF, or PDF files are allowed").
- Update the helper text under the dropzone to say "Accepted: JPG, PNG, GIF, PDF".

**Usage cleanups** (so no screen allows other types):
- `src/components/steps/PortfolioStep.tsx` — currently `imagesOnly`; switch to the new default so PDFs are allowed too, per the request.
- `src/components/steps/CertificationsStep.tsx` — already pdf/jpg/png; add gif via the shared default.
- `src/components/steps/ComplianceStep.tsx`, `src/pages/ComplianceDocsUpload.tsx`, `src/components/common/ManageDocumentsModal.tsx`, `src/components/steps/WorkSetupStep.tsx` — align `accept` props with the shared default (jpeg/png/gif/pdf).
- Profile photo upload (Personal Info) stays images-only (jpeg/png/gif), no PDF.

### 2. Speedtest link validation

Fields: `primaryISPSpeedtest` and `secondaryISPSpeedtest` in:
- **`src/components/steps/WorkSetupStep.tsx`** (wizard) — validate on input/Next: value must start with `https://www.speedtest.net` or `www.speedtest.net`; show an inline error message and block advancing when invalid.
- **`src/pages/Dashboard.tsx`** (Work Setup section) — same validation on Save, with inline error.
- **`src/lib/validation/wizardSchemas.ts`** — add a `.refine()` to `workSetupSchema` so `primaryISPSpeedtest` must match the speedtest.net pattern (secondary validated when filled).
- Add a small hint under the fields: "Paste your result link from speedtest.net".

### Validation regex
```ts
/^(https?:\/\/)?(www\.)?speedtest\.net\//i
```
Accepts `www.speedtest.net/...` and `https://www.speedtest.net/...`; rejects anything else.

## Files touched
- `src/components/wizard/FileDropzone.tsx`
- `src/components/steps/PortfolioStep.tsx`
- `src/components/steps/CertificationsStep.tsx`
- `src/components/steps/ComplianceStep.tsx`
- `src/components/steps/WorkSetupStep.tsx`
- `src/components/common/ManageDocumentsModal.tsx`
- `src/pages/ComplianceDocsUpload.tsx`
- `src/pages/Dashboard.tsx`
- `src/lib/validation/wizardSchemas.ts`

## Verification
- `bun run build` passes.
- Manual check in preview: dropping a `.txt`/`.docx` shows the error toast; typing a non-speedtest URL shows the inline error and blocks Next/Save; a valid `https://www.speedtest.net/result/...` link passes.
