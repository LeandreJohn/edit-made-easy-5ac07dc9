# App documentation (Word document, layered)

Produce a single downloadable `.docx` in `/mnt/documents` that explains how the app works and exactly what data it sends to the backend.

## Structure

**Part 1 — Overview (non-technical)**
- What the app is: applicant onboarding wizard + applicant dashboard + admin dashboard + standalone assessment pages.
- Entry points and how they change the experience: `/`, `/head-hunting`, `/davao-hub`, `/source/:name`, `/assessment`, `/ph-assessment`, `/compliance-docs-u`, `/dashboard`, `/attendance`, `/admin`.
- The applicant journey end to end: signup, 9 wizard steps (Personal Info, Education, Professional Background, Tools, Skills, Value Proposition, Work Setup, Compliance, Assessment), completion screen and return to the originating homepage.
- Dashboard behaviour: profile completion percentage, sequential step gating, Apply Now vs Reapply rules, notification and assessment cards, manage documents.
- Data safety notes: session-based draft autosave, files never persisted in the draft, unsaved-changes guard, read-only Referred By.

**Part 2 — Technical reference**
- Stack and layout: React + Vite + TypeScript, TanStack Router file routes in `src/routes/`, page components in `src/pages/`, wizard steps in `src/components/steps/`.
- Configuration: API base URL and env vars, request wrapper in `src/lib/apiClient.ts` (`/api/v1/app_site` prefix, auth token handling, error shape).
- **Endpoint catalogue** — one table row per endpoint with method, path, when it fires, and the exact request payload fields plus the response shape. Covers: `/signup` (incl. `ref`), `/login`, `/forgot_password`, `/change-password`, `/parse-resume`, `/personal-info`, `/education`, `/professional-background`, `/work-experience`, `/tools-platforms`, `/skills-competencies`, `/portfolio`, `/value-proposition`, `/certifications`, `/work-setup`, `/compliance`, `/update-portfolio-file`, `/update-work-setup-files`, `/update-compliance-files`, `/update_compliance_docs`, `/reapply`, `/finish`, `/attendance`, `/dashboard`, `/values_assessment`, `/us-assessment`, `/ph-assessment`, admin `/admin/role-formulas` and `/admin/assessment-link`, plus the IMX `/api/v1/values_assessment` calls (`generate_codes`, `launch_values`, `launch_disc`, `launch_ai`, rawscores polling) and the `contact_id` passed on every assessment call.
- File uploads: Azure upload flow, accepted types, 10 MB limit, which fields carry URLs vs File objects.
- Dashboard payload mapping: the fields the backend returns and where each is rendered, including `Social_Link` JSON strings, multi-file device spec arrays, `tag[]`, `can_do_assessment`, `last_stage_date_changed`.
- Data formats and normalisation rules: phone dial-code longest-match parsing, graduation date normalisation (ISO to MM/YYYY), date formats.
- Validation rules per step (`stepValidation.ts`, `wizardSchemas.ts`) and how they drive Next-button gating and dashboard completion percentage.
- Client storage: sessionStorage keys for the wizard draft, applicant identity, active dashboard section.
- Testing and local dev commands.

## Technical approach

- Read the source of truth before writing: `src/lib/apiClient.ts`, `src/pages/Dashboard.tsx`, `src/pages/Index.tsx`, `src/pages/AssessmentPage.tsx`, `src/pages/AdminDashboard.tsx`, each step component, `stepValidation.ts`, `wizardSchemas.ts`, `azureUpload.ts`, `wizardDraft.ts`, `types/application.ts`. Every payload table is transcribed from code, not assumed.
- Generate with the `docx` Node library: US Letter, Arial, styled headings, TOC, DXA-width tables for the endpoint catalogue.
- Validate the file, render every page to images and inspect for clipping or layout breaks, fix and re-run until clean.
- Output: `/mnt/documents/CareerBridge-App-Documentation.docx`, surfaced as a downloadable artifact.

No application source files change.
