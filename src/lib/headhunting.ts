/**
 * Module-level flags indicating that the current session was started from a
 * specialised acquisition route. The API client injects the corresponding
 * snake_case flag into every outgoing JSON payload so the backend can tag
 * the contact accordingly.
 */
let HEADHUNTING = false;
let DAVAOHUB = false;
let SOURCING = false;
let SOURCE_NAME = '';

export function setHeadhunting(value: boolean) {
  HEADHUNTING = value;
}

export function isHeadhunting(): boolean {
  return HEADHUNTING;
}

export function setDavaohub(value: boolean) {
  DAVAOHUB = value;
}

export function isDavaohub(): boolean {
  return DAVAOHUB;
}

export function setSourcing(value: boolean) {
  SOURCING = value;
}

export function isSourcing(): boolean {
  return SOURCING;
}

export function setSourceName(name: string) {
  SOURCE_NAME = name;
}

export function getSourceName(): string {
  return SOURCE_NAME;
}

let SOURCING_HEARFROM = '';

/** Set the "heard from" value captured by the /sourcing/:hearfrom route. */
export function setHearFrom(value: string) {
  SOURCING_HEARFROM = value;
}

export function getHearFrom(): string {
  return SOURCING_HEARFROM;
}
