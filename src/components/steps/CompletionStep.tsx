import { useMemo } from 'react';
import { ClipboardCheck, Mail, UserCheck, Bell, Send, Heart, Check } from 'lucide-react';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import {
  isHeadhunting,
  isDavaohub,
  isSourcing,
  getSourceName,
  getHearFrom,
} from '@/lib/headhunting';

type Step = {
  icon: typeof ClipboardCheck;
  title: string;
  body: React.ReactNode;
};

const STEPS: Step[] = [
  {
    icon: ClipboardCheck,
    title: 'Review in Progress',
    body: (
      <>
        Our team will review your profile, submitted requirements, and Values
        Assessment as part of our compliance process. This review is typically
        completed within{' '}
        <span className="font-semibold text-primary">24–48 business hours</span>.
      </>
    ),
  },
  {
    icon: Mail,
    title: 'Email Notification',
    body: 'Once your profile has been reviewed, we will email you the outcome of your evaluation.',
  },
  {
    icon: UserCheck,
    title: 'Interview (If Qualified)',
    body: 'If qualified, you will be invited to an interview with one of our Career Consultants as the next step of the Talent Success Journey.',
  },
  {
    icon: Bell,
    title: 'Stay Updated',
    body: 'Please check your inbox regularly, including spam or junk folders, to avoid missing any updates.',
  },
];

const CompletionStep = () => {
  const homeHref = useMemo(() => {
    if (getHearFrom()) return `/career-sourcing/${encodeURIComponent(getHearFrom())}`;
    if (isSourcing() && getSourceName()) return `/source/${getSourceName()}`;
    if (isHeadhunting()) return '/head-hunting';
    if (isDavaohub()) return '/davao-hub';
    return '/';
  }, []);

  const handleHome = () => {
    window.location.assign(homeHref);
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl shadow-xl bg-card">
          {/* Arched header */}
          <div className="relative bg-primary h-20">
            <div className="absolute inset-x-0 -bottom-px h-12 bg-card rounded-t-[50%]" />
          </div>

          <div className="px-6 sm:px-10 pb-6 -mt-10 relative">
            <div className="flex justify-center mb-4">
              <Logo className="h-10 w-auto" variant="black" />
            </div>

            {/* Animated check badge */}
            <div className="relative flex justify-center mb-4">
              <span className="absolute inline-flex h-16 w-16 rounded-full bg-emerald-400/30 animate-ping" />
              <span className="relative inline-flex h-16 w-16 rounded-full bg-emerald-100 items-center justify-center">
                <Check className="h-8 w-8 text-emerald-600" strokeWidth={3} />
              </span>
              {/* decorative dots */}
              <span className="absolute -top-1 left-1/3 h-1.5 w-1.5 rounded-full bg-primary/60" />
              <span className="absolute top-2 right-1/3 h-2 w-2 rounded-full bg-emerald-400/70" />
              <span className="absolute bottom-0 left-[38%] h-1 w-1 rounded-full bg-primary/40" />
              <span className="absolute -bottom-1 right-[36%] h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
            </div>

            <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary text-center leading-tight">
              Thank you for building your<br />profile with Cyberbacker!
            </h2>
            <p className="text-center text-muted-foreground mt-2 text-sm sm:text-base">
              Your profile has been submitted successfully.
              <br />
              Here's what happens next:
            </p>

            {/* Timeline */}
            <div className="mt-5 relative">
              <ul className="space-y-3">
                {STEPS.map(({ icon: Icon, title, body }, index) => (
                  <li
                    key={title}
                    className="relative flex items-center gap-4"
                  >
                    {/* Dashed connector between this dot and the next */}
                    {index !== STEPS.length - 1 && (
                      <span className="absolute left-[7px] top-[calc(50%+0.5rem)] h-[calc(100%+0.75rem)] border-l-2 border-dashed border-primary/30" />
                    )}
                    <span className="relative z-10 shrink-0 h-4 w-4 rounded-full bg-primary ring-4 ring-card" />
                    <div className="flex-1 min-w-0 flex gap-3 items-start rounded-2xl border border-border bg-card p-3 shadow-sm">
                      <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-sm text-primary">{title}</h3>
                        <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">
                          {body}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleHome}
              className="mt-5 w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-3 hover:bg-primary/90 transition-colors shadow-md"
            >
              <Send className="h-5 w-5" />
              Got it, thanks!
            </button>

            <p className="mt-4 text-center text-sm text-primary flex items-center justify-center gap-2">
              <Heart className="h-4 w-4" />
              <span>
                We appreciate your trust in <span className="font-semibold">Cyberbacker</span>.
              </span>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CompletionStep;
