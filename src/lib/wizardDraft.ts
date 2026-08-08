import { defaultApplicationData } from '@/hooks/useApplicationForm';
import type { ApplicationData } from '@/types/application';

const DRAFT_KEY = 'cb_wizard_draft_v1';

/** Values that can never survive a page reload (File/Blob objects). */
const isFileLike = (v: unknown): boolean =>
  typeof File !== 'undefined' && v instanceof File
  || (typeof Blob !== 'undefined' && v instanceof Blob);

/** Deep-copy the form values, dropping File/Blob instances. */
function stripFiles(value: unknown): unknown {
  if (isFileLike(value)) return null;
  if (Array.isArray(value)) {
    return value.map(stripFiles).filter((v) => v !== null || false);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripFiles(v);
    }
    return out;
  }
  return value;
}

/** Merge a persisted draft over the defaults so new fields never break. */
function mergeDefaults<T>(base: T, saved: unknown): T {
  if (saved === undefined || saved === null) return base;
  if (Array.isArray(base)) return (Array.isArray(saved) ? saved : base) as T;
  if (base && typeof base === 'object') {
    if (typeof saved !== 'object' || Array.isArray(saved)) return base;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
      out[k] = k in (base as Record<string, unknown>)
        ? mergeDefaults((base as Record<string, unknown>)[k], v)
        : v;
    }
    return out as T;
  }
  return (saved as T) ?? base;
}

export interface WizardDraft {
  savedAt: number;
  values: ApplicationData;
}

export function saveWizardDraft(values: ApplicationData) {
  try {
    const payload = {
      savedAt: Date.now(),
      values: stripFiles({ ...values, password: '' }),
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — autosave is best-effort */
  }
}

export function loadWizardDraft(): WizardDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; values?: unknown };
    if (!parsed?.values) return null;
    return {
      savedAt: Number(parsed.savedAt) || Date.now(),
      values: mergeDefaults(defaultApplicationData, parsed.values),
    };
  } catch {
    return null;
  }
}

export function clearWizardDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

/** True when the draft holds anything the user actually typed. */
export function draftHasContent(values: ApplicationData): boolean {
  const p = values.personalInfo;
  return Boolean(
    p.firstName || p.lastName || p.phoneNumber || p.valueProposition
    || values.education.schoolName
    || values.professionalBackground.preferredRole
    || values.workExperiences.length
    || values.selectedSkills.length
    || values.selectedTools.length
    || values.certifications.length,
  );
}
