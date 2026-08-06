import { useNavigate, useSearchParams } from '@/lib/router-compat';
import { useEffect, useRef, useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { login as apiLogin, signup as apiSignup, saveContactId, forgotPassword } from '@/lib/apiClient';
import PasswordInput from '@/components/common/PasswordInput';
import NdaModal from '@/components/common/NdaModal';
import welcomeBg from '@/assets/welcome-bg.png';

// Hardcoded credentials (TODO: replace with proper auth later)
const ADMIN_EMAIL = 'admin@cyberbacker.com';
const ADMIN_PASSWORD = 'admin123';
const USER_EMAIL = 'test@test.com';
const USER_PASSWORD = 'test123';

interface WelcomeStepProps {
  email: string;
  password: string;
  onEmailChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onStart: (viaSignup: boolean) => void;
}

const WelcomeStep = ({ email, password, onEmailChange, onPasswordChange, onStart }: WelcomeStepProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [readyOpen, setReadyOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [ndaOpen, setNdaOpen] = useState(false);
  const [existsOpen, setExistsOpen] = useState(false);

  const cameFromSignupRef = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Land keyboard focus on the email input whenever Welcome mounts
    // (covers post-AlertDialog focus restoration when returning from the wizard).
    const t = window.setTimeout(() => emailRef.current?.focus({ preventScroll: false }), 50);
    return () => window.clearTimeout(t);
  }, []);

  // Capture referred_by from URL ?ref= query param.
  const referredBy = searchParams.get('ref') || '';

  const openNdaThenReady = () => {
    setNdaOpen(true);
  };

  const handleNdaAgree = () => {
    setNdaOpen(false);
    setReadyOpen(true);
  };

  const routeByTags = (tags: unknown): string => {
    const arr: string[] = Array.isArray(tags) ? (tags as string[]) : [];
    const inTalentPool = arr.some(
      (t) => typeof t === 'string' && t.toLowerCase().includes('talent pool'),
    );
    return inTalentPool ? '/attendance' : '/dashboard';
  };

  const handleStart = async () => {
    cameFromSignupRef.current = false;
    if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      navigate('/admin');
      return;
    }
    if (email.trim() === USER_EMAIL && password === USER_PASSWORD) {
      navigate('/dashboard');
      return;
    }
    if (!email.trim() || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await apiLogin(email.trim(), password);
      if (res?.contact_id) saveContactId(res.contact_id);
      toast.success('Welcome back!');
      navigate(routeByTags(res?.tags));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleProceed = async () => {
    setLoggingIn(true);
    try {
      const res = await apiSignup(email.trim(), password, referredBy);
      if (res?.contact_id) {
        saveContactId(res.contact_id);
        toast.success('Account created.');
      }
      setReadyOpen(false);
      onStart(cameFromSignupRef.current);
      cameFromSignupRef.current = false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Signup failed';
      // The backend rejects duplicate emails — guide the user to sign in or reset.
      if (/exist|already|registered|duplicate|taken/i.test(msg)) {
        setReadyOpen(false);
        setSignupOpen(false);
        setExistsOpen(true);
      } else {
        toast.error(msg);
      }
    } finally {

      setLoggingIn(false);
    }
  };

  const handleCancelReady = () => {
    setReadyOpen(false);
    onEmailChange('');
    onPasswordChange('');
  };

  const handleSendRecovery = async () => {
    if (!recoveryEmail.trim() || !/\S+@\S+\.\S+/.test(recoveryEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      await forgotPassword(recoveryEmail.trim());
      toast.success(`Password recovery sent to ${recoveryEmail}`);
      setForgotOpen(false);
      setRecoveryEmail('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send recovery email.');
    } finally {
      setSending(false);
    }
  };

  const handleSignUp = () => {
    const em = signupEmail.trim();
    if (!em || !/\S+@\S+\.\S+/.test(em)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!signupPassword || signupPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (signupPassword !== signupConfirm) {
      toast.error('Passwords do not match.');
      return;
    }
    // Stage credentials and route through NDA → Ready modal → handleProceed
    onEmailChange(em);
    onPasswordChange(signupPassword);
    setSignupOpen(false);
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirm('');
    cameFromSignupRef.current = true;
    openNdaThenReady();
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl bg-card rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
          {/* Left brand panel (40%) */}
          <div
            className="relative hidden lg:flex flex-col items-center justify-center bg-primary text-primary-foreground p-12 overflow-hidden bg-no-repeat"
            style={{ backgroundImage: `url(${welcomeBg})`, backgroundSize: '115% 115%', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-primary/15 to-transparent pointer-events-none" />
            <div className="relative text-center">
              <h2 className="font-heading text-3xl xl:text-4xl font-bold leading-tight drop-shadow-md">
                Your gateway to world-class remote career opportunities
              </h2>
            </div>
          </div>

          {/* Right form panel (60%) */}
          <div className="flex flex-col items-center justify-center px-6 sm:px-10 py-10 bg-card">
            <div className="w-full max-w-md">
              <div className="flex justify-center mb-6">
                <Logo className="h-14 w-auto" variant="black" />
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-foreground mb-1">
                Welcome to
              </h2>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary mb-3">
                Cyberbacker Profile Builder
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Complete your profile to become client-ready and increase your opportunities!
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={emailRef}
                    type="email"
                    placeholder="mail@site.com"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className="form-input pl-9"
                    aria-label="Email address"
                  />
                </div>
                <div>
                  <PasswordInput
                    leftIcon={<Lock className="w-4 h-4 text-muted-foreground" />}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                  />

                  <div className="flex justify-between items-center mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSignupEmail(email);
                        setSignupOpen(true);
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Create My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryEmail(email);
                        setForgotOpen(true);
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
                <button onClick={handleStart} className="btn-primary w-full mt-2">
                  Already have a profile? Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send password recovery instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="form-label">Email address</label>
            <input
              type="email"
              placeholder="mail@site.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              className="form-input"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="btn-outline"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendRecovery}
              className="btn-primary"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send password recovery'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Creation</DialogTitle>
            <DialogDescription>
              Let's begin by creating your account.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Please enter a valid and active email address, preferably Gmail. This email will serve as your login username and primary communication channel for updates related to your profile and client opportunities.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Create a secure password that is easy for you to remember but difficult for others to guess.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                placeholder="mail@site.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="form-input"
                disabled={signupSubmitting}
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <PasswordInput
                placeholder="At least 8 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                disabled={signupSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use at least 8 characters with a combination of letters and numbers.
              </p>
            </div>
            <div>
              <label className="form-label">Confirm password</label>
              <PasswordInput
                placeholder="Re-enter password"
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                disabled={signupSubmitting}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setSignupOpen(false)}
              className="btn-outline"
              disabled={signupSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              className="btn-primary"
              disabled={signupSubmitting}
            >
              {signupSubmitting ? 'Creating...' : 'Continue Building My Profile'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={readyOpen} onOpenChange={setReadyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome!</DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-sm text-muted-foreground">
              <span className="block">
                To help us match you with opportunities faster, please be ready to provide complete and accurate information along with your required documents.
              </span>
              <span className="block">
                Candidates who submit everything upfront move through the process much more quickly.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" onClick={handleCancelReady} className="btn-outline">
              Cancel
            </button>
            <button type="button" onClick={handleProceed} className="btn-primary" disabled={loggingIn}>
              {loggingIn ? 'Please wait...' : "I'm ready to proceed"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NdaModal open={ndaOpen} onOpenChange={setNdaOpen} onAgree={handleNdaAgree} />
      <Footer />
    </div>
  );
};

export default WelcomeStep;
