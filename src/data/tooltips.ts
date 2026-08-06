/**
 * Global tooltip config. Add a new entry to surface a tooltip anywhere in the
 * app via `<FieldTooltip fieldKey="...">` or `<RequiredLabel tooltipKey="...">`.
 */
export interface TooltipEntry {
  title?: string;
  description: string;
}

export const TOOLTIPS: Record<string, TooltipEntry> = {
  email: {
    title: 'Active email',
    description:
      'Use a valid email you check regularly — preferably Gmail. This is your login and primary communication channel.',
  },
  password: {
    title: 'Secure password',
    description: 'Use a password you can remember but others cannot easily guess.',
  },
  dateOfBirth: {
    description: 'Used for identity verification only — never shared with clients.',
  },
  phoneNumber: {
    description: 'Choose your country to auto-fill the dialing code. You can edit both fields.',
  },
  country: {
    description: 'Select your current country of residence.',
  },
  nationality: {
    description: 'Your declared nationality (does not have to match country of residence).',
  },
  preferredRole: {
    description:
      'Pick up to 3 roles. Click the info icon to view a job description for each role.',
  },
  preferredIndustry: {
    description: 'The industry you most want to support — used for client matching.',
  },
  valueProposition: {
    title: 'Why should a client choose you?',
    description:
      'A short pitch (2–4 sentences) highlighting what makes you the ideal Cyberbacker.',
  },
  primaryDeviceScreenshot: {
    description: 'Screenshot of your computer’s system specs (CPU, RAM, storage).',
  },
  secondaryDeviceScreenshot: {
    description: 'Screenshot of your backup device’s system specs (optional but recommended).',
  },
  primaryISPSpeedtest: {
    description: 'Open speedtest.net → Go → Share → copy the Web link.',
  },
  authorizeBackgroundCheck: {
    description: 'Required to proceed. We use this to verify your background.',
  },
  dateIssued: {
    description: 'Date the document was issued, as printed on the document.',
  },
  resumeUpload: {
    description:
      'Upload a PDF or DOCX résumé and we will pre-fill matching fields automatically.',
  },
  referredBy: {
    title: 'Referred By',
    description:
      'This is the referral code from the link you used to sign up. It is locked so your referral credit stays accurate and cannot be changed.',
  },
};

