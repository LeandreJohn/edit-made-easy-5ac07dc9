/**
 * API client for the Cyberbacker FastAPI backend.
 *
 * Configure the base URL via the `VITE_API_BASE_URL` environment variable in `.env`.
 * All endpoints are namespaced under `/api/v1/app_site` on the backend.
 */
import type {
  ApplicationData,
  PersonalInfo,
  Education,
  ProfessionalBackground,
  WorkExperience,
  SelectedTool,
  SelectedSkill,
  Certification,
  WorkSetup,
  ComplianceData,
} from '@/types/application';
import { isHeadhunting, isDavaohub, isSourcing, getSourceName } from '@/lib/headhunting';
// Client-side Azure uploads are disabled. Files are sent in JSON-safe base64
// objects so FastAPI can parse them without trying to UTF-8 decode raw bytes.

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const API_BASE = RAW_BASE.replace(/\/$/, '');
const PREFIX = '/api/v1/app_site';

function url(path: string): string {
  return `${API_BASE}${PREFIX}${path}`;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL is not configured. Edit your .env file.');
  }
  // Inject acquisition flags into JSON bodies when their corresponding
  // session route is active (e.g. /head-hunting, /davao-hub).
  let body = init.body;
  if ((isHeadhunting() || isDavaohub() || isSourcing()) && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      const extra: Record<string, boolean | string> = {};
      if (isHeadhunting()) extra.headhunting = true;
      if (isDavaohub()) extra.davaohub = true;
      if (isSourcing()) {
        extra.source = true;
        extra.source_name = getSourceName();
      }
      body = JSON.stringify({ ...parsed, ...extra });
    } catch { /* leave body untouched */ }
  }
  const res = await fetch(url(path), {
    ...init,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j?.detail ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

function fileNames(files: File[]): string[] {
  return files.map((file) => file.name);
}

export interface JsonUploadFile {
  file_name: string;
  filename: string;
  content_type: string;
  mime_type: string;
  size: number;
  content_base64: string;
  base64: string;
  data_url: string;
}

async function toJsonUploadFile(file: File): Promise<JsonUploadFile> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
  const contentBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return {
    file_name: file.name,
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    mime_type: file.type || 'application/octet-stream',
    size: file.size,
    content_base64: contentBase64,
    base64: contentBase64,
    data_url: dataUrl,
  };
}

async function toJsonUploadFiles(files: File[] = []): Promise<JsonUploadFile[]> {
  return Promise.all(files.map(toJsonUploadFile));
}

// ------------------------ HELPERS ------------------------

/** Format today as MM/DD/YYYY in Mountain Daylight Time (America/Denver). */
export function todayMDT(): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  return fmt.format(new Date());
}

/** Extract a referral code from a string that may be a URL or a bare code. */
export function extractReferralCode(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    return u.searchParams.get('ref') || trimmed;
  } catch {
    // Not a URL — maybe a bare query like "?ref=ABC" or just "ABC"
    const m = trimmed.match(/[?&]ref=([^&]+)/i);
    return m ? decodeURIComponent(m[1]) : trimmed;
  }
}

// ------------------------ RESUME PARSING ------------------------

export interface ParsedResume {
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  certifications: string;
}

export interface ParseResumeResponse {
  success: boolean;
  file_name: string;
  parsed_data: ParsedResume;
  raw_text: string;
}

export async function parseResume(file: File): Promise<ParseResumeResponse> {
  const res = await request<ParseResumeResponse>('/parse-resume', {
    method: 'POST',
    body: JSON.stringify({ file: await toJsonUploadFile(file) }),
  });
  return res;
}

// ------------------------ AUTH ------------------------

export interface AuthResponse {
  success: boolean;
  contact_id: string;
  /** Backend-issued contact tags (e.g. "Talent Pool") used for routing. */
  tags?: string[];
}

/** Sign in an existing contact. Throws if the credentials are invalid. */
export function login(email: string, password: string) {
  return request<AuthResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** Create a new contact. Throws if the email already exists. */
export function signup(email: string, password: string, referredBy = '') {
  const payload: Record<string, string> = { email, password };
  if (referredBy) payload.referred_by = referredBy;
  return request<AuthResponse>('/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function forgotPassword(email: string) {
  return request<{ success: boolean; message?: string }>('/forgot_password', {
    method: 'POST',
    body: JSON.stringify({ email, forgot_password: 1 }),
  });
}

export function changePassword(contactId: string, newPassword: string) {
  return request<{ success: boolean }>('/change-password', {
    method: 'POST',
    body: JSON.stringify({ contact_id: contactId, new_password: newPassword }),
  });
}

// ------------------------ FILE-ONLY UPDATES (Manage Documents modal) ------------------------

export async function updatePortfolioFiles(contactId: string, portfolioLink: string, files: File[]) {
  return request<{ success: boolean }>('/update-portfolio-file', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      portfolio_link: portfolioLink,
      file_names: fileNames(files),
      files: await toJsonUploadFiles(files),
    }),
  });
}

export async function updateWorkSetupFiles(contactId: string, payload: {
  primaryDeviceScreenshots?: File[];
  secondaryDeviceScreenshots?: File[];
  primaryIspSpeedtest?: File | null;
  secondaryIspSpeedtest?: File | null;
}) {
  return request<{ success: boolean }>('/update-work-setup-files', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      primary_device_screenshots: await toJsonUploadFiles(payload.primaryDeviceScreenshots ?? []),
      secondary_device_screenshots: await toJsonUploadFiles(payload.secondaryDeviceScreenshots ?? []),
      primary_isp_speedtest: payload.primaryIspSpeedtest ? await toJsonUploadFile(payload.primaryIspSpeedtest) : null,
      secondary_isp_speedtest: payload.secondaryIspSpeedtest ? await toJsonUploadFile(payload.secondaryIspSpeedtest) : null,
    }),
  });
}

export async function updateComplianceFiles(contactId: string, payload: {
  validId?: File | null;
  nbiClearance?: File | null;
  nbiValidity?: string;
  policeClearance?: File | null;
  policeValidity?: string;
  proofOfSeparation?: File | null;
}) {
  return request<{ success: boolean }>('/update-compliance-files', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      valid_id: payload.validId ? await toJsonUploadFile(payload.validId) : null,
      valid_id_file_name: payload.validId?.name ?? '',
      nbi_clearance: payload.nbiClearance ? await toJsonUploadFile(payload.nbiClearance) : null,
      nbi_clearance_file_name: payload.nbiClearance?.name ?? '',
      nbi_validity: payload.nbiValidity ?? '',
      police_clearance: payload.policeClearance ? await toJsonUploadFile(payload.policeClearance) : null,
      police_clearance_file_name: payload.policeClearance?.name ?? '',
      police_validity: payload.policeValidity ?? '',
      proof_of_separation: payload.proofOfSeparation ? await toJsonUploadFile(payload.proofOfSeparation) : null,
      proof_of_separation_file_name: payload.proofOfSeparation?.name ?? '',
    }),
  });
}

// ------------------------ STEP UPDATES ------------------------

export async function updatePersonalInfo(contactId: string, p: PersonalInfo, referrer = '') {
  return request<{ success: boolean }>('/personal-info', {
    method: 'PUT',
    body: JSON.stringify({
      contact_id: contactId,
      first_name: p.firstName,
      middle_name: p.middleName,
      last_name: p.lastName,
      phone: p.phoneNumber,
      phone_country: p.phoneCountry,
      suffix: p.suffix,
      date_of_birth: p.dateOfBirth,
      street: p.houseStreet,
      barangay: p.barangay,
      city: p.city,
      state_region: p.stateRegion ?? '',
      postal_code: p.postalCode ?? '',
      address: p.address,
      country: p.country,
      nationality: p.nationality,
      languages: p.languagesSpoken,
      social_links: p.socialLinks ?? '',
      referrer,
      referral_link: p.referralLink ?? '',
      photo: p.photo ? await toJsonUploadFile(p.photo) : null,
    }),
  });
}

export function reapply(contactId: string, referrer: string, dateApplied: string) {
  return request<{ success: boolean }>('/reapply', {
    method: 'PUT',
    body: JSON.stringify({ contact_id: contactId, referrer, date_applied: dateApplied }),
  });
}

export function finishApplication(contactId: string, dateApplied: string) {
  return request<{ success: boolean }>('/finish', {
    method: 'PUT',
    body: JSON.stringify({ contact_id: contactId, date_applied: dateApplied }),
  });
}

export function updateEducation(contactId: string, e: Education) {
  return request<{ success: boolean }>('/education', {
    method: 'PUT',
    body: JSON.stringify({
      contact_id: contactId,
      education_level: e.highestLevel,
      school_name: e.schoolName,
      school_location: e.schoolLocation,
      graduation_date: e.graduationDate,
      degree: e.degreeField,
    }),
  });
}

export function updateProfessionalBackground(contactId: string, p: ProfessionalBackground) {
  // The wizard stores the chosen schedule in `schedule`; fall back to
  // `availability` for older draft state. Backend expects `availability`.
  const availability = p.schedule || p.availability || '';
  return request<{ success: boolean }>('/professional-background', {
    method: 'PUT',
    body: JSON.stringify({
      contact_id: contactId,
      preferred_industry: p.preferredIndustry,
      preferred_role: p.preferredRole,
      availability,
      hours_per_day: p.hoursPerDay,
    }),
  });
}

export function updateWorkExperience(contactId: string, experiences: WorkExperience[]) {
  return request<{ success: boolean }>('/work-experience', {
    method: 'PUT',
    body: JSON.stringify({ contact_id: contactId, experiences }),
  });
}

export function updateToolsPlatforms(contactId: string, tools: SelectedTool[]) {
  return request<{ success: boolean }>('/tools-platforms', {
    method: 'PUT',
    body: JSON.stringify({ contact_id: contactId, tools }),
  });
}

export function updateSkills(
  contactId: string,
  skills: SelectedSkill[],
  valueProposition: string,
) {
  return request<{ success: boolean }>('/skills-competencies', {
    method: 'PUT',
    body: JSON.stringify({
      contact_id: contactId,
      skills,
      value_proposition: valueProposition,
    }),
  });
}

export async function updatePortfolio(
  contactId: string,
  portfolioLink: string,
  _fileUrls: string[] = [],
  files: File[] = [],
) {
  return request<{ success: boolean }>('/portfolio', {
    method: 'PUT',
    body: JSON.stringify({
      contact_id: contactId,
      portfolio_link: portfolioLink,
      file_names: fileNames(files),
      files: await toJsonUploadFiles(files),
    }),
  });
}

export function updateValueProposition(contactId: string, valueProposition: string) {
  return request<{ success: boolean }>('/value-proposition', {
    method: 'PUT',
    body: JSON.stringify({
      contact_id: contactId,
      value_proposition: valueProposition,
    }),
  });
}

export async function updateCertifications(contactId: string, certifications: Certification[]) {
  const items = await Promise.all(certifications.map(async ({ certificate, ...rest }) => ({
    ...rest,
    certificate_name: certificate?.name ?? null,
    certificate: certificate ? await toJsonUploadFile(certificate) : null,
  })));
  return request<{ success: boolean }>('/certifications', {
    method: 'PUT',
    body: JSON.stringify({
      contact_id: contactId,
      certifications: items,
      certificate_files: items.map((item) => item.certificate).filter(Boolean),
    }),
  });
}

export async function updateWorkSetup(contactId: string, w: WorkSetup, _deviceSpecUrl = '') {
  const specs = w.systemSpecs ?? { cpu: '', ram: '', storage: '', source: '' };
  const primaryDeviceScreenshots = await toJsonUploadFiles(w.deviceScreenshots ?? []);
  const secondaryDeviceScreenshots = await toJsonUploadFiles(w.secondaryDeviceScreenshots ?? []);
  return request<{ success: boolean }>('/work-setup', {
    method: 'PUT',
    body: JSON.stringify({
      contact_id: contactId,
      primary_device: w.primaryDevice,
      secondary_device: w.secondaryDevice,
      has_noise_cancelling_headset: w.hasNoiseCancellingHeadset,
      has_hd_webcam: w.hasHDWebcam,
      primary_internet_provider: w.primaryInternetProvider,
      secondary_internet_provider: w.secondaryInternetProvider,
      primary_isp_speedtest: w.primaryISPSpeedtest ?? '',
      secondary_isp_speedtest: w.secondaryISPSpeedtest ?? '',
      detected_cpu: specs.cpu,
      detected_ram: specs.ram,
      detected_storage: specs.storage,
      detection_source: specs.source,
      detection_consent: !!specs.source,
      primary_device_screenshot_names: fileNames(w.deviceScreenshots ?? []),
      primary_device_screenshots: primaryDeviceScreenshots,
      secondary_device_screenshot_names: fileNames(w.secondaryDeviceScreenshots ?? []),
      secondary_device_screenshots: secondaryDeviceScreenshots,
    }),
  });
}

// ------------------------ ATTENDANCE ------------------------

export type AttendanceAction = 'login' | 'logout';
export type AttendanceAvailability =
  | 'available for training only'
  | 'available for client matching only'
  | 'available for both client and training';


export async function submitAttendance(
  contactId: string,
  action: AttendanceAction,
  availability: AttendanceAvailability | '',
  date: string,
) {
  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL is not configured. Edit your .env file.');
  }
  const loginStatus =
    action === 'logout'
      ? 'Logged Out'
      : availability
        ? `Logged In - ${availability}`
        : 'Logged In';
  const res = await fetch(`${API_BASE}${PREFIX}/attendance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact_id: contactId,
      login_status: loginStatus,
      action,
      availability,
      date,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Attendance request failed (${res.status})`);
  }
  return (await res.json().catch(() => ({}))) as { success?: boolean };
}


export interface ComplianceUrls {
  validIdUrl?: string;
  nbiClearanceUrl?: string;
  nbiValidity?: string;
  policeClearanceUrl?: string;
  policeValidity?: string;
  proofOfSeparationUrl?: string;
}

export async function updateCompliance(contactId: string, c: ComplianceData, urls: ComplianceUrls = {}) {
  return request<{ success: boolean }>('/compliance', {
    method: 'PUT',
    body: JSON.stringify({
      contact_id: contactId,
      background_check_authorized: c.authorizeBackgroundCheck,
      nbi_validity: urls.nbiValidity ?? c.nbiValidity,
      police_validity: urls.policeValidity ?? c.policeValidity,
      valid_id: c.validId ? await toJsonUploadFile(c.validId) : null,
      valid_id_file_name: c.validId?.name ?? '',
      nbi_clearance: c.nbiClearance ? await toJsonUploadFile(c.nbiClearance) : null,
      nbi_clearance_file_name: c.nbiClearance?.name ?? '',
      police_clearance: c.policeClearance ? await toJsonUploadFile(c.policeClearance) : null,
      police_clearance_file_name: c.policeClearance?.name ?? '',
      proof_of_separation: c.proofOfSeparation ? await toJsonUploadFile(c.proofOfSeparation) : null,
      proof_of_separation_file_name: c.proofOfSeparation?.name ?? '',
      valid_id_url: urls.validIdUrl ?? '',
      nbi_clearance_url: urls.nbiClearanceUrl ?? '',
      police_clearance_url: urls.policeClearanceUrl ?? '',
      proof_of_separation_url: urls.proofOfSeparationUrl ?? '',
    }),
  });
}

export async function submitComplianceDocs(input: {
  email: string;
  nbiClearance: File | null;
  nbiValidity: string;
  policeClearance: File | null;
  policeValidity: string;
  coe: File | null;
}) {
  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL is not configured. Edit your .env file.');
  }
  const body: Record<string, unknown> = { email: input.email };
  if (input.nbiClearance) {
    body.nbi_clearance = await toJsonUploadFile(input.nbiClearance);
    body.nbi_clearance_file_name = input.nbiClearance.name;
  }
  if (input.nbiValidity) body.nbi_validity = input.nbiValidity;
  if (input.policeClearance) {
    body.police_clearance = await toJsonUploadFile(input.policeClearance);
    body.police_clearance_file_name = input.policeClearance.name;
  }
  if (input.policeValidity) body.police_validity = input.policeValidity;
  if (input.coe) {
    body.proof_of_separation = await toJsonUploadFile(input.coe);
    body.proof_of_separation_file_name = input.coe.name;
  }
  const res = await fetch(`${API_BASE}${PREFIX}/update_compliance_docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const j = await res.json(); detail = j?.detail ?? detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return (await res.json().catch(() => ({}))) as { success?: boolean };
}

// ------------------------ READS ------------------------

export function getProfile(contactId: string) {
  return request<Record<string, unknown>>(`/profile/${contactId}`, { method: 'GET' });
}

export function getApplicants(page = 1, limit = 50, startAfter = '') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (startAfter) params.set('start_after', startAfter);
  return request<{
    count: number;
    page?: number;
    total?: number;
    total_pages?: number;
    has_more?: boolean;
    start_after?: string;
    data: Array<{ id: string; name: string; email: string }>;
  }>(`/applicants?${params.toString()}`, { method: 'GET' });
}

export function getApplicant(contactId: string) {
  return request<{
    id: string;
    name: string;
    email: string;
    phone: string;
    custom_fields: Record<string, string>;
  }>(`/applicants/${contactId}`, { method: 'GET' });
}

/** A file reference returned by the backend — either a bare URL or an object. */
export type BackendFile = string | { url?: string; name?: string; file_name?: string };

export interface DashboardResponse {
  id: string;
  email: string;
  /** Top-level profile photo URL. */
  profile_picture?: string | null;
  /** ISO date (YYYY-MM-DD) when the applicant last applied. */
  date_applied?: string;
  /** ISO date/timestamp of the last profile change. */
  last_update_changes?: string | null;
  /** "Yes" | "No" | null — gates the dashboard Assessment card. */
  can_do_assessment?: string | null;
  /** Backend contact tags — drive the Notifications card. */
  tag?: string[];
  personal_info: {
    first_name?: string; middle_name?: string; last_name?: string; suffix?: string | null;
    date_of_birth?: string | null; phone?: string;
    street?: string | null; barangay?: string | null; city?: string | null;
    country?: string | null; nationality?: string; languages?: string;
    address?: string | null;
    'Referred By'?: string | null;
    Social_Link?: string | null;
    [k: string]: unknown;
  };
  education: { education_level?: string; school_name?: string; school_location?: string; graduation_date?: string; degree?: string };
  professional_background: { preferred_industry?: string; preferred_role?: string; preferred_bio?: string | null; availability?: string; hours_per_day?: string };
  work_experience: Array<Record<string, unknown>>;
  tools: Array<Record<string, unknown>>;
  skills: {
    items?: Array<Record<string, unknown>>;
    structured?: Array<Record<string, unknown>>;
    value_proposition?: string;
  };
  portfolio: { link?: string; files?: BackendFile[] };
  certifications: Array<Record<string, unknown>>;
  work_setup: {
    primary_device?: string; secondary_device?: string;
    has_noise_cancelling_headset?: string; has_hd_webcam?: string;
    primary_internet_provider?: string; secondary_internet_provider?: string;
    primary_internet_provider_sharable_link?: string;
    secondary_internet_provider_sharable_link?: string;
    device_spec?: BackendFile[];
    device_spec_files?: BackendFile[];
    detected_cpu?: string; detected_ram?: string; detected_storage?: string;
    detection_consent?: string; detection_source?: string;
    [k: string]: unknown;
  };
  compliance: {
    background_check?: string;
    valid_id?: string;
    valid_id_files?: BackendFile[];
    nbi_clearance_files?: BackendFile[];
    nbi_validity?: string;
    police_clearance_files?: BackendFile[];
    police_validity?: string;
    COE?: string | BackendFile[];
    [k: string]: unknown;
  };
  custom_fields_raw?: Array<{ id: string; value: string }>;
}


export function getDashboard(contactId: string) {
  return request<DashboardResponse>(`/dashboard/${contactId}`, { method: 'GET' });
}

/** Look up a contact by email via the dashboard endpoint. */
export function getDashboardByEmail(email: string) {
  return request<DashboardResponse>(`/dashboard/${encodeURIComponent(email)}`, { method: 'GET' });
}

// ------------------------ VALUES ASSESSMENT ------------------------

export interface ValuesAssessmentPayload {
  contact_id?: string;
  email?: string;
  scores: Record<string, number>;
  /** Optional raw ranked answers for backend storage / auditing. */
  answers?: Array<{ question: string; ranked: Array<{ type: string; value: string }> }>;
}

export function submitValuesAssessment(payload: ValuesAssessmentPayload) {
  return request<{ success: boolean }>('/values_assessment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface AssessmentResultResponse {
  firstName?: string;
  lastName?: string;
  /** Backend returns a single "name" field like "First Last". */
  name?: string;
  email?: string;
  contact_id?: string;
  /** Legacy shape — some payloads return scores at the root. */
  scores?: Record<string, number>;
  /** Current shape — scores nested under values_assessment. */
  values_assessment?: {
    scores?: Record<string, number>;
    result?: string;
    [k: string]: unknown;
  };
}

export function getAssessmentResult(cid: string) {
  const q = encodeURIComponent(cid);
  return request<AssessmentResultResponse>(`/assessment_result?cid=${q}`, { method: 'GET' });
}

// ------------------------ HELPERS ------------------------

export const CONTACT_ID_KEY = 'cb_contact_id';

export function saveContactId(id: string) {
  try { localStorage.setItem(CONTACT_ID_KEY, id); } catch { /* ignore */ }
}
export function loadContactId(): string | null {
  try { return localStorage.getItem(CONTACT_ID_KEY); } catch { return null; }
}
export function clearContactId() {
  try { localStorage.removeItem(CONTACT_ID_KEY); } catch { /* ignore */ }
}

// ------------------------ APPLICANT IDENTITY (session) ------------------------
//
// Cached in sessionStorage so the IMX assessment step can always populate
// `fname`, `lname`, `email` on `launch_values` / `launch_disc` without asking
// the user again. Populated by the wizard (after Personal Info) and the
// dashboard (after the profile fetch).
export const APPLICANT_IDENTITY_KEY = 'cb_applicant_identity';

export interface ApplicantIdentity {
  email: string;
  firstName: string;
  lastName: string;
}

export function saveApplicantIdentity(id: Partial<ApplicantIdentity>) {
  try {
    const prev = loadApplicantIdentity() ?? { email: '', firstName: '', lastName: '' };
    const next: ApplicantIdentity = {
      email: id.email ?? prev.email ?? '',
      firstName: id.firstName ?? prev.firstName ?? '',
      lastName: id.lastName ?? prev.lastName ?? '',
    };
    sessionStorage.setItem(APPLICANT_IDENTITY_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function loadApplicantIdentity(): ApplicantIdentity | null {
  try {
    const raw = sessionStorage.getItem(APPLICANT_IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApplicantIdentity>;
    return {
      email: parsed.email ?? '',
      firstName: parsed.firstName ?? '',
      lastName: parsed.lastName ?? '',
    };
  } catch { return null; }
}

export function clearApplicantIdentity() {
  try { sessionStorage.removeItem(APPLICANT_IDENTITY_KEY); } catch { /* ignore */ }
}

/** Submit the per-substep payload that matches the backend contract. */
export async function submitSubstep(
  contactId: string,
  substep: number,
  data: ApplicationData,
  referrer = '',
): Promise<void> {
  // Wizard substep order (Index.tsx):
  // 1 Personal · 2 Education · 3 ProfBg · 4 WorkExp · 5 Tools · 6 Skills ·
  // 7 Portfolio · 8 Certifications · 9 ValueProposition · 10 WorkSetup · 11 Compliance
  switch (substep) {
    case 1: await updatePersonalInfo(contactId, data.personalInfo, referrer); return;
    case 2: await updateEducation(contactId, data.education); return;
    case 3: await updateProfessionalBackground(contactId, data.professionalBackground); return;
    case 4: await updateWorkExperience(contactId, data.workExperiences); return;
    case 5: await updateToolsPlatforms(contactId, data.selectedTools); return;
    case 6: await updateSkills(contactId, data.selectedSkills, data.personalInfo.valueProposition); return;
    case 7: await updatePortfolio(contactId, data.portfolioLink, fileNames(data.portfolioFiles), data.portfolioFiles); return;
    case 8: await updateCertifications(contactId, data.certifications); return;
    case 9: await updateValueProposition(contactId, data.personalInfo.valueProposition); return;
    case 10: await updateWorkSetup(contactId, data.workSetup); return;
    case 11: await updateCompliance(contactId, data.compliance); return;
  }
}

// ------------------------ ADMIN: ROLE FORMULAS & ASSESSMENT LINK ------------------------

import type { RoleFormula } from '@/data/valueDimensions';

export async function getRoleFormulas(): Promise<RoleFormula[]> {
  return request<RoleFormula[]>('/admin/role-formulas', { method: 'GET' });
}

export async function saveRoleFormulas(formulas: RoleFormula[]): Promise<void> {
  await request<{ ok: true }>('/admin/role-formulas', {
    method: 'PUT',
    body: JSON.stringify({ formulas }),
  });
}

export async function getAssessmentLink(): Promise<{ url: string; uses: number }> {
  return request<{ url: string; uses: number }>('/admin/assessment-link', { method: 'GET' });
}

export async function saveAssessmentLink(url: string): Promise<void> {
  await request<{ ok: true }>('/admin/assessment-link', {
    method: 'PUT',
    body: JSON.stringify({ url }),
  });
}

// ------------------------ IMX ASSESSMENT (FastAPI proxy) ------------------------
//
// All IMX (InnerMetrix) traffic must go through the FastAPI backend under the
// `/api/v1/values_assessment` prefix — the browser must never talk to IMX
// directly. `generate_codes` is idempotent: calling it repeatedly for the same
// user returns the existing code, so refreshing the page can never create a
// duplicate assessment.

const IMX_PREFIX = '/api/v1/values_assessment';

function imxUrl(path: string): string {
  return `${API_BASE}${IMX_PREFIX}${path}`;
}

async function imxRequest<T>(path: string, init: RequestInit): Promise<T> {
  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL is not configured. Edit your .env file.');
  }
  const res = await fetch(imxUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j?.detail ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export interface ImxLaunchResponse {
  assessment_url: string;
}

export interface ImxLaunchParams {
  code: string;
  fname: string;
  lname: string;
  email: string;
  contact_id: string;
  complete_url?: string;
  lang?: string;
}

function requireContactId(contactId: string): string {
  if (!contactId || !contactId.trim()) {
    throw new Error('contact_id is required for IMX assessment requests.');
  }
  return contactId;
}

function withContactId(code: string, contactId: string): string {
  return `${encodeURIComponent(code)}?contact_id=${encodeURIComponent(requireContactId(contactId))}`;
}

/**
 * Generate IMX assessment codes. Backend proxies IMX's `/generate_code/` which
 * returns freshly-minted codes but does NOT associate them with a user — the
 * frontend must cache the returned code per user in localStorage. We always
 * send `contact_id` so the backend can associate the code with the applicant.
 *
 * Prefixes: `"VI"` = Values, `"DI"` = DISC, `"AI"` = Attribute Index.
 */
export async function generateAssessmentCodes(
  prefix: 'VI' | 'DI' | 'AI',
  count: number,
  contactId: string,
): Promise<string[]> {
  const raw = await imxRequest<unknown>('/generate_codes', {
    method: 'POST',
    body: JSON.stringify({ prefix, count, contact_id: requireContactId(contactId) }),
  });
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { codes?: unknown[] })?.codes)
      ? (raw as { codes: unknown[] }).codes
      : Array.isArray((raw as { data?: unknown[] })?.data)
        ? (raw as { data: unknown[] }).data
        : [];
  const codes = list
    .map((item) => (typeof item === 'string' ? item : (item as { code?: string })?.code))
    .filter((c): c is string => typeof c === 'string' && c.length > 0);
  if (codes.length === 0) {
    throw new Error('IMX did not return any assessment codes.');
  }
  return codes;
}

export async function generateValuesCode(contactId: string): Promise<string> {
  const [code] = await generateAssessmentCodes('VI', 1, contactId);
  return code;
}

export function launchValuesAssessment(params: ImxLaunchParams) {
  return imxRequest<ImxLaunchResponse>('/launch_values', {
    method: 'POST',
    body: JSON.stringify({ ...params, contact_id: requireContactId(params.contact_id) }),
  });
}

export function launchDiscAssessment(params: ImxLaunchParams) {
  return imxRequest<ImxLaunchResponse>('/launch_disc', {
    method: 'POST',
    body: JSON.stringify({ ...params, contact_id: requireContactId(params.contact_id) }),
  });
}

export function launchAiAssessment(params: ImxLaunchParams & { ai_report?: number }) {
  return imxRequest<ImxLaunchResponse>('/launch_ai', {
    method: 'POST',
    body: JSON.stringify({ ...params, contact_id: requireContactId(params.contact_id) }),
  });
}

export function getValuesResults(code: string, contactId: string) {
  return imxRequest<unknown>(`/values/results/${withContactId(code, contactId)}`, {
    method: 'GET',
  });
}

/**
 * IMX's rawscores endpoint has no explicit `completed` flag; when the taker
 * hasn't finished, it typically returns an empty object or empty arrays. Treat
 * any response with at least one numeric score / non-empty result bucket as
 * complete.
 */
function isImxResultCompleted(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (r.completed === true) return true;
  const buckets: unknown[] = [r.scores, r.rawscores, r.raw_scores, r.dimensions, r.results, r.data];
  for (const b of buckets) {
    if (Array.isArray(b) && b.length > 0) return true;
    if (b && typeof b === 'object' && Object.keys(b as object).length > 0) return true;
  }
  return Object.values(r).some((v) => typeof v === 'number');
}

export const isValuesResultCompleted = isImxResultCompleted;
export const isDiscResultCompleted = isImxResultCompleted;

export function getValuesReportUrl(code: string, contactId: string): string {
  return imxUrl(`/values/report/${withContactId(code, contactId)}`);
}

// ------------------------ DISC ------------------------

export async function generateDiscCode(contactId: string): Promise<string> {
  const [code] = await generateAssessmentCodes('DI', 1, contactId);
  return code;
}

export function getDiscResults(code: string, contactId: string) {
  return imxRequest<unknown>(`/disc/results/${withContactId(code, contactId)}`, {
    method: 'GET',
  });
}

export function getDiscReportUrl(code: string, contactId: string): string {
  return imxUrl(`/disc/report/${withContactId(code, contactId)}`);
}

// ------------------------ Standalone US Assessment ------------------------
//
// Creates a lightweight contact for the /assessment page (no full wizard).
// Returns the backend `contact_id` we then thread through every IMX call.

export interface UsAssessmentResponse {
  contact_id: string;
  [key: string]: unknown;
}

export class ApiStatusError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiStatusError';
    this.status = status;
  }
}

async function createAssessmentContact(
  path: string,
  payload: { email: string; firstname: string; lastname: string },
): Promise<UsAssessmentResponse> {
  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL is not configured. Edit your .env file.');
  }
  const res = await fetch(`${API_BASE}${PREFIX}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const j = await res.json(); detail = j?.detail ?? detail; } catch { /* ignore */ }
    throw new ApiStatusError(detail, res.status);
  }
  const data = (await res.json()) as UsAssessmentResponse;
  if (data?.success === false) {
    throw new ApiStatusError('You are not eligible to access the Assessment', 403);
  }
  if (!data?.contact_id) {
    throw new Error('Server did not return a contact_id.');
  }
  return data;
}

export function createUsAssessmentContact(payload: {
  email: string;
  firstname: string;
  lastname: string;
}): Promise<UsAssessmentResponse> {
  return createAssessmentContact('/us-assessment', payload);
}

/** PH assessment gate — 403/404 means the applicant is not eligible. */
export function createPhAssessmentContact(payload: {
  email: string;
  firstname: string;
  lastname: string;
}): Promise<UsAssessmentResponse> {
  return createAssessmentContact('/ph-assessment', payload);
}




