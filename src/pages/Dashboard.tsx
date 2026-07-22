import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import {
  Pencil, X, Save, User, LogOut, Clock, Loader2, ChevronDown, Lock, HelpCircle,
  FileText, Calendar, ArrowRight, Camera,
} from 'lucide-react';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import EducationStep from '@/components/steps/EducationStep';
import PersonalInfoStep from '@/components/steps/PersonalInfoStep';
import ProfessionalBgStep from '@/components/steps/ProfessionalBgStep';
import WorkExperienceStep from '@/components/steps/WorkExperienceStep';
import SkillsStep from '@/components/steps/SkillsStep';
import ToolsStep from '@/components/steps/ToolsStep';
import CertificationsStep from '@/components/steps/CertificationsStep';
import PortfolioStep from '@/components/steps/PortfolioStep';
import ValuePropositionStep from '@/components/steps/ValuePropositionStep';
import WorkSetupStep, { WorkSetupData, emptyWorkSetup } from '@/components/steps/WorkSetupStep';
import ComplianceStep, { ComplianceFormData, emptyCompliance } from '@/components/steps/ComplianceStep';
import AssessmentStep, { AssessmentStepHandle, AssessmentPhase } from '@/components/steps/ValuesAssessmentStep';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  PersonalInfo, Education, ProfessionalBackground, WorkExperience,
  SelectedSkill, SelectedTool, Certification,
} from '@/types/application';
import {
  loadContactId, getDashboard, updatePersonalInfo, updateEducation,
  updateProfessionalBackground, updateWorkExperience, updateToolsPlatforms,
  updateSkills, updateCertifications, updateWorkSetup, updateCompliance,
  updateValueProposition, updatePortfolio,
  reapply, todayMDT, extractReferralCode,
  submitAttendance, type AttendanceAvailability,
  saveApplicantIdentity, clearContactId,
} from '@/lib/apiClient';
import { toast } from 'sonner';
import FilePreviewLink from '@/components/common/FilePreviewLink';
import ChangePasswordModal from '@/components/common/ChangePasswordModal';
import HelpCenterModal from '@/components/common/HelpCenterModal';
import ManageDocumentsModal from '@/components/common/ManageDocumentsModal';
import {
  isPersonalInfoValid, isEducationValid, isProfessionalValid, isValuePropositionValid,
  isWorkSetupValid, isComplianceValid, isToolsValid, isSkillsValid,
} from '@/lib/validation/stepValidation';
import dashboardBanner from '@/assets/dashboard-banner.png';


import SearchableSelect from '@/components/common/SearchableSelect';
import PhoneInput from '@/components/common/PhoneInput';
import { COUNTRY_NAMES, NATIONALITIES } from '@/lib/countries';


const emptyProfile: PersonalInfo = {
  firstName: '', middleName: '', lastName: '', suffix: '',
  dateOfBirth: '', phoneNumber: '', phoneCountry: '', languagesSpoken: '',
  houseStreet: '', barangay: '', city: '', address: '',
  country: '', nationality: '', valueProposition: '', photo: null,
};

const emptyEducation: Education = {
  highestLevel: '', schoolName: '', schoolLocation: '', graduationDate: '', degreeField: '',
};

const emptyProfessional: ProfessionalBackground = {
  preferredIndustry: '', preferredRole: '',
  availability: '', schedule: '', hoursPerDay: '',
};

type SectionKey =
  | 'personal'
  | 'education'
  | 'professional'
  | 'workExperience'
  | 'tools'
  | 'skills'
  | 'portfolio'
  | 'certifications'
  | 'valueProp'
  | 'workSetup'
  | 'compliance';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'personal', label: 'Personal Information' },
  { key: 'education', label: 'Education' },
  { key: 'professional', label: 'Professional Background' },
  { key: 'workExperience', label: 'Work Experience' },
  { key: 'tools', label: 'Tools & Platforms Used' },
  { key: 'skills', label: 'Skills & Core Competencies' },
  { key: 'portfolio', label: 'Portfolio / Sample Works' },
  { key: 'certifications', label: 'Certifications / Trainings' },
  { key: 'valueProp', label: 'Value Proposition' },
  { key: 'workSetup', label: 'Work Setup' },
  { key: 'compliance', label: 'Compliance' },
];

// Parse MM/DD/YYYY (MDT) string into a Date.
function parseMDTDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export type DashboardVariant = 'reapply' | 'attendance';

interface DashboardProps { variant?: DashboardVariant }

const Dashboard = ({ variant = 'reapply' }: DashboardProps) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionKey>('personal');
  const [editing, setEditing] = useState(false);
  const contactId = loadContactId();

  // Saved state
  const [profile, setProfile] = useState<PersonalInfo>(emptyProfile);
  const [education, setEducation] = useState<Education>(emptyEducation);
  const [professional, setProfessional] = useState<ProfessionalBackground>(emptyProfessional);
  const [skills, setSkills] = useState<SelectedSkill[]>([]);
  const [tools, setTools] = useState<SelectedTool[]>([]);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [workSetup, setWorkSetup] = useState<WorkSetupData>(emptyWorkSetup);
  const [compliance, setCompliance] = useState<ComplianceFormData>(emptyCompliance);
  const [portfolioLink, setPortfolioLink] = useState<string>('');
  const [portfolioFileNames, setPortfolioFileNames] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dateApplied, setDateApplied] = useState<string>('');
  const [portfolioFileUrls, setPortfolioFileUrls] = useState<Array<{ name: string; url: string }>>([]);
  const [complianceUrls, setComplianceUrls] = useState<{ validId?: string; nbi?: string; police?: string; coe?: string }>({});
  const [workSetupUrls, setWorkSetupUrls] = useState<{ primary: string[]; secondary: string[] }>({ primary: [], secondary: [] });


  // Drafts
  const [draftProfile, setDraftProfile] = useState<PersonalInfo>(emptyProfile);
  const [draftEducation, setDraftEducation] = useState<Education>(emptyEducation);
  const [draftProfessional, setDraftProfessional] = useState<ProfessionalBackground>(emptyProfessional);
  const [draftSkills, setDraftSkills] = useState<SelectedSkill[]>([]);
  const [draftTools, setDraftTools] = useState<SelectedTool[]>([]);
  const [draftWorkExperiences, setDraftWorkExperiences] = useState<WorkExperience[]>([]);
  const [draftCertifications, setDraftCertifications] = useState<Certification[]>([]);
  const [draftWorkSetup, setDraftWorkSetup] = useState<WorkSetupData>(emptyWorkSetup);
  const [draftCompliance, setDraftCompliance] = useState<ComplianceFormData>(emptyCompliance);
  const [draftPortfolioLink, setDraftPortfolioLink] = useState<string>('');
  const [draftPortfolioFiles, setDraftPortfolioFiles] = useState<File[]>([]);
  const [draftPhotoPreview, setDraftPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Header menus & modals
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [manageDocsOpen, setManageDocsOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userMenuOpen]);

  // Reapply modal
  const [reapplyOpen, setReapplyOpen] = useState(false);
  const [reapplyCode, setReapplyCode] = useState('');
  const [reapplying, setReapplying] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [assessmentCooldown, setAssessmentCooldown] = useState(0);
  const [assessmentChecking, setAssessmentChecking] = useState(false);
  const submittingAssessment = assessmentChecking;
  const assessmentRef = useRef<AssessmentStepHandle>(null);
  const [assessmentConfirmOpen, setAssessmentConfirmOpen] = useState(false);
  const [assessmentPhase, setAssessmentPhase] = useState<AssessmentPhase>('loading');


  // Attendance (attendance dashboard variant)
  const [attendanceLoginOpen, setAttendanceLoginOpen] = useState(false);
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
  const handleAttendance = async (
    action: 'login' | 'logout',
    availability: AttendanceAvailability | '' = '',
  ) => {
    if (!contactId) { toast.error('Not signed in.'); return; }
    if (attendanceSubmitting) return;
    setAttendanceSubmitting(true);
    try {
      await submitAttendance(contactId, action, availability, todayMDT());
      toast.success(action === 'login' ? `Logged in: ${availability}` : 'Logged out');
      setAttendanceLoginOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Attendance failed');
    } finally {
      setAttendanceSubmitting(false);
    }
  };



  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditing(false); }, [activeSection]);

  useEffect(() => {
    if (assessmentCooldown <= 0) return;
    const t = window.setInterval(() => setAssessmentCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [assessmentCooldown]);



  // Load dashboard data on mount.
  useEffect(() => {
    if (!contactId) return;
    (async () => {
      try {
        const d = await getDashboard(contactId);
        const pi = d.personal_info || {};
        setProfile({
          ...emptyProfile,
          firstName: pi.first_name || '',
          lastName: pi.last_name || '',
          suffix: pi.suffix || '',
          phoneNumber: pi.phone || '',
          languagesSpoken: pi.languages || '',
          houseStreet: pi.street || '',
          barangay: pi.barangay || '',
          city: pi.city || '',
          nationality: pi.nationality || '',
          valueProposition: d.skills?.value_proposition || '',
        });
        const e = d.education || {};
        setEducation({
          highestLevel: e.education_level || '',
          schoolName: e.school_name || '',
          schoolLocation: e.school_location || '',
          graduationDate: e.graduation_date || '',
          degreeField: e.degree || '',
        });
        const pb = d.professional_background || {};
        setProfessional({
          preferredIndustry: pb.preferred_industry || '',
          preferredRole: pb.preferred_role || '',
          availability: pb.availability || '',
          schedule: pb.availability || '',
          hoursPerDay: pb.hours_per_day || '',
        });
        const sk = (d.skills?.items || []) as Array<{ skill?: string; category?: string; proficiency?: string }>;
        setSkills(sk.filter((s) => s.skill).map((s) => ({
          skill: String(s.skill),
          category: String(s.category || ''),
          proficiency: (s.proficiency as SelectedSkill['proficiency']) || 'Proficient',
        })));
        const tl = (d.tools || []) as Array<{ tool?: string; proficiency?: string }>;
        setTools(tl.filter((t) => t.tool).map((t) => ({
          tool: String(t.tool),
          proficiency: (t.proficiency as SelectedTool['proficiency']) || 'Proficient',
        })));
        const we = (d.work_experience || []) as Array<Record<string, unknown>>;
        setWorkExperiences(we.map((w, i) => ({
          id: String(w.id ?? `we-${i}`),
          title: String(w.title ?? ''),
          employer: String(w.employer ?? ''),
          location: String(w.location ?? ''),
          startDate: String(w.startDate ?? w.start_date ?? ''),
          endDate: String(w.endDate ?? w.end_date ?? ''),
          currentlyWorking: Boolean(w.currentlyWorking ?? w.currently_working ?? false),
          responsibilities: String(w.responsibilities ?? ''),
          toolsPlatforms: String(w.toolsPlatforms ?? w.tools_platforms ?? ''),
        })));
        const ce = (d.certifications || []) as Array<Record<string, unknown>>;
        setCertifications(ce.map((c, i) => ({
          id: String(c.id ?? `ce-${i}`),
          type: String(c.type ?? ''),
          title: String(c.title ?? ''),
          organization: String(c.organization ?? ''),
          dateCompleted: String(c.dateCompleted ?? c.date_completed ?? ''),
          expirationDate: String(c.expirationDate ?? c.expiration_date ?? ''),
          credentialId: String(c.credentialId ?? c.credential_id ?? ''),
          certificate: null,
        })));
        const ws = d.work_setup || {};
        setWorkSetup({
          ...emptyWorkSetup,
          primaryDevice: ws.primary_device || '',
          secondaryDevice: ws.secondary_device || '',
          headset: ws.noise_cancelling_headset === 'Yes',
          webcam: ws.hd_webcam === 'Yes',
          primaryISP: ws.primary_internet || '',
          secondaryISP: ws.secondary_internet || '',
        });
        const co = d.compliance || {};
        setCompliance({
          authorized: co.background_check === 'Yes',
          validId: null,
          nbiClearance: null,
          policeClearance: null,
          proofOfSeparation: null,
          nbiValidity: co.nbi_validity || '',
          policeValidity: co.police_validity || '',
        });
        const pf = d.portfolio || {};
        setPortfolioLink(pf.link || '');
        const pfFiles = Array.isArray(pf.files) ? pf.files : [];
        setPortfolioFileNames(
          pfFiles.map((f) => {
            if (typeof f === 'string') return f;
            const obj = f as { name?: string; file_name?: string; url?: string };
            return obj.name || obj.file_name || obj.url || '';
          }).filter(Boolean),
        );
        setPortfolioFileUrls(
          pfFiles.map((f) => {
            if (typeof f === 'string') return { name: f.split('/').pop() || f, url: f };
            const obj = f as { name?: string; file_name?: string; url?: string };
            const url = obj.url || '';
            return url ? { name: obj.name || obj.file_name || url.split('/').pop() || url, url } : null;
          }).filter((x): x is { name: string; url: string } => !!x),
        );
        // Best-effort: photo URL and file URLs live on the raw dashboard payload.
        const anyD = d as unknown as { personal_info?: Record<string, unknown>; compliance?: Record<string, unknown>; work_setup?: Record<string, unknown> };
        const piRaw = (anyD.personal_info || {}) as Record<string, unknown>;
        const photoUrl = String(piRaw.photo_url || piRaw.photoUrl || piRaw.profile_photo_url || '');
        if (photoUrl) setPhotoPreview(photoUrl);
        const coRaw = (anyD.compliance || {}) as Record<string, unknown>;
        setComplianceUrls({
          validId: String(coRaw.valid_id_url || coRaw.validIdUrl || '') || undefined,
          nbi: String(coRaw.nbi_clearance_url || coRaw.nbiClearanceUrl || '') || undefined,
          police: String(coRaw.police_clearance_url || coRaw.policeClearanceUrl || '') || undefined,
          coe: String(coRaw.proof_of_separation_url || coRaw.proofOfSeparationUrl || '') || undefined,
        });
        const wsRaw = (anyD.work_setup || {}) as Record<string, unknown>;
        const extractUrls = (val: unknown): string[] => {
          if (!Array.isArray(val)) return [];
          return val
            .map((v) => (typeof v === 'string' ? v : (v as { url?: string })?.url || ''))
            .filter(Boolean);
        };
        setWorkSetupUrls({
          primary: extractUrls(wsRaw.primary_device_screenshot_urls ?? wsRaw.primary_device_screenshots),
          secondary: extractUrls(wsRaw.secondary_device_screenshot_urls ?? wsRaw.secondary_device_screenshots),
        });

        // Date Applied — prefer top-level field, fall back to legacy custom field.
        const daRaw = (d as { date_applied?: string }).date_applied;
        const daCustom = (d.custom_fields_raw || []).find((f) => f.id === 'A0IfC6bqqoM4Kv98HTYb')?.value;
        setDateApplied(daRaw || daCustom || '');
        // Cache identity so the Assessment step can launch IMX with real names.
        saveApplicantIdentity({
          email: d.email || '',
          firstName: pi.first_name || '',
          lastName: pi.last_name || '',
        });
      } catch (err) {
        console.warn('getDashboard failed', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {
    setDraftProfile(profile);
    setDraftEducation(education);
    setDraftProfessional(professional);
    setDraftSkills(skills);
    setDraftTools(tools);
    setDraftWorkExperiences(workExperiences);
    setDraftCertifications(certifications);
    setDraftWorkSetup(workSetup);
    setDraftCompliance(compliance);
    setDraftPortfolioLink(portfolioLink);
    setDraftPortfolioFiles([]);
    setDraftPhotoPreview(photoPreview);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!contactId) {
      toast.error('Not signed in.');
      return;
    }
    setSaving(true);
    try {
      switch (activeSection) {
        case 'personal':
          await updatePersonalInfo(contactId, draftProfile);
          setProfile(draftProfile);
          if (draftProfile.photo) {
            const reader = new FileReader();
            reader.onload = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(draftProfile.photo);
          }
          break;
        case 'education':
          await updateEducation(contactId, draftEducation);
          setEducation(draftEducation);
          break;
        case 'professional':
          await updateProfessionalBackground(contactId, draftProfessional);
          setProfessional(draftProfessional);
          break;
        case 'workExperience':
          await updateWorkExperience(contactId, draftWorkExperiences);
          setWorkExperiences(draftWorkExperiences);
          break;
        case 'tools':
          await updateToolsPlatforms(contactId, draftTools);
          setTools(draftTools);
          break;
        case 'skills':
          await updateSkills(contactId, draftSkills, draftProfile.valueProposition);
          setSkills(draftSkills);
          break;
        case 'portfolio':
          await updatePortfolio(contactId, draftPortfolioLink, [], draftPortfolioFiles);
          setPortfolioLink(draftPortfolioLink);
          if (draftPortfolioFiles.length) {
            setPortfolioFileNames(draftPortfolioFiles.map((f) => f.name));
          }
          break;
        case 'certifications':
          await updateCertifications(contactId, draftCertifications);
          setCertifications(draftCertifications);
          break;
        case 'valueProp':
          await updateValueProposition(contactId, draftProfile.valueProposition);
          setProfile({ ...profile, valueProposition: draftProfile.valueProposition });
          break;
        case 'workSetup':
          await updateWorkSetup(contactId, {
            primaryDevice: draftWorkSetup.primaryDevice,
            secondaryDevice: draftWorkSetup.secondaryDevice,
            hasNoiseCancellingHeadset: draftWorkSetup.headset,
            hasHDWebcam: draftWorkSetup.webcam,
            primaryInternetProvider: draftWorkSetup.primaryISP,
            secondaryInternetProvider: draftWorkSetup.secondaryISP,
            primaryISPSpeedtest: draftWorkSetup.primaryISPSpeedtest ?? '',
            secondaryISPSpeedtest: draftWorkSetup.secondaryISPSpeedtest ?? '',
            documents: [],
            deviceScreenshots: draftWorkSetup.deviceScreenshots ?? [],
            secondaryDeviceScreenshots: draftWorkSetup.secondaryDeviceScreenshots ?? [],
            systemSpecs: draftWorkSetup.detectedSpecs ?? { cpu: '', ram: '', storage: '', source: '' },
          });
          setWorkSetup(draftWorkSetup);
          break;
        case 'compliance':
          await updateCompliance(contactId, {
            authorizeBackgroundCheck: draftCompliance.authorized,
            validId: draftCompliance.validId ?? null,
            nbiClearance: draftCompliance.nbiClearance ?? null,
            policeClearance: draftCompliance.policeClearance ?? null,
            proofOfSeparation: draftCompliance.proofOfSeparation ?? null,
            nbiValidity: draftCompliance.nbiValidity,
            policeValidity: draftCompliance.policeValidity,
          });
          setCompliance(draftCompliance);
          break;
      }
      toast.success('Saved');
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (field: keyof PersonalInfo, value: string) => {
    setDraftProfile({ ...draftProfile, [field]: value });
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDraftProfile({ ...draftProfile, photo: file });
    const reader = new FileReader();
    reader.onload = () => setDraftPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const fullName =
    [profile.firstName, profile.middleName, profile.lastName, profile.suffix]
      .filter(Boolean)
      .join(' ') || 'Your Name';

  // Reapply countdown
  const appliedDate = parseMDTDate(dateApplied);
  const daysSince = appliedDate
    ? Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysLeft = daysSince !== null ? Math.max(0, 60 - daysSince) : null;
  // Section completeness (excludes work experience, certifications, portfolio)
  const sectionChecks = useMemo(() => {
    // Build a synthetic PersonalInfo/etc for validators
    const wsForCheck = {
      primaryDevice: workSetup.primaryDevice,
      hasNoiseCancellingHeadset: workSetup.headset,
      hasHDWebcam: workSetup.webcam,
      secondaryDevice: workSetup.secondaryDevice,
      primaryInternetProvider: workSetup.primaryISP,
      secondaryInternetProvider: workSetup.secondaryISP,
      primaryISPSpeedtest: workSetup.primaryISPSpeedtest ?? '',
      secondaryISPSpeedtest: workSetup.secondaryISPSpeedtest ?? '',
      documents: [],
      deviceScreenshots: workSetup.deviceScreenshots ?? [],
      secondaryDeviceScreenshots: workSetup.secondaryDeviceScreenshots ?? [],
      systemSpecs: { cpu: '', ram: '', storage: '', source: '' as const },
    };
    const complianceForCheck = {
      authorizeBackgroundCheck: compliance.authorized,
      validId: compliance.validId ?? null,
      nbiClearance: compliance.nbiClearance ?? null,
      policeClearance: compliance.policeClearance ?? null,
      proofOfSeparation: compliance.proofOfSeparation ?? null,
      nbiValidity: compliance.nbiValidity,
      policeValidity: compliance.policeValidity,
    };
    return {
      personal: isPersonalInfoValid(profile),
      education: isEducationValid(education),
      professional: isProfessionalValid(professional),
      tools: isToolsValid(tools),
      skills: isSkillsValid(skills),
      valueProp: isValuePropositionValid(profile.valueProposition),
      workSetup: isWorkSetupValid(wsForCheck),
      compliance: isComplianceValid(complianceForCheck),
    };
  }, [profile, education, professional, tools, skills, workSetup, compliance]);

  const completedCount = Object.values(sectionChecks).filter(Boolean).length;
  const totalCount = Object.keys(sectionChecks).length;
  const completionPct = Math.round((completedCount / totalCount) * 100);

  // Ordered list of incomplete sections (for the Next Step card)
  const incompleteSections: { key: SectionKey; label: string }[] = ([
    ['personal', 'Personal Information'],
    ['education', 'Education'],
    ['professional', 'Professional Background'],
    ['tools', 'Tools & Platforms Used'],
    ['skills', 'Skills & Core Competencies'],
    ['valueProp', 'Value Proposition'],
    ['workSetup', 'Work Setup'],
    ['compliance', 'Compliance'],
  ] as Array<[SectionKey, string]>)
    .filter(([k]) => !sectionChecks[k as keyof typeof sectionChecks])
    .map(([key, label]) => ({ key, label }));

  const coreReapplyReady =
    sectionChecks.personal && sectionChecks.education && sectionChecks.professional
    && sectionChecks.valueProp && sectionChecks.workSetup;
  const canReapply = (daysSince === null || daysSince >= 60) && coreReapplyReady;

  const handleReapplyClick = () => {
    if (!canReapply) return;
    setReapplyCode('');
    setAssessmentDone(false);
    setAssessmentOpen(true);
  };





  const submitReapply = async () => {
    if (!contactId) {
      toast.error('Not signed in.');
      return;
    }
    if (!assessmentDone) {
      toast.error('Please complete the Values Assessment first.');
      setReapplyOpen(false);
      setAssessmentOpen(true);
      return;
    }
    setReapplying(true);
    try {
      const code = extractReferralCode(reapplyCode);
      await reapply(contactId, code, todayMDT());
      toast.success('Reapplication submitted');
      setReapplyOpen(false);
      setDateApplied(todayMDT());
      navigate('/');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reapply failed');
    } finally {
      setReapplying(false);
    }
  };


  const isEditableSection = true;

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo className="h-11 w-auto" variant="black" />
          <div className="flex items-center gap-3">
            {variant === 'reapply' && canReapply && (
              <button
                onClick={handleReapplyClick}
                title="Reapply"
                className="btn-primary text-sm px-5 py-2"
              >
                Reapply
              </button>
            )}
            {variant === 'reapply' && !canReapply && daysLeft !== null && daysLeft > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground bg-muted px-2.5 py-1.5 rounded-md whitespace-nowrap">
                <Clock className="w-3.5 h-3.5" />
                Reapply in {daysLeft} day{daysLeft === 1 ? '' : 's'}
              </span>
            )}
            {variant === 'attendance' && (
              <>
                <button
                  onClick={() => setAttendanceLoginOpen(true)}
                  disabled={attendanceSubmitting}
                  className="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Login
                </button>
                <button
                  onClick={() => handleAttendance('logout')}
                  disabled={attendanceSubmitting}
                  className="btn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Logout
                </button>
              </>
            )}

            {/* User chip + dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-muted transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-border">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground max-w-[160px] truncate">
                  {fullName}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-lg border border-border shadow-lg py-1 z-50">
                  <button
                    onClick={() => { setUserMenuOpen(false); setChangePwOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <Lock className="w-4 h-4 text-muted-foreground" /> Change Password
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); setHelpOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <HelpCircle className="w-4 h-4 text-muted-foreground" /> Help Center
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => { clearContactId(); navigate('/'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Welcome banner */}
        <div
          className="relative rounded-2xl overflow-hidden mb-6 bg-primary text-primary-foreground bg-cover bg-right"
          style={{ backgroundImage: `url(${dashboardBanner})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/70 to-transparent pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 p-6 sm:p-8 items-center">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/95 overflow-hidden flex items-center justify-center shrink-0 border-4 border-white/60 shadow-md">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-primary/60" />
                )}
                <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-white">
                  <Camera className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p className="text-sm opacity-90">Welcome back,</p>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold">{fullName}</h1>
                <p className="text-sm opacity-90 mt-1 max-w-md">
                  You're doing great! Complete your profile to increase your chances of getting
                  matched with the right opportunity.
                </p>
              </div>
            </div>
            {variant === 'reapply' && (
              <div className="bg-white/10 backdrop-blur rounded-xl p-5 min-w-[220px]">
                <p className="text-sm opacity-90 mb-1">Profile Completion</p>
                <p className="font-heading text-4xl font-bold leading-none mb-3">{completionPct}%</p>
                <div className="w-full h-2 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <p className="text-xs opacity-90 mt-2">
                  {completionPct === 100 ? 'All set — nice work!' : 'Great progress! Keep it up.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className={`grid grid-cols-1 ${variant === 'reapply' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6`}>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Documents</p>
              <p className="font-heading text-xl font-bold text-foreground">
                {(portfolioFileUrls.length
                  + Object.values(complianceUrls).filter(Boolean).length
                  + workSetupUrls.primary.length + workSetupUrls.secondary.length)} Uploaded
              </p>
              <button onClick={() => setManageDocsOpen(true)} className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-1 hover:underline">
                Manage Documents <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {variant === 'reapply' && (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Next Step</p>
                <p className="font-heading text-base font-bold text-foreground truncate">
                  {incompleteSections[0]?.label ?? 'All complete!'}
                </p>
                {incompleteSections.length > 0 ? (
                  <button
                    onClick={() => setActiveSection(incompleteSections[0].key)}
                    className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-1 hover:underline"
                  >
                    Start Now <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Every required step is filled in.</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="font-heading text-base font-bold text-foreground">
                {lastUpdated
                  ? lastUpdated.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                  : '—'}
              </p>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mt-1">
                  {lastUpdated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <div className="space-y-4">
            <nav className="bg-card rounded-2xl border border-border shadow-sm p-2 h-fit">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === s.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
            <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
              <p className="font-heading text-sm font-bold text-primary mb-1">Need Help?</p>
              <p className="text-xs text-muted-foreground mb-3">
                Visit our Help Center for guides and FAQs.
              </p>
              <button
                onClick={() => setHelpOpen(true)}
                className="btn-outline w-full text-sm inline-flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4" /> Go to Help Center
              </button>
            </div>
          </div>


          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <h2 className="font-heading text-xl font-bold text-foreground">
                {SECTIONS.find((s) => s.key === activeSection)?.label}
              </h2>
              {isEditableSection && (
                !editing ? (
                  <button onClick={startEdit} className="btn-outline text-sm inline-flex items-center gap-2">
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={cancelEdit} disabled={saving} className="btn-outline text-sm inline-flex items-center gap-2">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={saveEdit} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-2">
                      <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )
              )}
            </div>

            {activeSection === 'personal' && (
              editing ? (
                <PersonalInfoStep data={draftProfile} onChange={setDraftProfile} />
              ) : (
                <PersonalView profile={profile} />
              )
            )}

            {activeSection === 'education' && (
              editing ? (
                <EducationStep data={draftEducation} onChange={setDraftEducation} />
              ) : (
                <EducationView data={education} />
              )
            )}

            {activeSection === 'professional' && (
              editing ? (
                <ProfessionalBgStep data={draftProfessional} onChange={setDraftProfessional} />
              ) : (
                <ProfessionalView data={professional} />
              )
            )}

            {activeSection === 'workExperience' && (
              editing ? (
                <WorkExperienceStep data={draftWorkExperiences} onChange={setDraftWorkExperiences} />
              ) : (
                <WorkExperienceView data={workExperiences} />
              )
            )}

            {activeSection === 'tools' && (
              editing ? (
                <ToolsStep
                  data={draftTools}
                  onChange={setDraftTools}
                  selectedRoles={professional.preferredRole}
                />
              ) : (
                <ToolsView data={tools} />
              )
            )}

            {activeSection === 'skills' && (
              editing ? (
                <SkillsStep
                  data={draftSkills}
                  onChange={setDraftSkills}
                  valueProposition={draftProfile.valueProposition}
                  onValuePropositionChange={(v) =>
                    setDraftProfile({ ...draftProfile, valueProposition: v })
                  }
                />
              ) : (
                <SkillsView data={skills} />
              )
            )}

            {activeSection === 'portfolio' && (
              editing ? (
                <PortfolioStep
                  portfolioLink={draftPortfolioLink}
                  onPortfolioLinkChange={setDraftPortfolioLink}
                  onFilesChange={setDraftPortfolioFiles}
                />
              ) : (
                <div className="space-y-4">
                  {portfolioLink ? (
                    <div>
                      <h3 className="font-heading text-base font-semibold text-foreground mb-1">Portfolio Link</h3>
                      <a
                        href={portfolioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {portfolioLink}
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No portfolio link provided.</p>
                  )}
                  {portfolioFileNames.length > 0 && (
                    <div>
                      <h3 className="font-heading text-base font-semibold text-foreground mb-2">Uploaded Files</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {portfolioFileNames.map((n, i) => (
                          <li key={`${n}-${i}`} className="text-sm text-foreground">{n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            )}

            {activeSection === 'certifications' && (
              editing ? (
                <CertificationsStep data={draftCertifications} onChange={setDraftCertifications} />
              ) : (
                <CertificationsView data={certifications} />
              )
            )}

            {activeSection === 'valueProp' && (
              editing ? (
                <ValuePropositionStep
                  value={draftProfile.valueProposition}
                  onChange={(v) => setDraftProfile({ ...draftProfile, valueProposition: v })}
                />
              ) : (
                profile.valueProposition ? (
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {profile.valueProposition}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No value proposition provided.</p>
                )
              )
            )}

            {activeSection === 'workSetup' && (
              editing ? (
                <WorkSetupStep data={draftWorkSetup} onChange={setDraftWorkSetup} />
              ) : (
                <div className="space-y-6">
                  <WorkSetupView data={workSetup} />
                  {(workSetupUrls.primary.length > 0 || workSetupUrls.secondary.length > 0) && (
                    <div className="space-y-3">
                      {workSetupUrls.primary.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Primary Device Screenshots</p>
                          <div className="flex flex-wrap gap-2">
                            {workSetupUrls.primary.map((u, i) => <FilePreviewLink key={`p-${i}`} url={u} />)}
                          </div>
                        </div>
                      )}
                      {workSetupUrls.secondary.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Secondary Device Screenshots</p>
                          <div className="flex flex-wrap gap-2">
                            {workSetupUrls.secondary.map((u, i) => <FilePreviewLink key={`s-${i}`} url={u} />)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            )}

            {activeSection === 'compliance' && (
              editing ? (
                <ComplianceStep data={draftCompliance} onChange={setDraftCompliance} />
              ) : (
                <div className="space-y-6">
                  <ComplianceView data={compliance} />
                  {(complianceUrls.validId || complianceUrls.nbi || complianceUrls.police || complianceUrls.coe) && (
                    <div className="flex flex-wrap gap-2">
                      {complianceUrls.validId && <FilePreviewLink url={complianceUrls.validId} label="Valid ID" />}
                      {complianceUrls.nbi && <FilePreviewLink url={complianceUrls.nbi} label="NBI Clearance" />}
                      {complianceUrls.police && <FilePreviewLink url={complianceUrls.police} label="Police Clearance" />}
                      {complianceUrls.coe && <FilePreviewLink url={complianceUrls.coe} label="Proof of Separation / COE" />}
                    </div>
                  )}
                </div>
              )
            )}

          </div>
        </div>
      </main>

      <Dialog open={assessmentOpen} onOpenChange={(o) => { if (!submittingAssessment) setAssessmentOpen(o); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assessment</DialogTitle>
            <DialogDescription>
              Please complete the embedded Values and DISC assessments below to continue with your reapplication.
            </DialogDescription>
          </DialogHeader>
          <AssessmentStep
            ref={assessmentRef}
            contactId={contactId ?? ''}
            email={profile.valueProposition ? undefined : undefined}
            firstName={profile.firstName}
            lastName={profile.lastName}
            onPhaseChange={setAssessmentPhase}
            onCompleted={() => setAssessmentDone(true)}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setAssessmentOpen(false)}
              disabled={submittingAssessment}
              className="btn-outline"
            >
              Close
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!assessmentRef.current || assessmentChecking || assessmentCooldown > 0) return;
                setAssessmentChecking(true);
                try {
                  const result = await assessmentRef.current.checkAndAdvance();
                  if (result === 'advance') {
                    setAssessmentDone(true);
                    setAssessmentOpen(false);
                    setAssessmentConfirmOpen(true);
                  } else if (result === 'stay') {
                    toast.info('Values complete — please finish the DISC assessment.');
                  } else {
                    setAssessmentCooldown(30);
                    toast.info('Your assessment is not yet complete. You can try again shortly.');
                  }
                } finally {
                  setAssessmentChecking(false);
                }
              }}
              disabled={submittingAssessment || assessmentCooldown > 0}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {(assessmentChecking || assessmentCooldown > 0) && <Loader2 className="w-4 h-4 animate-spin" />}
              {assessmentChecking
                ? 'Checking…'
                : assessmentCooldown > 0
                  ? `Try again in ${assessmentCooldown}s`
                  : assessmentPhase === 'disc' ? 'Submit' : 'Next'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={assessmentConfirmOpen} onOpenChange={setAssessmentConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assessment submitted</DialogTitle>
            <DialogDescription>
              Thank you. Your Values Assessment has been recorded. You can now
              continue with your reapplication.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setAssessmentConfirmOpen(false)}
              className="btn-outline"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setAssessmentConfirmOpen(false);
                setReapplyOpen(true);
              }}
              className="btn-primary"
            >
              Continue to Reapply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance: Login availability picker */}
      <Dialog open={attendanceLoginOpen} onOpenChange={(o) => { if (!attendanceSubmitting) setAttendanceLoginOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login — select availability</DialogTitle>
            <DialogDescription>
              Choose what you are available for today. Your selection will be
              recorded with today's date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {([
              'available for training only',
              'available for client matching only',
              'available for both client and training',
            ] as AttendanceAvailability[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleAttendance('login', opt)}
                disabled={attendanceSubmitting}
                className="w-full text-left btn-outline px-4 py-3 capitalize disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {opt}
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setAttendanceLoginOpen(false)}
              disabled={attendanceSubmitting}
              className="btn-outline"
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>





      <Dialog open={reapplyOpen} onOpenChange={setReapplyOpen}>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reapply</DialogTitle>
            <DialogDescription>
              Will you be applying using a referral code? You can paste a referral link
              (with <code>?ref=</code>) or just the code itself. Leave blank if none.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="form-label">Referral code or link (optional)</label>
            <input
              type="text"
              placeholder="e.g. ABC123 or https://...?ref=ABC123"
              value={reapplyCode}
              onChange={(e) => setReapplyCode(e.target.value)}
              className="form-input"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setReapplyOpen(false)}
              disabled={reapplying}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitReapply}
              disabled={reapplying}
              className="btn-primary"
            >
              {reapplying ? 'Submitting...' : 'Submit Reapplication'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

const EmptySectionView = ({ label }: { label: string }) => (
  <div className="text-center py-12">
    <p className="text-sm text-muted-foreground italic">
      No {label} information saved yet. Click <span className="font-medium text-foreground">Edit</span> to add details.
    </p>
  </div>
);

const isWorkSetupEmpty = (d: WorkSetupData) =>
  !d.primaryDevice && !d.secondaryDevice && !d.primaryISP && !d.secondaryISP && !d.headset && !d.webcam;

const WorkSetupView = ({ data }: { data: WorkSetupData }) => {
  if (isWorkSetupEmpty(data)) return <EmptySectionView label="work setup" />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Primary Device" value={data.primaryDevice} />
        <Field label="Secondary Device" value={data.secondaryDevice} />
        <Field label="Noise-cancelling Headset" value={data.headset ? 'Yes' : 'No'} />
        <Field label="HD Webcam" value={data.webcam ? 'Yes' : 'No'} />
        <Field label="Primary Internet Provider" value={data.primaryISP} />
        <Field label="Secondary Internet Provider" value={data.secondaryISP} />
      </div>
    </div>
  );
};

const isComplianceEmpty = (d: ComplianceFormData) =>
  !d.authorized && !d.nbiValidity && !d.policeValidity && !d.proofOfSeparation;

const ComplianceView = ({ data }: { data: ComplianceFormData }) => {
  if (isComplianceEmpty(data)) return <EmptySectionView label="compliance" />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Background Check Authorized" value={data.authorized ? 'Yes' : 'No'} />
        <Field label="NBI Clearance Valid Until" value={data.nbiValidity} />
        <Field label="Police Clearance Valid Until" value={data.policeValidity} />
        <Field
          label="Proof of Separation / COE"
          value={data.proofOfSeparation?.name ? data.proofOfSeparation.name : ''}
        />
      </div>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm text-foreground">
      {value || <span className="text-muted-foreground italic">Not provided</span>}
    </p>
  </div>
);

const PersonalView = ({ profile }: { profile: PersonalInfo }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
      <Field label="First Name" value={profile.firstName} />
      <Field label="Middle Name" value={profile.middleName} />
      <Field label="Last Name" value={profile.lastName} />
      <Field label="Suffix" value={profile.suffix} />
      <Field label="Date of Birth" value={profile.dateOfBirth} />
      <Field label="Phone Number" value={profile.phoneNumber} />
      <Field label="Languages Spoken" value={profile.languagesSpoken} />
      <Field label="House No. / Street" value={profile.houseStreet} />
      <Field label="Barangay" value={profile.barangay} />
      <Field label="City / Province" value={profile.city} />
      <Field label="Country" value={profile.country} />
      <Field label="Nationality" value={profile.nationality} />
    </div>
  </div>
);

const EducationView = ({ data }: { data: Education }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
    <Field label="Highest Level" value={data.highestLevel} />
    <Field label="Degree / Field" value={data.degreeField} />
    <Field label="School Name" value={data.schoolName} />
    <Field label="School Location" value={data.schoolLocation} />
    <Field label="Graduation Date" value={data.graduationDate} />
  </div>
);

const ProfessionalView = ({ data }: { data: ProfessionalBackground }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      <Field label="Preferred Industry" value={data.preferredIndustry} />
      <Field label="Preferred Role" value={data.preferredRole} />
      <Field label="Availability" value={data.schedule} />
      <Field label="Hours Per Day" value={data.hoursPerDay} />
    </div>
  </div>
);

const WorkExperienceView = ({ data }: { data: WorkExperience[] }) => (
  data.length === 0 ? (
    <p className="text-sm text-muted-foreground italic">No work experience added yet.</p>
  ) : (
    <div className="space-y-4">
      {data.map((w) => (
        <div key={w.id} className="border border-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{w.title || 'Untitled role'}</p>
              <p className="text-xs text-muted-foreground">
                {w.employer || 'Employer'}{w.location ? ` · ${w.location}` : ''}
              </p>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {w.startDate || '—'} – {w.currentlyWorking ? 'Present' : (w.endDate || '—')}
            </p>
          </div>
          {w.responsibilities && (
            <p className="text-sm text-foreground mt-2 whitespace-pre-line">{w.responsibilities}</p>
          )}
          {w.toolsPlatforms && (
            <p className="text-xs text-muted-foreground mt-2"><span className="font-medium">Tools:</span> {w.toolsPlatforms}</p>
          )}
        </div>
      ))}
    </div>
  )
);

const CertificationsView = ({ data }: { data: Certification[] }) => (
  data.length === 0 ? (
    <p className="text-sm text-muted-foreground italic">No certifications added yet.</p>
  ) : (
    <div className="space-y-3">
      {data.map((c) => (
        <div key={c.id} className="border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground">{c.title || 'Untitled certification'}</p>
          <p className="text-xs text-muted-foreground">{c.organization || 'Issuer'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
            {c.dateCompleted && <span><span className="font-medium">Completed:</span> {c.dateCompleted}</span>}
            {c.expirationDate && <span><span className="font-medium">Expires:</span> {c.expirationDate}</span>}
            {c.credentialId && <span><span className="font-medium">ID:</span> {c.credentialId}</span>}
          </div>
        </div>
      ))}
    </div>
  )
);

const SkillsView = ({ data }: { data: SelectedSkill[] }) => (
  data.length === 0 ? (
    <p className="text-sm text-muted-foreground italic">No skills added yet.</p>
  ) : (
    <div className="flex flex-wrap gap-2">
      {data.map((s) => (
        <span key={s.skill} className="skill-chip skill-chip-active">
          {s.skill} — {s.proficiency}
        </span>
      ))}
    </div>
  )
);

const ToolsView = ({ data }: { data: SelectedTool[] }) => (
  data.length === 0 ? (
    <p className="text-sm text-muted-foreground italic">No tools or platforms added yet.</p>
  ) : (
    <div className="flex flex-wrap gap-2">
      {data.map((t) => (
        <span key={t.tool} className="skill-chip skill-chip-active">
          {t.tool} — {t.proficiency}
        </span>
      ))}
    </div>
  )
);

const PersonalEditForm = ({
  draft,
  update,
  onPhotoChange,
  photoInputRef,
}: {
  draft: PersonalInfo;
  update: (field: keyof PersonalInfo, value: string) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoInputRef: React.RefObject<HTMLInputElement>;
}) => (
  <div className="space-y-6">
    <div>
      <label className="form-label">Profile Photo</label>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={onPhotoChange}
        className="text-sm"
      />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div><label className="form-label">First Name</label><input className="form-input" value={draft.firstName} onChange={(e) => update('firstName', e.target.value)} /></div>
      <div><label className="form-label">Middle Name</label><input className="form-input" value={draft.middleName} onChange={(e) => update('middleName', e.target.value)} /></div>
      <div><label className="form-label">Last Name</label><input className="form-input" value={draft.lastName} onChange={(e) => update('lastName', e.target.value)} /></div>
      <div><label className="form-label">Suffix</label><input className="form-input" value={draft.suffix} onChange={(e) => update('suffix', e.target.value)} /></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div><label className="form-label">Date of Birth</label><input type="date" className="form-input" value={draft.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} /></div>
      <div className="lg:col-span-2">
        <label className="form-label">Phone Number</label>
        <PhoneInput
          value={draft.phoneNumber}
          onChange={(v) => update('phoneNumber', v)}
          countryName={draft.phoneCountry}
          onCountryChange={(c) => update('phoneCountry', c)}
        />
      </div>
      <div><label className="form-label">Languages Spoken</label><input className="form-input" value={draft.languagesSpoken} onChange={(e) => update('languagesSpoken', e.target.value)} /></div>
      <div>
        <label className="form-label">Country</label>
        <SearchableSelect value={draft.country} onChange={(v) => update('country', v)} options={COUNTRY_NAMES} placeholder="Select country..." />
      </div>
      <div>
        <label className="form-label">Nationality</label>
        <SearchableSelect value={draft.nationality} onChange={(v) => update('nationality', v)} options={NATIONALITIES} placeholder="Select nationality..." />
      </div>
      {draft.country === 'Philippines' ? (
        <>
          <div><label className="form-label">House No. / Street</label><input className="form-input" value={draft.houseStreet} onChange={(e) => update('houseStreet', e.target.value)} /></div>
          <div><label className="form-label">Barangay</label><input className="form-input" value={draft.barangay} onChange={(e) => update('barangay', e.target.value)} /></div>
          <div><label className="form-label">City / Province</label><input className="form-input" value={draft.city} onChange={(e) => update('city', e.target.value)} /></div>
        </>
      ) : (
        <div className="sm:col-span-2 lg:col-span-3"><label className="form-label">Address</label><input className="form-input" value={draft.address} onChange={(e) => update('address', e.target.value)} /></div>
      )}
    </div>
  </div>
);

export default Dashboard;
