import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  generateValuesCode,
  generateDiscCode,
  launchValuesAssessment,
  launchDiscAssessment,
  getValuesResults,
  getDiscResults,
  isValuesResultCompleted,
  isDiscResultCompleted,
  loadApplicantIdentity,
} from '@/lib/apiClient';
import type { AssessmentQuestion } from '@/data/valuesAssessment';

/**
 * IMX (InnerMetrix) Assessment step — embeds Values then DISC via iframe.
 *
 * All traffic goes through the FastAPI backend. Codes are cached in
 * `localStorage` per-user so refresh reuses the same assessment. The Download
 * PDF button is intentionally NOT shown here — that's admin-only.
 */

type Phase = 'loading' | 'error' | 'values' | 'disc' | 'completed';

export type AssessmentPhase = 'loading' | 'error' | 'values' | 'disc' | 'completed';

export interface AssessmentStepHandle {
  /**
   * Ask the current phase whether it's complete.
   * - Returns `'advance'` when the wizard/dashboard should move on
   *   (values→disc transitions are handled internally as `'stay'`).
   * - Returns `'stay'` when we handled the transition ourselves.
   * - Returns `'incomplete'` when the underlying IMX result is not yet ready.
   * - Returns `'error'` on network failure.
   */
  checkAndAdvance: () => Promise<'advance' | 'stay' | 'incomplete' | 'error'>;
  /** True when both Values and DISC are done. */
  isFullyComplete: () => boolean;
  /** Current internal phase. */
  getPhase: () => AssessmentPhase;
}

interface AssessmentStepProps {
  contactId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  /** Called when both Values and DISC are confirmed complete. */
  onCompleted?: () => void;
  /** Fires whenever the internal phase changes. */
  onPhaseChange?: (phase: AssessmentPhase) => void;
}

const codeCacheKey = (kind: 'values' | 'disc', contactId: string) =>
  `cb_imx_${kind}_code_${contactId}`;
const doneCacheKey = (kind: 'values' | 'disc', contactId: string) =>
  `cb_imx_${kind}_done_${contactId}`;

const readCached = (key: string): string => {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
};
const writeCached = (key: string, val: string) => {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
};

/** Derive fname/lname from an email local-part as a last-resort fallback. */
const deriveNames = (email?: string): { fname: string; lname: string } => {
  const local = (email ?? '').split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const fname = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : 'Applicant';
  const lname = parts[1] ? parts[1][0].toUpperCase() + parts[1].slice(1) : 'User';
  return { fname, lname };
};

const AssessmentStep = forwardRef<AssessmentStepHandle, AssessmentStepProps>(({
  contactId,
  email,
  firstName,
  lastName,
  onCompleted,
}, ref) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [valuesCode, setValuesCode] = useState<string>('');
  const [discCode, setDiscCode] = useState<string>('');
  const [valuesUrl, setValuesUrl] = useState<string>('');
  const [discUrl, setDiscUrl] = useState<string>('');
  const [valuesDone, setValuesDone] = useState(false);
  const [discDone, setDiscDone] = useState(false);
  const completedNotifiedRef = useRef(false);

  const notifyCompleted = useCallback(() => {
    if (completedNotifiedRef.current) return;
    completedNotifiedRef.current = true;
    onCompleted?.();
  }, [onCompleted]);

  /** Resolve fname/lname/email from props → session → derivation. */
  const resolveIdentity = useCallback(() => {
    const stored = loadApplicantIdentity();
    const resolvedEmail =
      (email && email.trim()) || (stored?.email ?? '') || '';
    const resolvedFirst =
      (firstName && firstName.trim()) || (stored?.firstName ?? '') || '';
    const resolvedLast =
      (lastName && lastName.trim()) || (stored?.lastName ?? '') || '';
    const derived = deriveNames(resolvedEmail);
    return {
      fname: resolvedFirst || derived.fname,
      lname: resolvedLast || derived.lname,
      email: resolvedEmail,
    };
  }, [email, firstName, lastName]);

  // Bootstrap: figure out where we are (values / disc / completed).
  useEffect(() => {
    if (!contactId) {
      setPhase('error');
      setErrorMsg('You must be signed in to start the assessment.');
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        setPhase('loading');
        const identity = resolveIdentity();

        // Read cached done flags first so refreshes skip finished sub-tests.
        const cachedValuesDone = readCached(doneCacheKey('values', contactId)) === '1';
        const cachedDiscDone = readCached(doneCacheKey('disc', contactId)) === '1';
        setValuesDone(cachedValuesDone);
        setDiscDone(cachedDiscDone);

        // ------ Values ------
        let vCode = readCached(codeCacheKey('values', contactId));
        if (!vCode) {
          vCode = await generateValuesCode(contactId);
          if (cancelled) return;
          writeCached(codeCacheKey('values', contactId), vCode);
        }
        setValuesCode(vCode);

        // If Values was already marked done, skip its launch.
        let valuesFinished = cachedValuesDone;
        if (!valuesFinished) {
          // Opportunistically check whether the taker already finished.
          try {
            const existing = await getValuesResults(vCode, contactId);
            if (!cancelled && isValuesResultCompleted(existing)) {
              valuesFinished = true;
              setValuesDone(true);
              writeCached(doneCacheKey('values', contactId), '1');
            }
          } catch { /* not started yet */ }
        }

        if (!valuesFinished) {
          const launch = await launchValuesAssessment({
            code: vCode,
            fname: identity.fname,
            lname: identity.lname,
            email: identity.email,
            contact_id: contactId,
          });
          if (cancelled) return;
          setValuesUrl(launch.assessment_url);
          setPhase('values');
          return;
        }

        // ------ DISC ------
        let dCode = readCached(codeCacheKey('disc', contactId));
        if (!dCode) {
          dCode = await generateDiscCode(contactId);
          if (cancelled) return;
          writeCached(codeCacheKey('disc', contactId), dCode);
        }
        setDiscCode(dCode);

        let discFinished = cachedDiscDone;
        if (!discFinished) {
          try {
            const existing = await getDiscResults(dCode, contactId);
            if (!cancelled && isDiscResultCompleted(existing)) {
              discFinished = true;
              setDiscDone(true);
              writeCached(doneCacheKey('disc', contactId), '1');
            }
          } catch { /* not started yet */ }
        }

        if (!discFinished) {
          const launch = await launchDiscAssessment({
            code: dCode,
            fname: identity.fname,
            lname: identity.lname,
            email: identity.email,
            contact_id: contactId,
          });
          if (cancelled) return;
          setDiscUrl(launch.assessment_url);
          setPhase('disc');
          return;
        }

        // Both finished.
        setPhase('completed');
        notifyCompleted();
      } catch (e) {
        if (cancelled) return;
        setPhase('error');
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load the assessment.');
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  /** Advance from `values` to `disc` after Values is confirmed complete. */
  const startDiscPhase = useCallback(async () => {
    if (!contactId) return;
    try {
      const identity = resolveIdentity();
      let dCode = readCached(codeCacheKey('disc', contactId));
      if (!dCode) {
        dCode = await generateDiscCode(contactId);
        writeCached(codeCacheKey('disc', contactId), dCode);
      }
      setDiscCode(dCode);
      const launch = await launchDiscAssessment({
        code: dCode,
        fname: identity.fname,
        lname: identity.lname,
        email: identity.email,
        contact_id: contactId,
      });
      setDiscUrl(launch.assessment_url);
      setPhase('disc');
    } catch (e) {
      setPhase('error');
      setErrorMsg(e instanceof Error ? e.message : 'Failed to start DISC assessment.');
    }
  }, [contactId, resolveIdentity]);

  useImperativeHandle(ref, () => ({
    isFullyComplete: () => valuesDone && discDone,
    checkAndAdvance: async () => {
      if (!contactId) return 'error';
      try {
        if (phase === 'values' || (phase === 'loading' && !valuesDone)) {
          if (!valuesCode) return 'incomplete';
          const raw = await getValuesResults(valuesCode, contactId);
          if (!isValuesResultCompleted(raw)) return 'incomplete';
          setValuesDone(true);
          writeCached(doneCacheKey('values', contactId), '1');
          await startDiscPhase();
          return 'stay';
        }
        if (phase === 'disc') {
          if (!discCode) return 'incomplete';
          const raw = await getDiscResults(discCode, contactId);
          if (!isDiscResultCompleted(raw)) return 'incomplete';
          setDiscDone(true);
          writeCached(doneCacheKey('disc', contactId), '1');
          setPhase('completed');
          notifyCompleted();
          return 'advance';
        }
        if (phase === 'completed') return 'advance';
        return 'incomplete';
      } catch {
        return 'error';
      }
    },
  }), [phase, valuesCode, discCode, valuesDone, discDone, contactId, startDiscPhase, notifyCompleted]);

  const stageLabel =
    phase === 'values' ? 'Step 1 of 2 · Values'
      : phase === 'disc' ? 'Step 2 of 2 · DISC'
        : phase === 'completed' ? 'Completed'
          : '';

  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold text-foreground">Assessment</p>
          {stageLabel && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
              {stageLabel}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Please complete the embedded assessment below. Your progress is saved automatically —
          if you close the page you can return later and pick up where you left off. Once
          you're done, click <span className="font-semibold text-foreground">Next</span> to
          continue.
        </p>
      </div>

      {phase === 'loading' && (
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm">Preparing your assessment…</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-destructive">Could not load the assessment</p>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </div>
      )}

      {phase === 'values' && valuesUrl && (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <iframe
            src={valuesUrl}
            title="Values Assessment"
            className="w-full h-[70vh] min-h-[520px] border-0"
            allow="fullscreen; clipboard-write"
          />
        </div>
      )}

      {phase === 'disc' && discUrl && (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <iframe
            src={discUrl}
            title="DISC Assessment"
            className="w-full h-[70vh] min-h-[520px] border-0"
            allow="fullscreen; clipboard-write"
          />
        </div>
      )}

      {phase === 'completed' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Assessment completed</p>
            <p className="text-sm text-muted-foreground">
              Thank you — your responses for both Values and DISC have been recorded. You may continue.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

AssessmentStep.displayName = 'AssessmentStep';

export default AssessmentStep;

// ---------------------------------------------------------------------------
// Backwards-compat exports for the legacy drag-and-drop callers. IMX owns
// scoring now, so these are no-ops kept only for type-safe imports.
// ---------------------------------------------------------------------------

export function buildInitialAssessment(): AssessmentQuestion[] {
  return [];
}

export function computeScores(_questions: AssessmentQuestion[]): Record<string, number> {
  return {};
}
