import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, Heart, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AssessmentStep, {
  AssessmentStepHandle,
  AssessmentPhase,
} from '@/components/steps/ValuesAssessmentStep';
import {
  createUsAssessmentContact,
  createPhAssessmentContact,
  ApiStatusError,
  saveApplicantIdentity,
  loadApplicantIdentity,
} from '@/lib/apiClient';

type Stage = 'form' | 'assessment' | 'done';

const IDENTITY_KEY = 'cb_us_assessment_identity';

interface StoredIdentity {
  contactId: string;
  email: string;
  firstName: string;
  lastName: string;
}

const readStored = (): StoredIdentity | null => {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredIdentity;
    if (!parsed?.contactId) return null;
    return parsed;
  } catch { return null; }
};

const writeStored = (id: StoredIdentity) => {
  try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(id)); } catch { /* ignore */ }
};

const clearStored = (contactId?: string) => {
  try {
    localStorage.removeItem(IDENTITY_KEY);
    if (contactId) {
      localStorage.removeItem(`cb_imx_values_code_${contactId}`);
      localStorage.removeItem(`cb_imx_disc_code_${contactId}`);
      localStorage.removeItem(`cb_imx_values_done_${contactId}`);
      localStorage.removeItem(`cb_imx_disc_done_${contactId}`);
    }
  } catch { /* ignore */ }
};

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface AssessmentPageProps {
  /** 'us' hits POST /us-assessment, 'ph' hits POST /ph-assessment (eligibility gated). */
  variant?: 'us' | 'ph';
}

const AssessmentPage = ({ variant = 'us' }: AssessmentPageProps) => {
  const [ineligible, setIneligible] = useState(false);
  const [stage, setStage] = useState<Stage>('form');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactId, setContactId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [phase, setPhase] = useState<AssessmentPhase>('loading');
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const assessmentRef = useRef<AssessmentStepHandle>(null);

  // Restore any in-flight session on mount.
  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setContactId(stored.contactId);
      setEmail(stored.email);
      setFirstName(stored.firstName);
      setLastName(stored.lastName);
      setStage('assessment');
    }
  }, []);

  // Cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!firstName.trim() || !lastName.trim() || !isValidEmail(email)) {
      setFormError('Please provide a valid email, first name, and last name.');
      return;
    }
    setSubmitting(true);
    try {
      const create = variant === 'ph' ? createPhAssessmentContact : createUsAssessmentContact;
      const res = await create({
        email: email.trim(),
        firstname: firstName.trim(),
        lastname: lastName.trim(),
      });
      const identity: StoredIdentity = {
        contactId: res.contact_id,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      writeStored(identity);
      saveApplicantIdentity({
        email: identity.email,
        firstName: identity.firstName,
        lastName: identity.lastName,
      });
      setContactId(identity.contactId);
      setStage('assessment');
    } catch (err) {
      if (err instanceof ApiStatusError && (err.status === 403 || err.status === 404)) {
        setIneligible(true);
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to start assessment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssessmentNext = useCallback(async () => {
    if (!assessmentRef.current || checking || cooldown > 0) return;
    setChecking(true);
    try {
      const result = await assessmentRef.current.checkAndAdvance();
      if (result === 'advance') {
        setStage('done');
      } else if (result === 'stay') {
        toast.info('Values complete — please finish the DISC assessment.');
      } else if (result === 'incomplete') {
        setCooldown(30);
        toast.info('Your assessment is not yet complete. You can try again shortly.');
      } else {
        setCooldown(30);
        toast.error('Could not verify assessment status. Try again shortly.');
      }
    } finally {
      setChecking(false);
    }
  }, [checking, cooldown]);

  const handleFinish = () => {
    clearStored(contactId);
    setContactId('');
    setEmail('');
    setFirstName('');
    setLastName('');
    setPhase('loading');
    setStage('form');
  };

  // ------------------- form stage -------------------
  if (stage === 'form') {
    const stored = loadApplicantIdentity();
    // Prefill any recognisable identity we already have on the device.
    if (stored && !email && !firstName && !lastName) {
      setEmail(stored.email ?? '');
      setFirstName(stored.firstName ?? '');
      setLastName(stored.lastName ?? '');
    }
    return (
      <div className="min-h-screen flex flex-col bg-muted">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md rounded-3xl shadow-xl bg-card overflow-hidden">
            <div className="relative bg-primary h-20">
              <div className="absolute inset-x-0 -bottom-px h-12 bg-card rounded-t-[50%]" />
            </div>
            <div className="px-8 pb-8 -mt-10 relative">
              <div className="flex justify-center mb-4">
                <Logo className="h-10 w-auto" variant="black" />
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-primary text-center leading-tight">
                Start your Assessment
              </h1>
              <p className="text-center text-muted-foreground mt-2 text-sm">
                Enter your details to begin the Values and DISC assessments.
              </p>

              <form onSubmit={handleStart} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">First name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Last name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    />
                  </div>
                </div>

                {formError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  {submitting ? 'Starting…' : 'Start Assessment'}
                </button>
              </form>
            </div>
          </div>
        </div>
        <Dialog open={ineligible} onOpenChange={setIneligible}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assessment unavailable</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              You are not eligible to access the Assessment
            </p>
          </DialogContent>
        </Dialog>
        <Footer />
      </div>
    );
  }

  // ------------------- assessment stage -------------------
  if (stage === 'assessment') {
    const isDisc = phase === 'disc';
    const label = checking
      ? 'Checking…'
      : cooldown > 0
        ? `Try again in ${cooldown}s`
        : isDisc ? 'Submit' : 'Next';

    return (
      <div className="min-h-screen flex flex-col bg-muted">
        <header className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Logo className="h-8 w-auto" variant="black" />
            <span className="text-xs text-muted-foreground">
              {firstName} {lastName}
            </span>
          </div>
        </header>

        <main className="flex-1 w-full">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <AssessmentStep
              ref={assessmentRef}
              contactId={contactId}
              email={email}
              firstName={firstName}
              lastName={lastName}
              onPhaseChange={setPhase}
              onCompleted={() => { /* handled via checkAndAdvance */ }}
            />

            <div className="flex items-center justify-end pt-6 border-t border-border mt-6">
              <button
                type="button"
                onClick={handleAssessmentNext}
                disabled={checking || cooldown > 0}
                className="btn-primary gap-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center"
              >
                {(checking || cooldown > 0) && <Loader2 className="w-4 h-4 animate-spin" />}
                {label}
                {!checking && cooldown === 0 && !isDisc && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ------------------- done stage -------------------
  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl shadow-xl bg-card">
          <div className="relative bg-primary h-20">
            <div className="absolute inset-x-0 -bottom-px h-12 bg-card rounded-t-[50%]" />
          </div>

          <div className="px-6 sm:px-10 pb-8 -mt-10 relative">
            <div className="flex justify-center mb-4">
              <Logo className="h-10 w-auto" variant="black" />
            </div>

            <div className="relative flex justify-center mb-4">
              <span className="absolute inline-flex h-16 w-16 rounded-full bg-emerald-400/30 animate-ping" />
              <span className="relative inline-flex h-16 w-16 rounded-full bg-emerald-100 items-center justify-center">
                <Check className="h-8 w-8 text-emerald-600" strokeWidth={3} />
              </span>
            </div>

            <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary text-center leading-tight">
              Congratulations — assessments completed!
            </h2>
            <p className="text-center text-muted-foreground mt-3 text-sm sm:text-base">
              Your Values and DISC assessments have been submitted successfully.
              Our team will review your results and reach out with the next steps.
            </p>

            <button
              onClick={handleFinish}
              className="mt-6 w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-3 hover:bg-primary/90 transition-colors shadow-md"
            >
              <Send className="h-5 w-5" />
              OK
            </button>

            <p className="mt-4 text-center text-sm text-primary flex items-center justify-center gap-2">
              <Heart className="h-4 w-4" />
              <span>Thank you from <span className="font-semibold">Cyberbacker</span>.</span>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AssessmentPage;
