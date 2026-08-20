/**
 * Acquisition-entry state.
 *
 * Records which entry URL the applicant arrived through (/head-hunting,
 * /davao-hub, /source/:name, /career-sourcing/:hearfrom, or the plain home
 * page). The API client injects the corresponding snake_case flags into every
 * outgoing JSON payload so the backend can tag the contact accordingly.
 *
 * The state is mirrored into sessionStorage so it survives page reloads and
 * navigation into the dashboard / attendance pages (used for the apply
 * payload flags, the referral prefill and the sign-out redirect).
 */

interface AcquisitionState {
  headhunting: boolean;
  /** UI-only head-hunting styling (source / career-sourcing reuse the layout). */
  headhuntingUi: boolean;
  davaohub: boolean;
  sourcing: boolean;
  sourceName: string;
  hearFrom: string;
  /** Role captured from /head-hunting/:role. */
  role: string;
  /** `?ref=` value captured from the entry URL. */
  ref: string;
}

const STORAGE_KEY = 'cb_acquisition';

const EMPTY: AcquisitionState = {
  headhunting: false,
  headhuntingUi: false,
  davaohub: false,
  sourcing: false,
  sourceName: '',
  hearFrom: '',
  role: '',
  ref: '',
};

function read(): AcquisitionState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<AcquisitionState>) };
  } catch {
    return { ...EMPTY };
  }
}

let state: AcquisitionState = read();

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function patch(next: Partial<AcquisitionState>) {
  state = { ...state, ...next };
  persist();
}

export function setHeadhunting(value: boolean) {
  patch({ headhunting: value, headhuntingUi: value });
}

export function isHeadhunting(): boolean {
  return state.headhunting;
}

/** Enable the head-hunting styled UI without sending the payload flag. */
export function setHeadhuntingUi(value: boolean) {
  patch({ headhuntingUi: value });
}

export function isHeadhuntingStyle(): boolean {
  return state.headhuntingUi;
}

export function setDavaohub(value: boolean) {
  patch({ davaohub: value });
}

export function isDavaohub(): boolean {
  return state.davaohub;
}

export function setSourcing(value: boolean) {
  patch({ sourcing: value });
}

export function isSourcing(): boolean {
  return state.sourcing;
}

export function setSourceName(name: string) {
  patch({ sourceName: name });
}

export function getSourceName(): string {
  return state.sourceName;
}

/** Set the "heard from" value captured by the /career-sourcing/:hearfrom route. */
export function setHearFrom(value: string) {
  patch({ hearFrom: value });
}

export function getHearFrom(): string {
  return state.hearFrom;
}

/** Set the role captured by the /head-hunting/:role route. */
export function setRole(value: string) {
  patch({ role: value });
}

export function getRole(): string {
  return state.role;
}

/** Referral code (`?ref=`) captured from the entry URL. */
export function setEntryRef(value: string) {
  if (value) patch({ ref: value });
}

export function getEntryRef(): string {
  return state.ref;
}

/** Clear every acquisition flag (used when returning to the plain home page). */
export function clearAcquisition() {
  state = { ...EMPTY };
  persist();
}

/**
 * The path the applicant entered through — used to send them back after
 * signing out of the dashboard / attendance page.
 */
export function getEntryPath(): string {
  const query = state.ref ? `?ref=${encodeURIComponent(state.ref)}` : '';
  if (state.hearFrom) return `/career-sourcing/${encodeURIComponent(state.hearFrom)}${query}`;
  if (state.sourcing && state.sourceName) return `/source/${encodeURIComponent(state.sourceName)}${query}`;
  if (state.davaohub) return `/davao-hub${query}`;
  if (state.headhunting) {
    return state.role
      ? `/head-hunting/${encodeURIComponent(state.role)}${query}`
      : `/head-hunting${query}`;
  }
  return `/${query}`;
}
