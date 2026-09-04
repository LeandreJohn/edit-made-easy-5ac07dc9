import { ReactNode } from 'react';

interface SkipGateProps {
  /** Section title shown in the intro banner. */
  title: string;
  /** Short explanation shown under the title. */
  intro: string;
  /** The Yes/No question. */
  question: string;
  yesLabel: string;
  noLabel: string;
  /** Banner copy shown after answering "No". */
  noTitle: string;
  noBody: string;
  onAnswer: (value: boolean | null) => void;
  /** Current answer — `null` shows the question, `false` shows the notice. */
  answer: boolean | null;
  /** Optional "continue" action shown under the "No" notice (wizard only). */
  onSkip?: () => void;
  skipLabel?: string;
}

/**
 * Shared Yes/No gate used by the optional profile sections
 * (Work Experience, Tools, Skills, Portfolio, Certifications).
 */
const SkipGate = ({
  title, intro, question, yesLabel, noLabel, noTitle, noBody,
  answer, onAnswer, onSkip, skipLabel = 'Continue to next step',
}: SkipGateProps) => {
  if (answer === false) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{noTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">{noBody}</p>
          </div>
          <ChangeAnswerButton onClick={() => onAnswer(null)} />
        </div>
        {onSkip && (
          <button type="button" onClick={onSkip} className="btn-primary w-full">
            {skipLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{intro}</p>
      </div>

      <div className="border border-border rounded-xl p-8 text-center space-y-6">
        <h3 className="text-lg font-heading font-semibold text-foreground">{question}</h3>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={() => onAnswer(true)} className="btn-primary px-6">
            {yesLabel}
          </button>
          <button type="button" onClick={() => onAnswer(false)} className="btn-outline px-6">
            {noLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ChangeAnswerButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-xs text-primary hover:underline font-medium whitespace-nowrap"
  >
    Change answer
  </button>
);

/** Slim banner shown above the section content once the answer is "Yes". */
export const SkipGateBanner = ({
  title, body, onChangeAnswer,
}: { title: string; body: ReactNode; onChangeAnswer: () => void }) => (
  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
    <ChangeAnswerButton onClick={onChangeAnswer} />
  </div>
);

export default SkipGate;
