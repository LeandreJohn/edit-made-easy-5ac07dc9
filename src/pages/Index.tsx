import { useEffect, useMemo, useRef, useState } from 'react';
import { Home, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import WelcomeStep from '@/components/steps/WelcomeStep';
import PersonalInfoStep from '@/components/steps/PersonalInfoStep';
import EducationStep from '@/components/steps/EducationStep';
import ProfessionalBgStep from '@/components/steps/ProfessionalBgStep';
import WorkExperienceStep from '@/components/steps/WorkExperienceStep';
import ToolsStep from '@/components/steps/ToolsStep';
import SkillsStep from '@/components/steps/SkillsStep';
import ValuePropositionStep from '@/components/steps/ValuePropositionStep';
import PortfolioStep from '@/components/steps/PortfolioStep';
import CertificationsStep from '@/components/steps/CertificationsStep';
import WorkSetupStep, { WorkSetupStepHandle } from '@/components/steps/WorkSetupStep';
import ComplianceStep from '@/components/steps/ComplianceStep';
import AssessmentStep, { AssessmentStepHandle, AssessmentPhase } from '@/components/steps/ValuesAssessmentStep';
import CompletionStep from '@/components/steps/CompletionStep';
import WizardSidebar from '@/components/wizard/WizardSidebar';
import WizardNavigation from '@/components/wizard/WizardNavigation';
import IntroVideoModal from '@/components/wizard/IntroVideoModal';
import Footer from '@/components/Footer';
import { useApplicationForm, defaultApplicationData } from '@/hooks/useApplicationForm';
import { useStore } from '@tanstack/react-form';
// submitApplication endpoint intentionally removed — each substep persists on Next.
import {
  loadContactId,
  submitSubstep,
  finishApplication,
  todayMDT,
  extractReferralCode,
  saveApplicantIdentity,
} from '@/lib/apiClient';
import { toast } from 'sonner';
import { isSubStepValid } from '@/lib/validation/stepValidation';
import { formatTimeDenver } from '@/lib/date';

import {
  saveWizardDraft,
  loadWizardDraft,
  clearWizardDraft,
  draftHasContent,
} from '@/lib/wizardDraft';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


import {
  PersonalInfo,
  Education,
  ProfessionalBackground,
  WorkExperience,
  SelectedSkill,
  SelectedTool,
  Certification,
} from '@/types/application';

// Substep -> Sidebar step mapping
// Sidebar: 1 Personal, 2 Education, 3 Professional, 4 Tools, 5 Skills, 6 Value Prop,
//          7 Work Setup, 8 Compliance, 9 Values Assessment
// Substeps: 1 Personal, 2 Education, 3 ProfBg, 4 WorkExp, 5 Tools, 6 Skills, 7 Portfolio,
//           8 Certs, 9 ValueProp, 10 WorkSetup, 11 Compliance, 12 ValuesAssessment
const SUBSTEP_TO_SIDEBAR: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5, 7: 5, 8: 5, 9: 6, 10: 7, 11: 8, 12: 9,
};

const SIDEBAR_TO_FIRST_SUBSTEP: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 5, 5: 6, 6: 9, 7: 10, 8: 11, 9: 12,
};

const SUBSTEP_TITLES: Record<number, string> = {
  1: 'Personal Information',
  2: 'Education',
  3: 'Professional Background',
  4: 'Work Experience',
  5: 'Tools & Platforms Used',
  6: 'Skills & Core Competencies',
  7: 'Portfolio / Sample Works',
  8: 'Certifications / Trainings',
  9: 'Value Proposition',
  10: 'Work Setup',
  11: 'Compliance',
  12: 'Assessment',
};

const TOTAL_SUBSTEPS = 12;

interface IndexProps {
  defaultReferralLink?: string;
}

const WIZARD_STATE_KEY = 'cb_wizard_state_v1';

interface PersistedWizardState {
  started: boolean;
  currentSubStep: number;
  completedSidebarSteps: number[];
}

const loadPersistedWizardState = (): PersistedWizardState | null => {
  try {
    const raw = sessionStorage.getItem(WIZARD_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWizardState;
    if (typeof parsed.currentSubStep !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const Index = ({ defaultReferralLink }: IndexProps) => {
  const persisted = typeof window !== 'undefined' ? loadPersistedWizardState() : null;
  const [started, setStarted] = useState(persisted?.started ?? false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentSubStep, setCurrentSubStep] = useState(persisted?.currentSubStep ?? 1);
  const [completedSidebarSteps, setCompletedSidebarSteps] = useState<number[]>(
    persisted?.completedSidebarSteps ?? [],
  );
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [assessmentCooldown, setAssessmentCooldown] = useState(0);
  const [assessmentPhase, setAssessmentPhase] = useState<AssessmentPhase>('loading');
  const [leaving, setLeaving] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [showWizardDisclaimer, setShowWizardDisclaimer] = useState(false);


  // Persist wizard progress so a browser refresh resumes on the same step.
  // Cleared when the wizard completes or the user returns to the welcome page.
  useEffect(() => {
    if (!started || completed) return;
    try {
      sessionStorage.setItem(
        WIZARD_STATE_KEY,
        JSON.stringify({ started, currentSubStep, completedSidebarSteps }),
      );
    } catch { /* ignore quota errors */ }
  }, [started, completed, currentSubStep, completedSidebarSteps]);

  useEffect(() => {
    if (completed) {
      try { sessionStorage.removeItem(WIZARD_STATE_KEY); } catch { /* ignore */ }
      clearWizardDraft();
    }
  }, [completed]);

  // Capture referral code from URL ?ref= once on mount and persist for this session.
  const referrer = useMemo(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref') || '';
      const val = ref ? extractReferralCode(ref) : '';
      if (val) sessionStorage.setItem('cb_referrer', val);
      return val || sessionStorage.getItem('cb_referrer') || '';
    } catch { return ''; }
  }, []);

  // Centralized TanStack Form — single source of truth.
  // Wizard end no longer hits a global submit endpoint — every Next persists
  // its substep, and the Work Setup step also fires /finish on save.
  const form = useApplicationForm(async () => {
    setCompleted(true);
  });


  // Subscribe to slices we need to render (kept reactive).
  const values = useStore(form.store, (s) => s.values);

  // --- Autosave -----------------------------------------------------------
  // Restore a previously autosaved draft once, so a refresh or dropped
  // connection never costs the applicant their answers.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const draft = loadWizardDraft();
    if (!draft || !draftHasContent(draft.values)) return;
    for (const [key, val] of Object.entries(draft.values)) {
      if (key === 'password') continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (form.setFieldValue as any)(key, val);
    }
    setDraftRestored(true);
    setLastSavedAt(new Date(draft.savedAt));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist form values (debounced) whenever they change.
  const autosaveReady = useRef(false);
  useEffect(() => {
    if (completed) return;
    if (!autosaveReady.current) { autosaveReady.current = true; return; }
    setDirty(true);
    const t = window.setTimeout(() => saveWizardDraft(values), 600);
    return () => window.clearTimeout(t);
  }, [values, completed]);

  const startFresh = () => {
    clearWizardDraft();
    for (const [key, val] of Object.entries(defaultApplicationData)) {
      if (key === 'email') continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (form.setFieldValue as any)(key, val);
    }
    setDraftRestored(false);
    setDirty(false);
    setCurrentSubStep(1);
    setCompletedSidebarSteps([]);
  };

  // Warn before leaving with changes that haven't been persisted to the server.
  useUnsavedChangesGuard(started && !completed && dirty);

  // Pre-fill referralLink from ?ref= when on head-hunting route, and always
  // capture the raw referral code into the read-only "Referred By" field.
  useEffect(() => {
    const needsLink = defaultReferralLink && !values.personalInfo.referralLink;
    const needsRef = referrer && !values.personalInfo.referredBy;
    if (!needsLink && !needsRef) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (form.setFieldValue as any)('personalInfo', {
      ...values.personalInfo,
      ...(needsLink ? { referralLink: defaultReferralLink } : {}),
      ...(needsRef ? { referredBy: referrer } : {}),
    });
  }, [defaultReferralLink, referrer]); // eslint-disable-line react-hooks/exhaustive-deps


  // Helper that updates a top-level field in the form store.
  const setField = <K extends keyof typeof values>(key: K, val: (typeof values)[K]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (form.setFieldValue as any)(key, val);
  };

  const sidebarStep = SUBSTEP_TO_SIDEBAR[currentSubStep] || 1;

  const workSetupRef = useRef<WorkSetupStepHandle>(null);
  const assessmentRef = useRef<AssessmentStepHandle>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Background-check authorization reminder — shown once per compliance visit.
  const authWarnedRef = useRef(false);


  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* ignore */ }
  }, [currentSubStep]);

  // Assessment "Try again in Ns" countdown.
  useEffect(() => {
    if (assessmentCooldown <= 0) return;
    const t = window.setInterval(() => {
      setAssessmentCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [assessmentCooldown]);

  // Keep applicant identity in session storage so the Assessment step can
  // always populate fname/lname/email on IMX launch.
  useEffect(() => {
    if (!values.email && !values.personalInfo.firstName && !values.personalInfo.lastName) return;
    saveApplicantIdentity({
      email: values.email,
      firstName: values.personalInfo.firstName,
      lastName: values.personalInfo.lastName,
    });
  }, [values.email, values.personalInfo.firstName, values.personalInfo.lastName]);

  // Show the disclaimer banner once after the intro video is closed (or
  // immediately on first wizard start if the intro video is skipped/already seen).
  useEffect(() => {
    if (!started || showIntroModal) return;
    try {
      if (sessionStorage.getItem('cb_wizard_disclaimer_seen') === '1') return;
      sessionStorage.setItem('cb_wizard_disclaimer_seen', '1');
    } catch { /* ignore */ }
    setShowWizardDisclaimer(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, showIntroModal]);

  // Reset the background-check warning when the box is ticked or the user
  // leaves the Compliance step.
  useEffect(() => {
    if (values.compliance.authorizeBackgroundCheck) {
      authWarnedRef.current = false;
    }
  }, [currentSubStep, values.compliance.authorizeBackgroundCheck]);

  /**
   * Warn once (per compliance visit) when the applicant tries to leave the
   * Compliance step without authorizing the background check. Returns true
   * when the navigation was blocked.
   */
  const blockedByAuthWarning = (): boolean => {
    if (values.compliance.authorizeBackgroundCheck) return false;
    if (authWarnedRef.current) return false;
    authWarnedRef.current = true;
    setAuthPromptOpen(true);
    return true;
  };

  const handleNext = async () => {
    // Compliance step — warn once when background check authorization is unticked.
    if (currentSubStep === 11 && blockedByAuthWarning()) return;
    // Final submit — never send the application unauthorized without a warning.
    if (currentSubStep === TOTAL_SUBSTEPS && blockedByAuthWarning()) return;
    if (currentSubStep === 10 && workSetupRef.current && !workSetupRef.current.tryAdvance()) {
      return;
    }
    const currentSidebar = SUBSTEP_TO_SIDEBAR[currentSubStep];
    const nextSidebar = SUBSTEP_TO_SIDEBAR[currentSubStep + 1];

    // Persist this substep to the FastAPI backend before advancing.
    const contactId = loadContactId();
    if (currentSubStep === 12) {
      // Assessment step — Next button asks the step whether IMX has results
      // yet. If not, start a 30s cooldown before allowing another attempt.
      if (!assessmentRef.current) return;
      if (assessmentCooldown > 0 || submitting) return;
      setSubmitting(true);
      try {
        const result = await assessmentRef.current.checkAndAdvance();
        if (result === 'stay') {
          // Moved from Values → DISC internally; wizard stays on step 12.
          return;
        }
        if (result === 'advance') {
          setAssessmentCompleted(true);
          // fall through to sidebar / submit logic below
        } else if (result === 'incomplete') {
          setAssessmentCooldown(30);
          toast.info('Your assessment is not yet complete. You can try again shortly.');
          return;
        } else {
          setAssessmentCooldown(30);
          toast.error('Could not verify assessment status. Try again shortly.');
          return;
        }
      } finally {
        setSubmitting(false);
      }
    } else if (contactId) {
      try {
        setSubmitting(true);
        await submitSubstep(contactId, currentSubStep, values, referrer);
        if (currentSubStep === 1) {
          // Persist identity immediately after Personal Info saves.
          saveApplicantIdentity({
            email: values.email,
            firstName: values.personalInfo.firstName,
            lastName: values.personalInfo.lastName,
          });
        }
        // /finish marks the application as completed — fire it as soon as
        // the Work Setup step (substep 10) is saved so the wizard end no
        // longer needs a global submit endpoint.
        if (currentSubStep === 10) {
          try { await finishApplication(contactId, todayMDT()); }
          catch (e) { console.warn('finish failed', e); }
        }
        setLastSavedAt(new Date());
        setDirty(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to save');
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }


    if (currentSidebar !== nextSidebar && !completedSidebarSteps.includes(currentSidebar)) {
      setCompletedSidebarSteps((prev) => [...prev, currentSidebar]);
    }

    if (currentSubStep >= TOTAL_SUBSTEPS) {
      if (!completedSidebarSteps.includes(9)) {
        setCompletedSidebarSteps((prev) => [...prev, 9]);
      }
      await form.handleSubmit();
    } else {
      setCurrentSubStep((s) => s + 1);
    }
  };


  const handlePrevious = () => {
    if (currentSubStep > 1) setCurrentSubStep((s) => s - 1);
  };

  /**
   * Move on after answering "No" to an optional section, marking the sidebar
   * step complete (green check) whenever the jump leaves it behind.
   */
  const skipToSubStep = (target: number) => {
    const from = SUBSTEP_TO_SIDEBAR[currentSubStep];
    const to = SUBSTEP_TO_SIDEBAR[target];
    if (from && from !== to) {
      setCompletedSidebarSteps((prev) => (prev.includes(from) ? prev : [...prev, from]));
    }
    setCurrentSubStep(target);
  };

  const handleStepClick = (sidebarStep: number) => {
    const targetSubStep = SIDEBAR_TO_FIRST_SUBSTEP[sidebarStep];
    if (!targetSubStep || targetSubStep === currentSubStep) return;
    // Jumping away from Compliance triggers the same one-shot reminder.
    if (currentSubStep === 11 && blockedByAuthWarning()) return;
    setCurrentSubStep(targetSubStep);
  };

  const handleBackToWelcome = () => {
    setLeaving(true);
    window.setTimeout(() => {
      try { sessionStorage.removeItem(WIZARD_STATE_KEY); } catch { /* ignore */ }
      clearWizardDraft();
      setDirty(false);
      setStarted(false);
      setCurrentSubStep(1);
      setCompletedSidebarSteps([]);
      setLeaving(false);
    }, 200);
  };

  if (!started) {
    return (
      <WelcomeStep
        email={values.email}
        password={values.password}
        onEmailChange={(v) => setField('email', v)}
        onPasswordChange={(v) => setField('password', v)}
        onStart={(viaSignup) => {
          setStarted(true);
          if (viaSignup) {
            try {
              if (!sessionStorage.getItem('cb_intro_video_shown')) {
                sessionStorage.setItem('cb_intro_video_shown', '1');
                setShowIntroModal(true);
              }
            } catch {
              setShowIntroModal(true);
            }
          }
        }}
      />
    );
  }

  if (completed) {
    return <CompletionStep />;
  }

  return (
    <div
      className={`flex flex-col md:flex-row min-h-screen bg-muted transition-opacity duration-200 ease-out ${leaving ? 'opacity-0' : 'opacity-100'}`}
      aria-hidden={leaving}
    >
      <IntroVideoModal open={showIntroModal} onOpenChange={setShowIntroModal} />
      <WizardSidebar currentStep={sidebarStep} completedSteps={completedSidebarSteps} onStepClick={handleStepClick} />

      <div ref={scrollContainerRef} className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10">
          {draftRestored && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-sm text-foreground">
                <span className="font-semibold">We restored your progress.</span>{' '}
                <span className="text-muted-foreground">
                  Your answers from this device were saved automatically.
                </span>
              </p>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={startFresh}
                  className="text-sm font-medium text-destructive hover:underline"
                >
                  Start fresh
                </button>
                <button
                  type="button"
                  onClick={() => setDraftRestored(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {currentSubStep === 1 && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">Let's build your professional profile.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Complete each section thoughtfully, as this profile will be viewed by potential clients who are choosing their Cyberbacker. The more complete and specific your profile is, the higher your chances of being shortlisted.
              </p>
            </div>
          )}
          <div className="mb-8">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {SUBSTEP_TITLES[currentSubStep]}
            </h2>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(currentSubStep / TOTAL_SUBSTEPS) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {currentSubStep}/{TOTAL_SUBSTEPS}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Step {currentSubStep} of {TOTAL_SUBSTEPS} — about{' '}
                {Math.max(1, Math.round((TOTAL_SUBSTEPS - currentSubStep + 1) * 1.5))} min left
              </span>
              {lastSavedAt && (
                <span aria-live="polite">
                  {dirty ? 'Unsaved changes' : 'Saved'}{' '}
                  {formatTimeDenver(lastSavedAt)}
                </span>
              )}
            </div>
            {showWizardDisclaimer && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900">Important reminder</p>
                    <p className="text-sm text-amber-900/90 mt-1">
                      Please make sure the information in your Profile Builder is accurate, complete, and up to date, as it may be reviewed and assessed at any point.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWizardDisclaimer(false)}
                    className="text-amber-900/70 hover:text-amber-900 text-sm font-medium shrink-0"
                    aria-label="Dismiss disclaimer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            {currentSubStep === 1 && (
              <PersonalInfoStep
                data={values.personalInfo}
                onChange={(d: PersonalInfo) => setField('personalInfo', d)}
              />
            )}
            {currentSubStep === 2 && (
              <EducationStep
                data={values.education}
                onChange={(d: Education) => setField('education', d)}
              />
            )}
            {currentSubStep === 3 && (
              <ProfessionalBgStep
                data={values.professionalBackground}
                onChange={(d: ProfessionalBackground) => setField('professionalBackground', d)}
              />
            )}
            {currentSubStep === 4 && (
              <WorkExperienceStep
                data={values.workExperiences}
                onChange={(d: WorkExperience[]) => setField('workExperiences', d)}
                onSkip={() => skipToSubStep(5)}
              />
            )}
            {currentSubStep === 5 && (
              <ToolsStep
                data={values.selectedTools}
                onChange={(d: SelectedTool[]) => setField('selectedTools', d)}
                selectedRoles={values.professionalBackground.preferredRole}
                onSkip={() => skipToSubStep(6)}
              />
            )}
            {currentSubStep === 6 && (
              <SkillsStep
                data={values.selectedSkills}
                onChange={(d: SelectedSkill[]) => setField('selectedSkills', d)}
                onSkip={() => skipToSubStep(7)}
              />
            )}
            {currentSubStep === 7 && (
              <PortfolioStep
                portfolioLink={values.portfolioLink}
                onPortfolioLinkChange={(v) => setField('portfolioLink', v)}
                onFilesChange={(files) => setField('portfolioFiles', files)}
                initialFiles={values.portfolioFiles}
                onSkip={() => skipToSubStep(8)}
              />
            )}
            {currentSubStep === 8 && (
              <CertificationsStep
                data={values.certifications}
                onChange={(d: Certification[]) => setField('certifications', d)}
                onSkip={() => skipToSubStep(9)}
              />
            )}

            {currentSubStep === 9 && (
              <ValuePropositionStep
                value={values.personalInfo.valueProposition}
                onChange={(v) =>
                  setField('personalInfo', { ...values.personalInfo, valueProposition: v })
                }
              />
            )}
            {currentSubStep === 10 && (
              <WorkSetupStep
                ref={workSetupRef}
                data={{
                  primaryDevice: values.workSetup.primaryDevice,
                  headset: values.workSetup.hasNoiseCancellingHeadset,
                  webcam: values.workSetup.hasHDWebcam,
                  secondaryDevice: values.workSetup.secondaryDevice,
                  primaryISP: values.workSetup.primaryInternetProvider,
                  secondaryISP: values.workSetup.secondaryInternetProvider,
                  primaryISPSpeedtest: values.workSetup.primaryISPSpeedtest,
                  secondaryISPSpeedtest: values.workSetup.secondaryISPSpeedtest,
                  deviceScreenshots: values.workSetup.deviceScreenshots,
                  secondaryDeviceScreenshots: values.workSetup.secondaryDeviceScreenshots,
                  detectedSpecs: values.workSetup.systemSpecs,
                  activeTab: values.workSetup.activeTab,
                  consent: values.workSetup.consent,
                }}
                onChange={(d) => setField('workSetup', {
                  ...values.workSetup,
                  primaryDevice: d.primaryDevice,
                  hasNoiseCancellingHeadset: d.headset,
                  hasHDWebcam: d.webcam,
                  secondaryDevice: d.secondaryDevice,
                  primaryInternetProvider: d.primaryISP,
                  secondaryInternetProvider: d.secondaryISP,
                  primaryISPSpeedtest: d.primaryISPSpeedtest ?? '',
                  secondaryISPSpeedtest: d.secondaryISPSpeedtest ?? '',
                  deviceScreenshots: d.deviceScreenshots ?? [],
                  secondaryDeviceScreenshots: d.secondaryDeviceScreenshots ?? [],
                  systemSpecs: d.detectedSpecs ?? values.workSetup.systemSpecs,
                  activeTab: d.activeTab,
                  consent: d.consent,
                })}
              />
            )}
            {currentSubStep === 11 && (
              <ComplianceStep
                data={{
                  authorized: values.compliance.authorizeBackgroundCheck,
                  validId: values.compliance.validId,
                  nbiClearance: values.compliance.nbiClearance,
                  policeClearance: values.compliance.policeClearance,
                  proofOfSeparation: values.compliance.proofOfSeparation,
                  nbiValidity: values.compliance.nbiValidity,
                  policeValidity: values.compliance.policeValidity,
                  canSubmitNbiPolice: values.compliance.canSubmitNbiPolice ?? '',
                  canSubmitCoe: values.compliance.canSubmitCoe ?? '',
                }}
                onChange={(d) => setField('compliance', {
                  authorizeBackgroundCheck: d.authorized,
                  validId: d.validId ?? null,
                  nbiClearance: d.nbiClearance ?? null,
                  policeClearance: d.policeClearance ?? null,
                  proofOfSeparation: d.proofOfSeparation ?? null,
                  nbiValidity: d.nbiValidity,
                  policeValidity: d.policeValidity,
                  canSubmitNbiPolice: d.canSubmitNbiPolice ?? '',
                  canSubmitCoe: d.canSubmitCoe ?? '',
                })}
              />
            )}
            {currentSubStep === 12 && (
              <div className="mb-6">
                <WizardNavigation
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  isFirst={false}
                  isLast={currentSubStep === TOTAL_SUBSTEPS}
                  isSubmitting={submitting}
                  cooldownSeconds={assessmentCooldown}
                  checkingLabel={submitting ? 'Checking…' : undefined}
                  nextLabel={assessmentPhase === 'disc' ? 'Submit' : 'Next'}
                  disableNext={!isSubStepValid(currentSubStep, values)}
                />
              </div>
            )}
            {currentSubStep === 12 && (
              <AssessmentStep
                ref={assessmentRef}
                contactId={loadContactId() ?? ''}
                email={values.email}
                firstName={values.personalInfo.firstName}
                lastName={values.personalInfo.lastName}
                onPhaseChange={setAssessmentPhase}
                onCompleted={() => setAssessmentCompleted(true)}
              />
            )}


            {currentSubStep !== 12 && (
            <WizardNavigation
              onPrevious={handlePrevious}
              onNext={handleNext}
              isFirst={currentSubStep === 1}
              isLast={currentSubStep === TOTAL_SUBSTEPS}
              isSubmitting={submitting}
              cooldownSeconds={currentSubStep === 12 ? assessmentCooldown : 0}
              checkingLabel={currentSubStep === 12 && submitting ? 'Checking…' : undefined}
              nextLabel={currentSubStep === 12 ? (assessmentPhase === 'disc' ? 'Submit' : 'Next') : undefined}
              disableNext={!isSubStepValid(currentSubStep, values)}
            />
            )}


          </div>

          <div className="mt-6 flex justify-start">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <Home className="h-4 w-4" />
                  Back to Welcome
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave the wizard?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your progress is saved and you can resume right where you left off. You'll return to the welcome screen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Stay here</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBackToWelcome}>
                    Return to Welcome
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <Footer />
      </div>

      {/* Background check authorization reminder */}
      <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Background Check Authorization Required</DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <span className="block">
                A background check is an important part of our compliance process and helps ensure that
                profiles are properly verified and ready for potential client placement.
              </span>
              <span className="block">
                You have not yet authorized Cyberbacker to conduct a background check. Please review the
                authorization checkbox above before saving your compliance information.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className="btn-primary" onClick={() => setAuthPromptOpen(false)}>
              Review Authorization
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
