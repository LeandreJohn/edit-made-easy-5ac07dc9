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

export function isEducationValid(e: Education): boolean {
  const base = nonEmpty(e.highestLevel)
    && nonEmpty(e.schoolName)
    && nonEmpty(e.schoolLocation)
    && nonEmpty(e.graduationDate);
  if (!base) return false;
  if (e.highestLevel === 'High School Graduate') return true;
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

export function isWorkSetupValid(w: WorkSetup): boolean {
  return nonEmpty(w.primaryDevice)
    && (w.deviceScreenshots?.length ?? 0) > 0
    && nonEmpty(w.primaryInternetProvider)
    && nonEmpty(w.primaryISPSpeedtest);
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
