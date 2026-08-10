import { describe, it, expect } from 'vitest';
import {
  normalizeGraduation,
  isGraduationComplete,
  formatGraduation,
  isEducationValid,
} from './stepValidation';
import type { Education } from '@/types/application';

describe('normalizeGraduation', () => {
  it('converts ISO dates to MM/YYYY', () => {
    expect(normalizeGraduation('2021-05-20')).toBe('05/2021');
    expect(normalizeGraduation('2021-05')).toBe('05/2021');
  });
  it('keeps MM/YYYY and pads single-digit months', () => {
    expect(normalizeGraduation('05/2021')).toBe('05/2021');
    expect(normalizeGraduation('5/2021')).toBe('05/2021');
  });
  it('rejects partial and junk values', () => {
    expect(normalizeGraduation('2021')).toBe('');
    expect(normalizeGraduation('05/')).toBe('');
    expect(normalizeGraduation('/2021')).toBe('');
    expect(normalizeGraduation('')).toBe('');
    expect(normalizeGraduation(null)).toBe('');
    expect(normalizeGraduation('not a date')).toBe('');
  });
});

describe('isGraduationComplete', () => {
  it('accepts ISO values coming from the API', () => {
    expect(isGraduationComplete('2021-05-20')).toBe(true);
    expect(isGraduationComplete('05/2021')).toBe(true);
  });
  it('rejects incomplete values', () => {
    expect(isGraduationComplete('05/')).toBe(false);
    expect(isGraduationComplete('2021')).toBe(false);
    expect(isGraduationComplete('')).toBe(false);
  });
});

describe('formatGraduation', () => {
  it('renders a readable month and year', () => {
    expect(formatGraduation('2021-05-20')).toBe('May 2021');
    expect(formatGraduation('12/1999')).toBe('December 1999');
    expect(formatGraduation('')).toBe('');
  });
});

describe('isEducationValid with the API payload shape', () => {
  const education: Education = {
    highestLevel: "Bachelor's Degree",
    schoolName: 'DLSAU',
    schoolLocation: 'Malabon',
    graduationDate: '2021-05-20',
    degreeField: 'Computer Science',
  } as Education;

  it('passes for a fully filled record with an ISO graduation date', () => {
    expect(isEducationValid(education)).toBe(true);
  });

  it('fails when only a month is chosen', () => {
    expect(isEducationValid({ ...education, graduationDate: '05/' })).toBe(false);
  });
});
