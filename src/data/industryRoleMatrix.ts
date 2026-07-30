import { ROLE_OPTIONS, type RoleName } from './roleDescriptions';

// Default roles available for every industry (per matrix).
const DEFAULT_ROLES: RoleName[] = [
  'Cyberbacker',
  'Marketing Backer',
  'Appointment Setter',
  'Web Developer',
  'Social Media Backer',
  'Bookkeeper Backer',
  'Video Editor',
  'Concierge Backer',
  'Software Backer',
  'DevOps Backend Engineer',
  'AI Service Delivery Specialist',
  'Client Experience Apprentice',
];

const LEASING_EXTRA: RoleName[] = [
  'Listing Backer',
  'Property Management Backer',
  'Transaction Backer',
];

const REAL_ESTATE_EXTRA: RoleName[] = [
  'Listing Backer',
  'Property Management Backer',
  'Transaction Backer',
  'Productivity Backer',
];

const INDUSTRIES = [
  'Accounting','Advertising','Amusement and Recreation Services','Architecture','Automotive',
  'Business Coaching','Coaching','Construction','Consulting services','Counseling Service',
  'E-commerce','Education','Electrical & lighting Solutions','Electronics','Events','Fashion',
  'Finance','Food and Beverage','Franchising','Health and Beauty','Home Renovation','Hospitality',
  'Insurance','Interior Design','Landscape','Legal','Lifestyle','Logistics',
  'Management Consulting Services','Manufacturing','Marketing','Materials Distribution','Media',
  'Medical','Mortgage','Photography','Professional Services','Promotional Products','Publising',
  'Recruitment','Retail','Salon & Spa','Social Assistance','Social Services','Sport',
  'Technology & Services','Utilities and Home Services','Waste Management Services',
];

export const INDUSTRY_ROLE_MATRIX: Record<string, RoleName[]> = {
  ...Object.fromEntries(INDUSTRIES.map((i) => [i, DEFAULT_ROLES])),
  Others: DEFAULT_ROLES,
  Leasing: [...DEFAULT_ROLES, ...LEASING_EXTRA],
  'Real Estate': [...DEFAULT_ROLES, ...REAL_ESTATE_EXTRA],
};

export function getRolesForIndustry(industry: string | undefined | null): RoleName[] {
  if (!industry) return [];
  return INDUSTRY_ROLE_MATRIX[industry] ?? [];
}

export { ROLE_OPTIONS };
