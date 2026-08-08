import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';

interface WizardNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  showAddMore?: boolean;
  onAddMore?: () => void;
  isSubmitting?: boolean;
  /** When > 0, disable Next and show "Try again in {N}s". */
  cooldownSeconds?: number;
  /** Label shown while `isSubmitting` (defaults to "Saving..."). */
  checkingLabel?: string;
  /** Optional override for the primary button label when idle. */
  nextLabel?: string;
  /** When true, hide the Next button entirely and show a hint instead. */
  disableNext?: boolean;
  /** Optional custom hint text shown when `disableNext` is true. */
  disabledHint?: string;
}

const WizardNavigation = ({
  onPrevious,
  onNext,
  isFirst,
  isLast,
  showAddMore,
  onAddMore,
  isSubmitting,
  cooldownSeconds = 0,
  checkingLabel,
  nextLabel,
  disableNext,
  disabledHint,
}: WizardNavigationProps) => {
  const cooling = cooldownSeconds > 0;
  const disabled = !!isSubmitting || cooling;

  let label: string;
  if (isSubmitting) {
    label = checkingLabel ?? (isLast ? 'Submitting...' : 'Saving...');
  } else if (cooling) {
    label = `Try again in ${cooldownSeconds}s`;
  } else {
    label = nextLabel ?? (isLast ? 'Submit' : 'Next');
  }

  return (
    <div className="sticky bottom-0 z-20 -mx-8 px-8 flex items-center justify-between gap-3 pt-4 pb-4 sm:pb-0 border-t border-border mt-8 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:static sm:mx-0 sm:px-0 sm:pt-6 sm:bg-transparent sm:backdrop-blur-none">
      <button
        onClick={onPrevious}
        disabled={isFirst}
        className="btn-outline gap-2 disabled:opacity-30"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>

      <div className="flex items-center gap-3">
        {showAddMore && onAddMore && (
          <button onClick={onAddMore} className="btn-outline gap-2">
            <Plus className="w-4 h-4" />
            Add More
          </button>
        )}
        {disableNext ? (
          <span className="text-xs text-muted-foreground italic">
            {disabledHint ?? 'Fill in the required fields to continue.'}
          </span>
        ) : (
          <button
            onClick={onNext}
            disabled={disabled}
            className="btn-primary gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isSubmitting || cooling) && <Loader2 className="w-4 h-4 animate-spin" />}
            {label}
            {!isLast && !isSubmitting && !cooling && <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default WizardNavigation;
