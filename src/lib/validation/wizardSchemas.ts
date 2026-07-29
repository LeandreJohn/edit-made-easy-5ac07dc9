import { z } from 'zod';

const required = (label: string) =>
  z.string().trim().min(1, { message: `${label} is required` });

export const personalInfoSchema = z.object({
  firstName: required('First name'),
  lastName: required('Last name'),
  dateOfBirth: required('Date of birth'),
  phoneNumber: z.string().trim().min(4, { message: 'Phone number is required' }),
  languagesSpoken: required('Languages spoken'),
  country: required('Country'),
  nationality: required('Nationality'),
}).passthrough();

export const personalInfoPHAddressSchema = z.object({
  houseStreet: required('House No. / Street'),
  barangay: required('Barangay'),
  city: required('City / Province'),
}).passthrough();

export const personalInfoOtherAddressSchema = z.object({
  address: required('Street address'),
  city: required('City'),
}).passthrough();

export const educationSchema = z.object({
  highestLevel: required('Highest level of education'),
  schoolName: required('School name'),
  schoolLocation: required('School location'),
}).passthrough().superRefine((val, ctx) => {
  const level = (val as { highestLevel?: string }).highestLevel ?? '';
  const isHS = level === 'High School Graduate';
  // Undergraduates have no graduation date yet — everyone else must provide one.
  const isUndergrad = /undergraduate|currently/i.test(level);
  if (!isUndergrad && !(val as { graduationDate?: string }).graduationDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Graduation date is required',
      path: ['graduationDate'],
    });
  }
  const degreeField = (val as { degreeField?: string }).degreeField;
  if (!isHS && !degreeField) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Degree / Field of Study is required',
      path: ['degreeField'],
    });
  }
  if (degreeField === 'Other' && !(val as { degreeFieldOther?: string }).degreeFieldOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify your degree / field of study',
      path: ['degreeFieldOther'],
    });
  }
});


export const professionalBgSchema = z.object({
  preferredIndustry: required('Preferred industry'),
  preferredRole: required('Preferred role'),
  schedule: required('Availability'),
  hoursPerDay: required('Hours per day'),
}).passthrough().superRefine((val, ctx) => {
  const roles = String((val as { preferredRole?: string }).preferredRole || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (roles.length > 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select up to 3 roles',
      path: ['preferredRole'],
    });
  }
});

export const workSetupSchema = z.object({
  primaryDevice: required('Primary device'),
  primaryInternetProvider: required('Primary internet provider'),
  primaryISPSpeedtest: required('Primary ISP speedtest link'),
}).passthrough();

export const complianceSchema = z.object({
  authorizeBackgroundCheck: z
    .boolean()
    .refine((v) => v === true, { message: 'You must authorize the background check to continue' }),
}).passthrough();

export type ZodFlatErrors = Record<string, string>;

export function flattenZodErrors(err: z.ZodError): ZodFlatErrors {
  const out: ZodFlatErrors = {};
  for (const issue of err.errors) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
