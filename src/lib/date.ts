/**
 * Date utilities — every visible date in the app should use MM/DD/YYYY.
 */
export function formatDateMDY(input: Date | string | null | undefined): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return typeof input === 'string' ? input : '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function parseDateMDY(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Convert any date-ish value (ISO, MDY, Date) to MM/DD/YYYY. */
export function toMDY(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) return value;
  return formatDateMDY(value);
}

// ---------------------------------------------------------------------------
// Denver (Mountain Time) display helpers — every visible date/time in the app
// is rendered in America/Denver so applicants and staff read the same clock.
// ---------------------------------------------------------------------------

export const DENVER_TZ = 'America/Denver';

/** Long-form date (e.g. "August 17, 2026") in Denver time. */
export function formatDateDenver(
  input: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' },
): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return typeof input === 'string' ? input : '';
  return new Intl.DateTimeFormat('en-US', { timeZone: DENVER_TZ, ...opts }).format(d);
}

/** Clock time (e.g. "2:05 PM MT") in Denver time. */
export function formatTimeDenver(
  input: Date | string | null | undefined,
  withZone = true,
): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  const t = new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER_TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
  return withZone ? `${t} MT` : t;
}

/** MM/DD/YYYY in Denver time. */
export function formatDateMDYDenver(input: Date | string | null | undefined): string {
  return formatDateDenver(input, { month: '2-digit', day: '2-digit', year: 'numeric' });
}

