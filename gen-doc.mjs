import fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, TableOfContents, PageBreak, Header, Footer, PageNumber,
  TabStopType, TabStopPosition,
} from 'docx';

const BRAND = '004985';
const LIGHT = 'E6EFF6';
const GREY = 'CCCCCC';
const PAGE_W = 12240, PAGE_H = 15840, MARGIN = 1080;
const CONTENT = PAGE_W - MARGIN * 2; // 10080

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: GREY };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const margins = { top: 60, bottom: 60, left: 100, right: 100 };

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120 },
  ...opts.paraProps,
  children: [new TextRun({ text, size: opts.size ?? 20, bold: opts.bold, italics: opts.italics, color: opts.color, font: opts.font })],
});

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });

const bullet = (t, level = 0) => new Paragraph({
  numbering: { reference: 'bullets', level },
  spacing: { after: 60 },
  children: [new TextRun({ text: t, size: 20 })],
});

const numItem = (t) => new Paragraph({
  numbering: { reference: 'numbers', level: 0 },
  spacing: { after: 60 },
  children: [new TextRun({ text: t, size: 20 })],
});

const code = (t) => new Paragraph({
  spacing: { after: 60 },
  shading: { fill: 'F4F6F8', type: ShadingType.CLEAR },
  children: [new TextRun({ text: t, size: 18, font: 'Consolas' })],
});

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const mk = (text, i, isHead) => new TableCell({
    borders, margins, width: { size: widths[i], type: WidthType.DXA },
    shading: isHead ? { fill: LIGHT, type: ShadingType.CLEAR } : undefined,
    children: String(text).split('\n').map((line) => new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: line, size: 17, bold: isHead, font: line.startsWith('`') ? 'Consolas' : undefined })],
    })),
  });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => mk(h, i, true)) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => mk(c, i, false)) })),
    ],
  });
}

const spacer = () => new Paragraph({ spacing: { after: 160 }, children: [] });

// ---------------------------------------------------------------- CONTENT
const children = [];

// Cover
children.push(
  new Paragraph({ spacing: { before: 2600, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Cyberbacker Applicant Platform', bold: true, size: 56, color: BRAND })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [new TextRun({ text: 'Application Documentation', size: 32, color: '444444' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: 'How the app works and what data it sends', size: 22, italics: true, color: '666666' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 },
    children: [new TextRun({ text: 'Part 1 — Product overview   ·   Part 2 — Technical reference', size: 20, color: '666666' })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// TOC
const TOC = [
  ['Part 1 — Product overview', true],
  ['1.1 What the app is', false],
  ['1.2 Entry points', false],
  ['1.3 The applicant journey', false],
  ['1.4 Dashboard behaviour', false],
  ['1.5 How candidate data is protected in the browser', false],
  ['Part 2 — Technical reference', true],
  ['2.1 Stack and structure', false],
  ['2.2 Backend configuration and the request wrapper', false],
  ['2.3 How files are sent', false],
  ['2.4 Endpoint catalogue — authentication', false],
  ['2.5 Endpoint catalogue — wizard substeps', false],
  ['2.6 Endpoint catalogue — dashboard, documents and attendance', false],
  ['2.7 Dashboard payload mapping', false],
  ['2.8 Assessment (InnerMetrix) flow', false],
  ['2.9 Data formats and normalisation', false],
  ['2.10 Validation rules', false],
  ['2.11 Browser storage', false],
  ['2.12 Local development', false],
];
children.push(H1('Contents'));
TOC.forEach(([t, top]) => children.push(new Paragraph({
  spacing: { before: top ? 160 : 0, after: 60 },
  indent: { left: top ? 0 : 280 },
  children: [new TextRun({ text: t, size: top ? 22 : 20, bold: !!top, color: top ? BRAND : '222222' })],
})));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================== PART 1
children.push(H1('Part 1 — Product overview'));

children.push(H2('1.1 What the app is'));
children.push(P('The platform is a single-page web application that takes a candidate from first click to a fully assessed applicant profile. It has four surfaces:'));
children.push(
  bullet('Application wizard — a guided form where a candidate creates an account and then completes 12 substeps covering their full profile.'),
  bullet('Applicant dashboard — a returning applicant signs in to review, edit and complete their profile, upload or replace documents, and re-apply when eligible.'),
  bullet('Attendance dashboard — the same profile surface plus a daily log in / log out control with an availability selection.'),
  bullet('Assessment pages — standalone pages where a person can take the InnerMetrix (IMX) Values and DISC assessments without going through the whole wizard.'),
  bullet('Admin dashboard — internal views for applicant lists, role formulas, the shared assessment link, and report downloads.'),
);
children.push(spacer());

children.push(H2('1.2 Entry points'));
children.push(P('The URL a candidate arrives on is remembered for the whole session. It changes how the contact is tagged on the backend and where the candidate is returned to after finishing.'));
children.push(table(
  ['URL', 'Purpose', 'Effect on submitted data'],
  [
    ['/', 'Main application wizard', 'No acquisition flag added'],
    ['/head-hunting', 'Head-hunting campaign entry', 'headhunting: true added to every payload; a referral link field is collected'],
    ['/davao-hub', 'Davao hub campaign entry', 'davaohub: true added to every payload'],
    ['/source/:name', 'Named sourcing partner entry', 'source: true and source_name: "<name>" added to every payload'],
    ['/dashboard', 'Applicant dashboard', 'Reads and updates an existing profile'],
    ['/attendance', 'Attendance dashboard', 'Same as dashboard plus attendance log in / log out'],
    ['/assessment', 'Standalone US assessment', 'Creates a lightweight contact via /us-assessment'],
    ['/ph-assessment', 'Standalone PH assessment (eligibility gated)', 'Creates a contact via /ph-assessment; 403/404 means not eligible'],
    ['/compliance-docs-u', 'Document top-up page for existing contacts', 'Uploads clearances by email only'],
    ['/assessment-result', 'Read-only assessment result view', 'Reads results by contact id'],
    ['/admin', 'Admin dashboard', 'Admin reads and configuration writes'],
  ],
  [1900, 3600, 4580],
));
children.push(spacer());

children.push(H2('1.3 The applicant journey'));
children.push(P('Every substep saves to the backend as soon as the candidate presses Next, so nothing is lost if they stop halfway. The order is fixed:'));
[
  'Account creation — email and password. If the email already exists the app offers "Sign in instead" or "Forgot password".',
  'Personal Info — name, birth date, phone (with country), languages, address, nationality, social profiles, photo, and a read-only "Referred By" value taken from the ?ref= link.',
  'Education — highest level, school, location, graduation month and year, degree or field of study.',
  'Professional Background — preferred industry, up to three preferred roles, availability schedule and hours per day.',
  'Work Experience — one entry per job, or an explicit "no experience yet" answer.',
  'Tools & Platforms — suggested tools filtered to the roles picked in Professional Background, with a generic Virtual Assistant list as the fallback.',
  'Skills & Core Competencies — skills picked from a catalogue with a proficiency level each.',
  'Portfolio — an optional link plus optional sample files.',
  'Certifications — one entry per certificate, or an explicit "none" answer. Accepts PDF, JPG, JPEG and PNG.',
  'Value Proposition — a short free-text pitch.',
  'Work Setup — two tabs: Device Specification (primary/secondary device, headset, webcam, screenshots) and ISP Setup (providers and speed-test links).',
  'Compliance — background-check authorisation, valid ID, NBI and police clearances with validity dates, and proof of separation / certificate of employment.',
  'Assessment — the IMX Values assessment followed by the DISC assessment, both shown inside the page.',
].forEach((t) => children.push(numItem(t)));
children.push(P('The completion screen confirms the submission, explains the next steps, and returns the candidate to whichever homepage they started from.'));
children.push(spacer());

children.push(H2('1.4 Dashboard behaviour'));
children.push(
  bullet('Profile completion percentage — counts six sections: Personal Info, Education, Professional Background, Value Proposition, Work Setup and Compliance. Files already stored on the backend count as completed uploads.'),
  bullet('Sequential gating — a section in the sidebar stays locked until all sections before it are complete, in the order Personal Info, Education, Professional Background, Value Proposition, Work Setup, Compliance.'),
  bullet('Apply Now vs Reapply — if the backend has no last stage date the button reads "Apply Now". If a stage date exists and is 60 or more days old the button reads "Reapply". Otherwise a countdown of the remaining days is shown.'),
  bullet('Assessment card — appears only when the backend reports that the applicant may take the assessment.'),
  bullet('Notifications card — rendered from the backend contact tags, each tag mapped to a plain-language instruction.'),
  bullet('Manage Documents — replace individual files (portfolio, device screenshots, speed tests, clearances) without touching the rest of the profile.'),
  bullet('Referred By is always read-only, in the wizard and in the dashboard, with a tooltip explaining why.'),
);
children.push(spacer());

children.push(H2('1.5 How candidate data is protected in the browser'));
children.push(
  bullet('Draft autosave — in-progress wizard answers are kept in the browser session only, and are cleared when the tab is closed. Passwords are never written to the draft.'),
  bullet('Files are never stored in the draft — uploaded files are stripped before saving, so a refresh asks for them again rather than holding them in the browser.'),
  bullet('Unsaved-changes guard — navigating away from an edited form asks for confirmation first.'),
  bullet('Non-shareable dashboard state — the section a user is viewing is stored in the session, not the URL, so a copied link cannot expose another person\u2019s section.'),
  bullet('Uploads are limited to 10 MB per file; oversized files are skipped with a clear message.'),
);
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================== PART 2
children.push(H1('Part 2 — Technical reference'));

children.push(H2('2.1 Stack and structure'));
children.push(table(
  ['Area', 'Detail'],
  [
    ['Framework', 'React 18 + TypeScript, bundled with Vite'],
    ['Routing', 'TanStack Router with file routes in src/routes/; page components live in src/pages/'],
    ['UI', 'Tailwind CSS with shadcn/ui (Radix) components; design tokens in src/index.css'],
    ['Forms', 'TanStack Form with Zod schemas in src/lib/validation/wizardSchemas.ts'],
    ['Wizard steps', 'src/components/steps/*.tsx, one file per substep'],
    ['API layer', 'src/lib/apiClient.ts — the single place every network call is defined'],
    ['Tests', 'Vitest (bunx vitest run), covering phone parsing and graduation-date normalisation'],
  ],
  [2400, 7680],
));
children.push(spacer());

children.push(H2('2.2 Backend configuration and the request wrapper'));
children.push(P('The backend base URL comes from the VITE_API_BASE_URL environment variable. Two prefixes are used:'));
children.push(code('  Application API   {VITE_API_BASE_URL}/api/v1/app_site'));
children.push(code('  Assessment API    {VITE_API_BASE_URL}/api/v1/values_assessment'));
children.push(P('Every application-API call goes through one wrapper which:'));
children.push(
  bullet('Throws immediately if VITE_API_BASE_URL is not configured.'),
  bullet('Sends Content-Type: application/json on every request.'),
  bullet('Injects the acquisition flags of the active session into the JSON body: headhunting: true, davaohub: true, or source: true with source_name.'),
  bullet('On a non-2xx response, reads the JSON body and throws the backend detail string; otherwise it throws "HTTP <status>".'),
);
children.push(P('Assessment-API calls use a separate wrapper with the same error handling but no acquisition-flag injection. The browser never talks to InnerMetrix directly — all IMX traffic is proxied by the backend.'));
children.push(spacer());

children.push(H2('2.3 How files are sent'));
children.push(P('Client-side Azure uploads are disabled. Files are inlined into the JSON body as base64 objects so the backend can parse them without decoding raw bytes. Each file becomes one object with duplicate aliases so either naming convention works server-side:'));
children.push(code('{ file_name, filename, content_type, mime_type, size, content_base64, base64, data_url }'));
children.push(P('Endpoints that carry files also send a parallel array of plain file names (for example file_names, primary_device_screenshot_names) and, for single files, a *_file_name string.'));
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(H2('2.4 Endpoint catalogue — authentication'));
children.push(table(
  ['Method + path', 'When it fires', 'Request body', 'Response'],
  [
    ['POST /signup', 'Account creation on the welcome step', 'email, password, and when a referral is present ref and referred_by (the code extracted from the ?ref= URL or a pasted link)', '{ success, contact_id, tags? }'],
    ['POST /login', 'Returning applicant signs in', 'email, password', '{ success, contact_id, tags? }'],
    ['POST /forgot_password', '"Forgot password" action', 'email, forgot_password: 1', '{ success, message? }'],
    ['POST /change-password', 'Change Password modal in the dashboard', 'contact_id, new_password', '{ success }'],
  ],
  [2100, 2100, 4180, 1700],
));
children.push(spacer());

children.push(H2('2.5 Endpoint catalogue — wizard substeps'));
children.push(P('Each substep saves on Next. All bodies include contact_id.'));
children.push(table(
  ['Substep', 'Method + path', 'Body fields'],
  [
    ['1 Personal Info', 'PUT /personal-info', 'first_name, middle_name, last_name, suffix, phone, phone_country, date_of_birth, street, barangay, city, state_region, postal_code, address, country, nationality, languages, social_links (JSON string), referrer, ref, "Referred By", referral_link, photo (base64 file or null)'],
    ['2 Education', 'PUT /education', 'education_level, school_name, school_location, graduation_date (MM/YYYY), degree'],
    ['3 Professional Background', 'PUT /professional-background', 'preferred_industry, preferred_role (comma-separated, max 3), availability, hours_per_day'],
    ['4 Work Experience', 'PUT /work-experience', 'experiences[] — id, title, employer, location, startDate, endDate, currentlyWorking, responsibilities, toolsPlatforms, employmentType'],
    ['5 Tools & Platforms', 'PUT /tools-platforms', 'tools[] — { tool, proficiency }'],
    ['6 Skills', 'PUT /skills-competencies', 'skills[] — { skill, category, proficiency }, value_proposition'],
    ['7 Portfolio', 'PUT /portfolio', 'portfolio_link, file_names[], files[] (base64 objects)'],
    ['8 Certifications', 'PUT /certifications', 'certifications[] — type, title, organization, dateCompleted, expirationDate, credentialId, certificate_name, certificate (base64 or null); plus certificate_files[]'],
    ['9 Value Proposition', 'PUT /value-proposition', 'value_proposition'],
    ['10 Work Setup', 'PUT /work-setup', 'primary_device, secondary_device, has_noise_cancelling_headset, has_hd_webcam, primary_internet_provider, secondary_internet_provider, primary_isp_speedtest, secondary_isp_speedtest, detected_cpu, detected_ram, detected_storage, detection_source, detection_consent, primary_device_screenshot_names[], primary_device_screenshots[], secondary_device_screenshot_names[], secondary_device_screenshots[]'],
    ['11 Compliance', 'PUT /compliance', 'background_check_authorized, nbi_validity, police_validity, valid_id, nbi_clearance, police_clearance, proof_of_separation (each base64 or null) with matching *_file_name, plus valid_id_url, nbi_clearance_url, police_clearance_url, proof_of_separation_url'],
    ['12 Finish', 'PUT /finish', 'date_applied (MM/DD/YYYY, America/Denver)'],
  ],
  [1900, 2200, 5980],
));
children.push(new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun({ text: 'All of these return { success: boolean }.', size: 20 })] }));
children.push(spacer());

children.push(H2('2.6 Endpoint catalogue — dashboard, documents and attendance'));
children.push(table(
  ['Method + path', 'When it fires', 'Body / query', 'Response'],
  [
    ['GET /dashboard/{contact_id}', 'Dashboard and attendance page load', 'Path parameter; an email address may be used instead of an id', 'Full profile payload'],
    ['GET /profile/{contact_id}', 'Profile read helper', 'Path parameter', 'Raw contact record'],
    ['PUT /reapply', 'Apply Now / Reapply button', 'contact_id, referrer, date_applied', '{ success }'],
    ['POST /update-portfolio-file', 'Manage Documents — portfolio', 'contact_id, portfolio_link, file_names[], files[]', '{ success }'],
    ['POST /update-work-setup-files', 'Manage Documents — work setup', 'contact_id, primary_device_screenshots[], secondary_device_screenshots[], primary_isp_speedtest, secondary_isp_speedtest', '{ success }'],
    ['POST /update-compliance-files', 'Manage Documents — compliance', 'contact_id, valid_id, nbi_clearance, nbi_validity, police_clearance, police_validity, proof_of_separation and their *_file_name values', '{ success }'],
    ['POST /update_compliance_docs', '/compliance-docs-u page', 'email plus only the documents actually supplied: nbi_clearance, nbi_validity, police_clearance, police_validity, proof_of_separation', '{ success? }'],
    ['PUT /attendance', 'Attendance log in / log out', 'contact_id, login_status ("Logged In - <availability>" or "Logged Out"), action, availability, date', '{ success? }'],
    ['POST /parse-resume', 'Resume upload for auto-fill', 'file (base64 object)', '{ success, file_name, parsed_data, raw_text }'],
    ['GET /applicants', 'Admin applicant list', 'page, limit, start_after', 'Paged list of { id, name, email }'],
    ['GET /applicants/{id}', 'Admin applicant detail', 'Path parameter', 'Contact with custom_fields'],
    ['GET / PUT /admin/role-formulas', 'Admin role-formula editor', 'PUT sends { formulas }', 'Formula list / { ok }'],
    ['GET / PUT /admin/assessment-link', 'Admin shared assessment link', 'PUT sends { url }', '{ url, uses } / { ok }'],
  ],
  [2500, 2100, 3980, 1500],
));
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(H2('2.7 Dashboard payload mapping'));
children.push(P('GET /dashboard/{contact_id} returns one nested object. This is where each part is rendered.'));
children.push(table(
  ['Payload field', 'Used for'],
  [
    ['id, email', 'Contact identity; cached for assessment calls'],
    ['profile_picture', 'Header avatar and the Personal Info preview'],
    ['date_applied', 'Application date shown in the header'],
    ['last_update_changes', 'Last-updated stamp'],
    ['can_do_assessment ("Yes"/"No")', 'Shows or hides the Assessment card'],
    ['tag[]', 'Notifications card — each tag maps to an instruction'],
    ['last_stage_date_changed', 'Apply Now vs Reapply and the 60-day countdown'],
    ['personal_info.*', 'Personal Info section. "Referred By" renders read-only; Social_Link is a JSON string parsed into named profile links; PH addresses use street/barangay/city, other countries use address plus state/postal fields'],
    ['education.*', 'Education section; graduation_date arrives as ISO and is normalised for display'],
    ['professional_background.*', 'Preferred industry, roles, availability, hours per day'],
    ['work_experience[]', 'Work experience cards'],
    ['tools[]', 'Tools and proficiency levels'],
    ['skills.items / skills.structured / skills.value_proposition', 'Skills grid and the Value Proposition section'],
    ['portfolio.link, portfolio.files[]', 'Portfolio link and stored file previews'],
    ['certifications[]', 'Certification cards with certificate previews'],
    ['work_setup.*', 'Devices, providers, speed-test links, and the stored screenshots in device_spec, device_spec_files, primary_device_spec_files and secondary_device_spec_files'],
    ['compliance.*', 'Background-check flag, valid ID, NBI and police clearance files with validity dates, and COE'],
    ['custom_fields_raw[]', 'Fallback lookup for fields not present in the typed sections'],
  ],
  [3200, 6880],
));
children.push(spacer());
children.push(P('File fields may be a bare URL string or an object with url / name / file_name — both shapes are handled, and any file already stored as a URL counts toward the completion percentage.'));
children.push(spacer());

children.push(H2('2.8 Assessment (InnerMetrix) flow'));
children.push(P('All assessment traffic is proxied under /api/v1/values_assessment, and contact_id is required on every call.'));
children.push(table(
  ['Method + path', 'Purpose', 'Payload'],
  [
    ['POST /generate_codes', 'Mint an assessment code. Idempotent per user, so a refresh cannot create a duplicate.', 'prefix ("VI" values, "DI" DISC, "AI" attribute index), count, contact_id'],
    ['POST /launch_values', 'Get the Values assessment URL to embed', 'code, fname, lname, email, contact_id, complete_url?, lang?'],
    ['POST /launch_disc', 'Get the DISC assessment URL to embed', 'Same as launch_values'],
    ['POST /launch_ai', 'Get the Attribute Index URL', 'Same, plus ai_report?'],
    ['GET /values/results/{code}?contact_id=', 'Poll for Values completion', 'Query parameter contact_id'],
    ['GET /disc/results/{code}?contact_id=', 'Poll for DISC completion', 'Query parameter contact_id'],
    ['GET /values/report/{code}?contact_id=', 'Report download (admin only in the UI)', 'Query parameter contact_id'],
    ['GET /disc/report/{code}?contact_id=', 'Report download (admin only in the UI)', 'Query parameter contact_id'],
    ['POST /values_assessment (app_site)', 'Store the computed values scores', 'contact_id or email, scores{}, answers[]'],
    ['GET /assessment_result?cid=', 'Read a stored result', 'cid query parameter'],
    ['POST /us-assessment', 'Create a lightweight contact for /assessment', 'email, firstname, lastname → { contact_id }'],
    ['POST /ph-assessment', 'Same for /ph-assessment; 403 or 404 means not eligible', 'email, firstname, lastname → { contact_id }'],
  ],
  [3000, 3200, 3880],
));
children.push(spacer());
children.push(P('The results endpoints have no explicit "completed" flag, so a response counts as complete when it carries completed: true, any non-empty scores / rawscores / dimensions / results / data bucket, or any numeric value. Status checks are throttled to one every 30 seconds and Continue is only enabled after a 5-minute minimum.'));
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(H2('2.9 Data formats and normalisation'));
children.push(table(
  ['Value', 'Stored / sent as', 'Rule'],
  [
    ['Phone number', '+<dial code><national number>', 'Splitting uses a longest-match against the known dial-code list, so +63 9458707854 never splits as +6394. An invalid number turns the field border red.'],
    ['Graduation date', 'MM/YYYY', 'Backend ISO values ("2021-05-20", "2021-05") are normalised to MM/YYYY on load and displayed as "May 2021". Both month and year are required before Next unlocks.'],
    ['Date of birth', 'MM/DD/YYYY', 'Picked with the month/day/year date picker'],
    ['date_applied', 'MM/DD/YYYY', 'Generated in America/Denver time'],
    ['Social links', 'JSON string', 'e.g. {"Facebook":"https://..."} — one entry per named platform'],
    ['Preferred roles', 'Comma-separated string', 'Maximum of three roles'],
    ['Referral code', 'Bare code', 'Extracted from a full URL, a "?ref=CODE" fragment, or accepted as-is'],
  ],
  [1900, 2200, 5980],
));
children.push(spacer());

children.push(H2('2.10 Validation rules'));
children.push(P('These rules gate the wizard Next button and drive the dashboard completion percentage and sidebar locks.'));
children.push(table(
  ['Section', 'Required for "complete"'],
  [
    ['Personal Info', 'First name, last name, date of birth, phone, languages, country, nationality; Philippines also requires house/street, barangay and city, other countries require the street address'],
    ['Education', 'Level, school name, school location, a full MM/YYYY graduation date (optional for undergraduates), and a degree or field of study unless the level is High School Graduate. "Other" requires the free-text value.'],
    ['Professional Background', 'Preferred industry (with the free-text value when "Others"), at least one and at most three roles, and an availability schedule'],
    ['Value Proposition', 'Non-empty text'],
    ['Work Setup', 'Device tab: primary device and at least one device screenshot. ISP tab: also primary internet provider and primary speed-test link.'],
    ['Compliance', 'A valid ID file, plus the background-check authorisation'],
    ['Tools / Skills', 'At least one selection each (wizard only; not counted in the dashboard percentage)'],
  ],
  [2400, 7680],
));
children.push(spacer());

children.push(H2('2.11 Browser storage'));
children.push(table(
  ['Key', 'Store', 'Contents'],
  [
    ['cb_contact_id', 'localStorage', 'The signed-in contact id'],
    ['cb_applicant_identity', 'sessionStorage', 'email, firstName, lastName — used to populate IMX launch calls'],
    ['cb_wizard_draft_v1', 'sessionStorage', 'Wizard answers with files stripped and the password blanked'],
    ['cb_dashboard_section', 'sessionStorage', 'The dashboard section currently open (kept out of the URL)'],
  ],
  [2600, 2200, 5280],
));
children.push(spacer());

children.push(H2('2.12 Local development'));
children.push(code('  bun install            install dependencies'));
children.push(code('  bun run dev            start the dev server on :8080'));
children.push(code('  bunx vitest run        run the test suite'));
children.push(code('  bun run build          production build'));
children.push(spacer());
children.push(P('Set VITE_API_BASE_URL in .env before running — every API call throws a configuration error without it.'));

// ---------------------------------------------------------------- DOC
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: BRAND },
        paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: BRAND },
        paragraph: { spacing: { before: 240, after: 140 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial' },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 500, hanging: 260 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 500, hanging: 260 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Page ', size: 16, color: '888888' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888' })],
      })] }),
    },
    children,
  }],
});

const out = process.argv[2];
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out, b.length); });
