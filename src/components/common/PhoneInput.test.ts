import { describe, it, expect } from 'vitest';
import { splitPhone, formatPhone, isPhoneValid } from './PhoneInput';

describe('splitPhone', () => {
  it('splits a Philippine number on the real dial code, not a 4-digit guess', () => {
    expect(splitPhone('+639458707854')).toEqual({ dial: '+63', number: '9458707854' });
  });

  it('keeps an explicit space separator intact', () => {
    expect(splitPhone('+63 9458707854')).toEqual({ dial: '+63', number: '9458707854' });
  });

  it('handles single-digit dial codes', () => {
    expect(splitPhone('+14155550123')).toEqual({ dial: '+1', number: '4155550123' });
  });

  it('handles two-digit dial codes', () => {
    expect(splitPhone('+447911123456')).toEqual({ dial: '+44', number: '7911123456' });
  });

  it('handles three-digit dial codes', () => {
    expect(splitPhone('+971501234567')).toEqual({ dial: '+971', number: '501234567' });
  });

  it('prefers the selected country dial code when it matches', () => {
    expect(splitPhone('+12045550123', 'Canada')).toEqual({ dial: '+1', number: '2045550123' });
  });

  it('returns the raw value when there is no leading plus', () => {
    expect(splitPhone('09458707854')).toEqual({ dial: '', number: '09458707854' });
  });

  it('handles empty input', () => {
    expect(splitPhone('')).toEqual({ dial: '', number: '' });
  });

  it('round-trips through formatPhone unchanged', () => {
    const { dial, number } = splitPhone('+639458707854');
    expect(formatPhone(dial, number)).toBe('+63 9458707854');
  });
});

describe('isPhoneValid', () => {
  it('treats empty as not-yet-filled', () => {
    expect(isPhoneValid('')).toBe(true);
  });

  it('accepts a well-formed number', () => {
    expect(isPhoneValid('+63 9458707854')).toBe(true);
    expect(isPhoneValid('+639458707854')).toBe(true);
  });

  it('rejects a missing dial code', () => {
    expect(isPhoneValid('9458707854')).toBe(false);
  });

  it('rejects a too-short subscriber number', () => {
    expect(isPhoneValid('+63 12345')).toBe(false);
  });

  it('rejects a too-long subscriber number', () => {
    expect(isPhoneValid('+63 1234567890123456')).toBe(false);
  });
});
