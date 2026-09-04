import { useCallback, useEffect, useState } from 'react';

/**
 * Yes/No "do you have any…" answers for the optional profile sections.
 * Stored in sessionStorage so both the wizard steps and the dashboard
 * gating logic can read the same answer without prop-drilling.
 */
export type SkipKey =
  | 'workExperience'
  | 'tools'
  | 'skills'
  | 'portfolio'
  | 'certifications';

const EVENT = 'cb-skip-answer-changed';
const storageKey = (key: SkipKey) => `cb_skip_${key}`;

export function getSkipAnswer(key: SkipKey): boolean | null {
  try {
    const v = sessionStorage.getItem(storageKey(key));
    if (v === 'yes') return true;
    if (v === 'no') return false;
  } catch { /* ignore */ }
  return null;
}

export function setSkipAnswer(key: SkipKey, value: boolean | null): void {
  try {
    if (value === null) sessionStorage.removeItem(storageKey(key));
    else sessionStorage.setItem(storageKey(key), value ? 'yes' : 'no');
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
  } catch { /* ignore */ }
}

export function clearSkipAnswers(): void {
  (['workExperience', 'tools', 'skills', 'portfolio', 'certifications'] as SkipKey[])
    .forEach((k) => setSkipAnswer(k, null));
}

/** Reactive read/write of a single skip answer. */
export function useSkipAnswer(
  key: SkipKey,
  hasData = false,
): [boolean | null, (value: boolean | null) => void] {
  const [answer, setAnswer] = useState<boolean | null>(() => {
    const stored = getSkipAnswer(key);
    if (stored !== null) return stored;
    return hasData ? true : null;
  });

  // Adopt "yes" as soon as data shows up (e.g. loaded from the backend).
  useEffect(() => {
    if (hasData && getSkipAnswer(key) === null) setAnswer(true);
  }, [hasData, key]);

  useEffect(() => {
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail !== key) return;
      setAnswer(getSkipAnswer(key));
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [key]);

  const update = useCallback((value: boolean | null) => {
    setSkipAnswer(key, value);
    setAnswer(value);
  }, [key]);

  return [answer, update];
}

/** Subscribe to every skip answer at once — used by the dashboard gating. */
export function useAllSkipAnswers(): Record<SkipKey, boolean | null> {
  const read = (): Record<SkipKey, boolean | null> => ({
    workExperience: getSkipAnswer('workExperience'),
    tools: getSkipAnswer('tools'),
    skills: getSkipAnswer('skills'),
    portfolio: getSkipAnswer('portfolio'),
    certifications: getSkipAnswer('certifications'),
  });
  const [answers, setAnswers] = useState(read);
  useEffect(() => {
    const onChange = () => setAnswers(read());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return answers;
}
