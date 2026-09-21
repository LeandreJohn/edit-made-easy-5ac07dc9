import { useCallback, useEffect, useState } from 'react';

/**
 * Yes/No "do you have any…" answers for the optional profile sections.
 * Answers live in sessionStorage for the current run and, once we know the
 * applicant's profile id, are mirrored to localStorage keyed by that id so a
 * "No" answer survives signing out and back in.
 */
export type SkipKey =
  | 'workExperience'
  | 'portfolio'
  | 'certifications';

const EVENT = 'cb-skip-answer-changed';
const storageKey = (key: SkipKey) => `cb_skip_${key}`;

/** Profile id read directly to avoid a circular import with the API client. */
function contactId(): string | null {
  try { return localStorage.getItem('cb_contact_id'); } catch { return null; }
}

const persistedKey = (key: SkipKey): string | null => {
  const id = contactId();
  return id ? `cb_skip_${id}_${key}` : null;
};

const parse = (v: string | null): boolean | null =>
  v === 'yes' ? true : v === 'no' ? false : null;

export function getSkipAnswer(key: SkipKey): boolean | null {
  try {
    const session = parse(sessionStorage.getItem(storageKey(key)));
    if (session !== null) return session;
  } catch { /* ignore */ }
  try {
    const pk = persistedKey(key);
    if (pk) return parse(localStorage.getItem(pk));
  } catch { /* ignore */ }
  return null;
}

export function setSkipAnswer(key: SkipKey, value: boolean | null): void {
  try {
    if (value === null) sessionStorage.removeItem(storageKey(key));
    else sessionStorage.setItem(storageKey(key), value ? 'yes' : 'no');
  } catch { /* ignore */ }
  try {
    const pk = persistedKey(key);
    if (pk) {
      if (value === null) localStorage.removeItem(pk);
      else localStorage.setItem(pk, value ? 'yes' : 'no');
    }
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
  } catch { /* ignore */ }
}

export function clearSkipAnswers(): void {
  (['workExperience', 'portfolio', 'certifications'] as SkipKey[])
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
