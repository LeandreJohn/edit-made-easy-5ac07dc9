export interface PersonalInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string; // MM/DD/YYYY
  phoneNumber: string; // "+63 9171234567"
  phoneCountry: string; // ISO country name (e.g. "Philippines")
  languagesSpoken: string;
  // Conditional address fields — populated when country === 'Philippines'
  houseStreet: string;
  barangay: string;
  city: string;
  // Generic single-line address used when country !== 'Philippines'
  address: string;
  country: string;
  nationality: string;
  valueProposition: string;
  /** Head-hunting referral link (only collected when applying via /head-hunting). */
  referralLink?: string;
  photo: File | null;
}

export interface Education {
  highestLevel: string;
  schoolName: string;
  schoolLocation: string;
  graduationDate: string; // MM/DD/YYYY
  degreeField: string;
}

export interface ProfessionalBackground {
  preferredIndustry: string;
  preferredRole: string; // comma-separated (max 3)
  availability: string;
  schedule: string;
  hoursPerDay: string;
}

export interface WorkExperience {
  id: string;
  title: string;
  employer: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  responsibilities: string;
  toolsPlatforms: string;
}

export interface SkillCategory {
  name: string;
  skills: string[];
}

export interface SelectedSkill {
  skill: string;
  category: string;
  proficiency: 'No Experience' | 'Basic' | 'Intermediate' | 'Proficient' | 'Expert';
}

export type ProficiencyLevel = SelectedSkill['proficiency'];

export interface SelectedTool {
  tool: string;
  proficiency: ProficiencyLevel;
}

export interface Certification {
  id: string;
  type: string;
  title: string;
  organization: string;
  dateCompleted: string;
  expirationDate: string;
  credentialId: string;
  certificate: File | null;
}

export interface SystemSpecs {
  cpu: string;
  ram: string;
  storage: string;
  source: 'detected' | 'denied' | 'mobile' | '';
}

export interface WorkSetup {
  primaryDevice: string;
  hasNoiseCancellingHeadset: boolean;
  hasHDWebcam: boolean;
  secondaryDevice: string;
  primaryInternetProvider: string;
  secondaryInternetProvider: string;
  primaryISPSpeedtest: string;
  secondaryISPSpeedtest: string;
  documents: File[];
  /** Primary device specification screenshot. */
  deviceScreenshots: File[];
  /** Secondary (backup) device specification screenshot. */
  secondaryDeviceScreenshots: File[];
  systemSpecs: SystemSpecs;
  /** Which tab was last open — persisted so the wizard remembers position. */
  activeTab?: 'device' | 'isp';
  /** Whether the user accepted the device specification notice. */
  consent?: boolean;
}

export interface ComplianceData {
  authorizeBackgroundCheck: boolean;
  validId: File | null;
  nbiClearance: File | null;
  policeClearance: File | null;
  /** JPG/PNG/PDF — Proof of Separation or Certificate of Employment. */
  proofOfSeparation: File | null;
  /** Renamed in UI to "Valid Until" — payload key kept for backward compatibility. */
  nbiValidity: string;
  policeValidity: string;
  /** Persisted answers for the Yes/No gates. */
  canSubmitNbiPolice?: 'yes' | 'no' | '';
  canSubmitCoe?: 'yes' | 'no' | '';
}


export interface ApplicationData {
  email: string;
  password: string;
  personalInfo: PersonalInfo;
  education: Education;
  professionalBackground: ProfessionalBackground;
  workExperiences: WorkExperience[];
  selectedTools: SelectedTool[];
  selectedSkills: SelectedSkill[];
  portfolioLink: string;
  portfolioFiles: File[];
  certifications: Certification[];
  workSetup: WorkSetup;
  compliance: ComplianceData;
}

export const STEPS = [
  { number: 1, label: 'Personal Info', key: 'personal', icon: 'User' },
  { number: 2, label: 'Education', key: 'education', icon: 'GraduationCap' },
  { number: 3, label: 'Professional Background', key: 'professional', icon: 'Briefcase' },
  { number: 4, label: 'Tools & Platforms Used', key: 'tools', icon: 'Wrench' },
  { number: 5, label: 'Skills & Core Competencies', key: 'skills', icon: 'Sparkles' },
  { number: 6, label: 'Value Proposition', key: 'valueProp', icon: 'Lightbulb' },
  { number: 7, label: 'Work Setup', key: 'workSetup', icon: 'Monitor' },
  { number: 8, label: 'Compliance', key: 'compliance', icon: 'ShieldCheck' },
  { number: 9, label: 'Assessment', key: 'valuesAssessment', icon: 'ClipboardCheck' },
] as const;


export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    name: 'Administrative & Executive Support',
    skills: [
      'Calendar Management',
      'Email Management',
      'Appointment Setting',
      'Meeting Coordination',
      'Travel Coordination',
      'File & Document Organization',
      'Data Entry & Database Maintenance',
      'Executive Assistance',
      'Task & Inbox Management',
      'Time Management & Prioritization',
    ],
  },
  {
    name: 'Client & Communication Support',
    skills: [
      'Customer Service',
      'Client Follow-up',
      'Email & Chat Support',
      'Phone Handling',
      'Client Relationship Management',
      'Professional Written Communication',
      'Stakeholder Coordination',
      'Conflict Handling & Resolution',
      'Active Listening',
    ],
  },
  {
    name: 'Sales & Lead Support',
    skills: [
      'Lead Generation',
      'CRM Management',
      'Pipeline Tracking',
      'Prospect Research',
      'Appointment Setting / Cold Outreach Support',
      'Lead Qualification',
      'Follow-up Automation',
      'Sales Reporting',
    ],
  },
  {
    name: 'Marketing & Content',
    skills: [
      'Social Media Management',
      'Graphics | Canva Design',
      'Copywriting',
      'Content Scheduling',
      'Basic Video Editing',
      'Email Marketing',
      'Engagement Management',
      'Brand Consistency Execution',
    ],
  },
  {
    name: 'Operations, Reporting & Compliance',
    skills: [
      'Spreadsheet Reporting',
      'Dashboard Management',
      'SOP Documentation',
      'Process Improvement',
      'KPI Tracking',
      'Project Coordination',
      'Quality Assurance',
      'Compliance Documentation',
    ],
  },
  {
    name: 'Client Success & Relationship Management',
    skills: [
      'Client onboarding support',
      'Relationship management',
      'Escalation handling',
      'Client retention support',
      'Service recovery',
    ],
  },
  {
    name: 'Process & Automation Support',
    skills: [
      'Workflow automation',
      'Process mapping',
      'AI productivity tools',
      'CRM automation',
      'SOP optimization',
      'Zapier / automation tools',
    ],
  },
  {
    name: 'Technical & Digital Tools Proficiency',
    skills: [
      'Google Workspace',
      'Microsoft Office Suite',
      'CRM Platforms (HubSpot, Salesforce, GoHighLevel, etc.)',
      'Project Management Tools (Asana, Trello, ClickUp, Monday.com)',
      'Communication Tools (Slack, Zoom, MS Teams)',
      'Automation Tools (Zapier, Make)',
      'Basic AI Productivity Tools (ChatGPT, etc.)',
      'Data Management Tools',
    ],
  },
  {
    name: 'Software Engineering & Web Development',
    skills: [
      'Programming Fundamentals',
      'Problem Solving & Algorithm Thinking',
      'Object-Oriented Programming (OOP)',
      'Web Development (Frontend Basics)',
      'Web Development (Backend Basics)',
      'Full-Stack Development',
      'API Development & Integration',
      'Database Management',
      'Version Control (Git / Git-based workflows)',
      'Software Debugging & Troubleshooting',
      'Code Optimization & Performance Improvement',
      'System Design Fundamentals',
      'Responsive Web Design',
      'UI Implementation from Design Files',
      'Basic Cybersecurity Principles',
      'Testing & Quality Assurance',
      'Agile / Scrum Development Workflow',
      'Software Deployment Basics',
      'Cloud Computing Fundamentals',
      'DevOps Basics (CI/CD Awareness)',
      'Mobile App Development Basics',
      'Cross-Browser / Cross-Platform Compatibility',
      'Software Documentation',
    ],
  },
];

/** Flat list of every catalog skill with its category — used by the searchable picker. */
export const ALL_SKILLS_FLAT: { skill: string; category: string }[] = SKILL_CATEGORIES.flatMap(
  (c) => c.skills.map((s) => ({ skill: s, category: c.name })),
);
