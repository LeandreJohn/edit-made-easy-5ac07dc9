/**
 * Marketing conversion tracking.
 *
 * The Meta Pixel and LinkedIn Insight Tag base snippets are loaded in
 * index.html. This module only fires conversion events, and stays a no-op
 * when either script is blocked or has not loaded yet.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    lintrk?: (action: string, data?: Record<string, unknown>) => void;
  }
}

/** Optional LinkedIn Campaign Manager conversion ID (numeric). */
const LINKEDIN_CONVERSION_ID = import.meta.env.VITE_LINKEDIN_CONVERSION_ID as string | undefined;

/** Fire the Meta `Lead` event and the matching LinkedIn conversion. */
export function trackApplicationLead(): void {
  if (typeof window === 'undefined') return;

  try {
    window.fbq?.('track', 'Lead');
  } catch {
    /* tracking must never break the app */
  }

  try {
    const conversionId = Number(LINKEDIN_CONVERSION_ID);
    if (window.lintrk && Number.isFinite(conversionId) && conversionId > 0) {
      window.lintrk('track', { conversion_id: conversionId });
    }
  } catch {
    /* tracking must never break the app */
  }
}

export {};
