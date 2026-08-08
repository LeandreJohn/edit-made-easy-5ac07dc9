import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

interface ErrorRetryProps {
  /** Short message describing what failed. */
  message?: string;
  /** Optional detail line (e.g. server message). */
  detail?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/**
 * Shared "Something went wrong — Retry" block used by every failed fetch so
 * users never face a silent empty screen.
 */
const ErrorRetry = ({ message, detail, onRetry, retrying, className }: ErrorRetryProps) => {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  return (
    <div
      role="alert"
      className={`rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center ${className ?? ''}`}
    >
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
        {offline ? (
          <WifiOff className="h-5 w-5 text-destructive" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
        )}
      </div>
      <p className="font-heading text-base font-semibold text-foreground">
        {offline ? "You're offline" : message || 'Something went wrong'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {offline
          ? 'Check your internet connection and try again — nothing was lost.'
          : detail || "We couldn't load this section. Please try again."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="btn-primary mt-4 inline-flex items-center gap-2 text-sm disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  );
};

export default ErrorRetry;
