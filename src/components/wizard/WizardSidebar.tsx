import { STEPS } from '@/types/application';
import {
  Check, User, GraduationCap, Briefcase, Wrench, Sparkles, Lightbulb,
  Monitor, ShieldCheck, ClipboardCheck, type LucideIcon,
} from 'lucide-react';

const STEP_ICONS: Record<string, LucideIcon> = {
  User, GraduationCap, Briefcase, Wrench, Sparkles, Lightbulb, Monitor, ShieldCheck, ClipboardCheck,
};

import Logo from '@/components/Logo';

interface WizardSidebarProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

const WizardSidebar = ({ currentStep, completedSteps, onStepClick }: WizardSidebarProps) => {
  const canNavigate = (stepNumber: number) => {
    return completedSteps.includes(stepNumber) || stepNumber <= currentStep;
  };

  return (
    <>
      {/* Mobile: logo bar */}
      <div className="md:hidden bg-card border-b border-border w-full py-3 px-4 flex justify-center">
        <Logo className="h-12 w-auto" />

      </div>
      {/* Mobile: horizontal stepper */}
      <div className="md:hidden wizard-sidebar w-full py-4 px-4 flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.number;
          const isComplete = completedSteps.includes(step.number);
          const isLast = index === STEPS.length - 1;
          const clickable = canNavigate(step.number);

          return (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => clickable && onStepClick?.(step.number)}
                disabled={!clickable}
                className={`step-circle w-8 h-8 text-xs z-10 shrink-0 ${
                  isComplete
                    ? 'step-circle-complete'
                    : isActive
                    ? 'step-circle-active'
                    : 'step-circle-inactive'
                } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : step.number}
              </button>
              {!isLast && <div className="w-6 sm:w-10 h-0.5 step-line mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden md:flex wizard-sidebar w-64 min-h-screen flex-col items-start py-8 px-6 relative">
        <div className="mb-6 self-start">
          <Logo className="h-16 w-auto" />
        </div>

        <div className="flex flex-col relative mt-4">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.number;
            const isComplete = completedSteps.includes(step.number);
            const isLast = index === STEPS.length - 1;
            const clickable = canNavigate(step.number);

            return (
              <div key={step.key} className="flex items-start gap-4 relative">
                {/* Line connector — starts below the circle, ends above the next */}
                {!isLast && (
                  <div
                    className="absolute w-0.5 step-line"
                    style={{
                      left: '20px',
                      top: '40px',
                      height: 'calc(100% - 40px)',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
                <button
                  onClick={() => clickable && onStepClick?.(step.number)}
                  disabled={!clickable}
                  className={`step-circle z-10 shrink-0 ${
                    isComplete
                      ? 'step-circle-complete'
                      : isActive
                      ? 'step-circle-active'
                      : 'step-circle-inactive'
                  } ${clickable ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
                >
                  {isComplete ? <Check className="w-5 h-5" /> : step.number}
                </button>
                <div className="pt-2 pb-8">
                  <button
                    onClick={() => clickable && onStepClick?.(step.number)}
                    disabled={!clickable}
                    className={`flex items-center gap-2 text-sm font-medium leading-tight text-left ${
                      isActive
                        ? 'text-primary-foreground'
                        : isComplete
                        ? 'text-primary-foreground/90'
                        : 'text-primary-foreground/60'
                    } ${clickable ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
                  >
                    {(() => {
                      const Icon = STEP_ICONS[step.icon];
                      return Icon ? <Icon className="w-4 h-4 shrink-0 opacity-90" /> : null;
                    })()}
                    <span>{step.label}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default WizardSidebar;

