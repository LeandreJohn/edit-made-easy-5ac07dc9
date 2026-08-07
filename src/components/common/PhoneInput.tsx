import { useEffect, useMemo } from 'react';
import { COUNTRIES, findCountry } from '@/lib/countries';
import SearchableSelect from './SearchableSelect';

export interface PhoneInputProps {
  /**
   * Combined phone value, formatted as `+<dial> <number>` (e.g. "+63 9171234567").
   * Storing a single string keeps backward compatibility with the existing payload.
   */
  value: string;
  /**
   * Fires with the combined phone value and, when the change also implies a
   * country, that country's name — so parents can apply both in ONE state
   * update (two separate updates from the same snapshot overwrite each other).
   */
  onChange: (value: string, countryName?: string) => void;
  /** Optional country name, used to keep dropdown in sync with parent state. */
  countryName?: string;
  onCountryChange?: (countryName: string) => void;
  className?: string;
}

/** All known dial codes, longest first, so "+639..." matches "+63" and never "+6394". */
const DIAL_CODES = Array.from(new Set(COUNTRIES.map((c) => c.dial))).sort(
  (a, b) => b.length - a.length,
);

export function splitPhone(value: string, countryName?: string): { dial: string; number: string } {
  const trimmed = (value || '').trim();
  if (!trimmed.startsWith('+')) return { dial: '', number: trimmed };
  // Explicit separator wins (e.g. "+63 9458707854").
  const spaced = trimmed.match(/^(\+\d{1,4})\s+(.*)$/);
  if (spaced) return { dial: spaced[1], number: spaced[2] };

  const digits = trimmed.replace(/[^\d]/g, '');
  // Prefer the currently selected country's dial code when it matches.
  const selected = countryName ? findCountry(countryName)?.dial : '';
  if (selected && digits.startsWith(selected.slice(1))) {
    return { dial: selected, number: digits.slice(selected.length - 1) };
  }
  const match = DIAL_CODES.find((d) => digits.startsWith(d.slice(1)));
  if (match) return { dial: match, number: digits.slice(match.length - 1) };
  return { dial: '', number: trimmed };
}

/** Recompose a dial code and subscriber number into the stored `+63 9171234567` form. */
export function formatPhone(dial: string, number: string): string {
  return `${dial || ''} ${number || ''}`.trim();
}

/**
 * A phone value is valid when it has a known-looking dial code and a subscriber
 * number of 6-15 digits. Empty values are treated as "not yet filled", not invalid.
 */
export function isPhoneValid(value: string, countryName?: string): boolean {
  const raw = (value || '').trim();
  if (!raw) return true;
  const { dial, number } = splitPhone(raw, countryName);
  const digits = (number || '').replace(/\D/g, '');
  if (!dial || !/^\+\d{1,4}$/.test(dial)) return false;
  return digits.length >= 6 && digits.length <= 15;
}


const PhoneInput = ({ value, onChange, countryName, onCountryChange, className = '' }: PhoneInputProps) => {
  const { dial, number } = useMemo(() => splitPhone(value, countryName), [value, countryName]);


  const countryNames = useMemo(() => COUNTRIES.map((c) => c.name), []);

  // Rehydrate country dropdown from the persisted dial code (e.g. after reload).
  // Many dial codes are shared (+1 → US/CA/etc.), so we pick the first match
  // only when no country is set yet — never overwrite a user selection.
  useEffect(() => {
    if (countryName || !dial || !onCountryChange) return;
    const match = COUNTRIES.find((c) => c.dial === dial);
    if (match) onCountryChange(match.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dial, countryName]);

  const handleCountry = (name: string) => {
    const c = findCountry(name);
    // Single callback carrying both fields — parents apply them in one update.
    onChange(`${c ? c.dial : dial} ${number}`.trim(), name);
    onCountryChange?.(name);
  };

  const handleDial = (next: string) => {
    const cleaned = next.replace(/[^\d+]/g, '');
    const withPlus = cleaned.startsWith('+') ? cleaned : cleaned ? `+${cleaned}` : '';
    // Keep the country in sync when a typed dial code unambiguously matches one.
    const match = withPlus ? COUNTRIES.find((c) => c.dial === withPlus) : undefined;
    const keepCountry = countryName && findCountry(countryName)?.dial === withPlus;
    const nextCountry = keepCountry ? countryName : match?.name;
    onChange(`${withPlus} ${number}`.trim(), nextCountry);
    if (!keepCountry && match) onCountryChange?.(match.name);
  };

  const handleNumber = (next: string) => {
    const cleaned = next.replace(/[^\d ()-]/g, '');
    onChange(`${dial} ${cleaned}`.trim());
  };

  const invalid = !isPhoneValid(value, countryName);
  const errorClass = invalid
    ? 'border-destructive ring-2 ring-destructive/40 focus:border-destructive focus:ring-destructive/40'
    : '';

  return (
    <div className={className}>
      <div className="grid grid-cols-[1.4fr_0.7fr_2fr] gap-2">
        <SearchableSelect
          value={countryName || ''}
          onChange={handleCountry}
          options={countryNames}
          placeholder="Country"
          allowClear={false}
        />
        <input
          type="text"
          inputMode="tel"
          value={dial}
          onChange={(e) => handleDial(e.target.value)}
          placeholder="+1"
          className={`form-input ${errorClass}`}
          aria-label="Dialing code"
          aria-invalid={invalid}
        />
        <input
          type="tel"
          value={number}
          onChange={(e) => handleNumber(e.target.value)}
          placeholder="Phone number"
          className={`form-input ${errorClass}`}
          aria-label="Phone number"
          aria-invalid={invalid}
        />
      </div>
      {invalid && (
        <p className="mt-1 text-xs text-destructive">
          Enter a valid phone number — a country dialing code (e.g. +63) followed by 6-15 digits.
        </p>
      )}
    </div>
  );
};


export default PhoneInput;
