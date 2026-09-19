import type { ApplicationData, PersonalInfo, Education, ProfessionalBackground, WorkSetup, ComplianceData, SelectedSkill, SelectedTool } from '@/types/application';

export function isToolsValid(tools: SelectedTool[]): boolean { return Array.isArray(tools) && tools.length > 0; }
export function isSkillsValid(skills: SelectedSkill[]): boolean { return Array.isArray(skills) && skills.length > 0; }

const nonEmpty = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

export function isPersonalInfoValid(p: PersonalInfo): boolean {
  const base = nonEmpty(p.firstName)
    && nonEmpty(p.lastName)
    && nonEmpty(p.dateOfBirth)
    && nonEmpty(p.phoneNumber)
    && nonEmpty(p.languagesSpoken)
    && nonEmpty(p.country)
    && nonEmpty(p.nationality);
  if (!base) return false;
  if (p.country === 'Philippines') {
    return nonEmpty(p.houseStreet) && nonEmpty(p.city) && nonEmpty(p.barangay);
  }
  return nonEmpty(p.address);
}

/**
 * Normalize any stored graduation value to "MM/YYYY".
 * Accepts ISO ("2021-05-20", "2021-05"), "MM/YYYY", partials ("05/", "/2021").
 * Returns "" when it cannot be parsed into a month+year pair.
 */
export function normalizeGraduation(value: string | undefined | null): string {
  const v = (value || '').trim();
  if (!v) return '';
  const iso = v.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (iso) return `${iso[2]}/${iso[1]}`;
  const mmYyyy = v.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYyyy) return `${mmYyyy[1].padStart(2, '0')}/${mmYyyy[2]}`;
  return '';
}

/** Graduation dates are stored as "MM/YYYY" — partials like "05/" are incomplete. */
export function isGraduationComplete(value: string | undefined): boolean {
  return /^(0[1-9]|1[0-2])\/\d{4}$/.test(normalizeGraduation(value));
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Human-readable graduation label, e.g. "May 2021". Empty when unparseable. */
export function formatGraduation(value: string | undefined | null): string {
  const norm = normalizeGraduation(value);
  if (!norm) return '';
  const [mm, yyyy] = norm.split('/');
  const name = MONTH_NAMES[Number(mm) - 1];
  return name ? `${name} ${yyyy}` : norm;
}


export function isEducationValid(e: Education): boolean {
  const isUndergrad = /undergraduate|currently/i.test(e.highestLevel || '');
  const grad = (e.graduationDate || '').trim();
  const gradOk = isUndergrad
    ? grad === '' || isGraduationComplete(grad)
    : isGraduationComplete(grad);
  const base = nonEmpty(e.highestLevel)
    && nonEmpty(e.schoolName)
    && nonEmpty(e.schoolLocation)
    && gradOk;
  if (!base) return false;
  if (e.highestLevel === 'High School Graduate') return true;
  if (e.degreeField === 'Other') return nonEmpty(e.degreeFieldOther);
  return nonEmpty(e.degreeField);
}

export function isProfessionalValid(p: ProfessionalBackground): boolean {
  return nonEmpty(p.preferredIndustry)
    && nonEmpty(p.preferredRole)
    && nonEmpty(p.schedule || p.availability);
}

export function isValuePropositionValid(vp: string): boolean {
  return nonEmpty(vp);
}

/** Only speedtest.net result links are accepted for ISP speedtest fields. */
export const SPEEDTEST_URL_RE = /^(https?:\/\/)?(www\.)?speedtest\.net\//i;

export function isSpeedtestUrl(v: string | undefined | null): boolean {
  return !!v && SPEEDTEST_URL_RE.test(v.trim());
}

export function isWorkSetupValid(w: WorkSetup): boolean {
  return nonEmpty(w.primaryDevice)
    && (w.deviceScreenshots?.length ?? 0) > 0
    && nonEmpty(w.primaryInternetProvider)
    && isSpeedtestUrl(w.primaryISPSpeedtest)
    && (!nonEmpty(w.secondaryISPSpeedtest) || isSpeedtestUrl(w.secondaryISPSpeedtest));
}

/** Device tab only: minimum fields needed before advancing to the ISP tab. */
export function isWorkSetupDeviceTabValid(w: WorkSetup): boolean {
  return nonEmpty(w.primaryDevice) && (w.deviceScreenshots?.length ?? 0) > 0;
}

export function isComplianceValid(c: ComplianceData): boolean {
  return !!c.validId;
}

export function isSubStepValid(subStep: number, values: ApplicationData): boolean {
  switch (subStep) {
    case 1: return isPersonalInfoValid(values.personalInfo);
    case 2: return isEducationValid(values.education);
    case 3: return isProfessionalValid(values.professionalBackground);
    case 9: return isValuePropositionValid(values.personalInfo.valueProposition);
    case 10: {
      const w = values.workSetup;
      // On the Device tab, only require device-side fields so the user can
      // advance to the ISP tab. On the ISP tab, enforce full validation.
      const tab = (w as WorkSetup & { activeTab?: 'device' | 'isp' }).activeTab ?? 'device';
      return tab === 'device' ? isWorkSetupDeviceTabValid(w) : isWorkSetupValid(w);
    }
    case 11: return isComplianceValid(values.compliance);
    default: return true;
  }
}

/** Map a Dashboard section key to the substep whose validation rules apply. */
export const SECTION_TO_SUBSTEP: Record<string, number> = {
  personal: 1,
  education: 2,
  professional: 3,
  valueProp: 9,
  workSetup: 10,
  compliance: 11,
};

/**
 * Field keys that are required but still blank, so the UI can highlight every
 * missing field instead of guessing at the first empty input on the page.
 */
export function missingPersonalInfoFields(p: PersonalInfo): string[] {
  const out: string[] = [];
  if (!nonEmpty(p.firstName)) out.push('firstName');
  if (!nonEmpty(p.lastName)) out.push('lastName');
  if (!nonEmpty(p.dateOfBirth)) out.push('dateOfBirth');
  if (!nonEmpty(p.phoneNumber)) out.push('phoneNumber');
  if (!nonEmpty(p.languagesSpoken)) out.push('languagesSpoken');
  if (!nonEmpty(p.country)) out.push('country');
  if (!nonEmpty(p.nationality)) out.push('nationality');
  if (p.country === 'Philippines') {
    if (!nonEmpty(p.houseStreet)) out.push('houseStreet');
    if (!nonEmpty(p.city)) out.push('city');
    if (!nonEmpty(p.barangay)) out.push('barangay');
  } else if (nonEmpty(p.country)) {
    if (!nonEmpty(p.address)) out.push('address');
    if (!nonEmpty(p.city)) out.push('city');
  }
  return out;
}

export function missingEducationFields(e: Education): string[] {
  const out: string[] = [];
  if (!nonEmpty(e.highestLevel)) out.push('highestLevel');
  if (!nonEmpty(e.schoolName)) out.push('schoolName');
  if (!nonEmpty(e.schoolLocation)) out.push('schoolLocation');
  const isUndergrad = /undergraduate|currently/i.test(e.highestLevel || '');
  const grad = (e.graduationDate || '').trim();
  const gradOk = isUndergrad ? grad === '' || isGraduationComplete(grad) : isGraduationComplete(grad);
  if (!gradOk) out.push('graduationDate');
  if (e.highestLevel !== 'High School Graduate') {
    if (!nonEmpty(e.degreeField)) out.push('degreeField');
    else if (e.degreeField === 'Other' && !nonEmpty(e.degreeFieldOther)) out.push('degreeField');
  }
  return out;
}

export function missingProfessionalFields(p: ProfessionalBackground): string[] {
  const out: string[] = [];
  if (!nonEmpty(p.preferredIndustry)) out.push('preferredIndustry');
  if (!nonEmpty(p.preferredRole)) out.push('preferredRole');
  if (!nonEmpty(p.schedule || p.availability)) out.push('schedule');
  return out;
}
