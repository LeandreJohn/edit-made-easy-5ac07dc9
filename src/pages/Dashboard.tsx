import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ErrorRetry from '@/components/common/ErrorRetry';
import SectionSkeleton from '@/components/common/SectionSkeleton';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useNavigate } from '@/lib/router-compat';
import {
  Pencil, X, Save, User, LogOut, Clock, Loader2, ChevronDown, Lock, HelpCircle,
  FileText, ArrowRight, GraduationCap, Briefcase, Wrench, Sparkles, Lightbulb,
  Monitor, ShieldCheck, PlayCircle, FolderKanban, Award, BadgeCheck, Bell, ClipboardCheck, Check,
  type LucideIcon,
} from 'lucide-react';
import { notificationsForTags } from '@/data/tagNotifications';
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
import IntroVideoModal from '@/components/wizard/IntroVideoModal';
import { getEntryPath, getEntryRef } from '@/lib/headhunting';
import { trackApplicationLead } from '@/lib/tracking';
import HelpCenterModal from '@/components/common/HelpCenterModal';
import ManageDocumentsModal from '@/components/common/ManageDocumentsModal';
import {
  isPersonalInfoValid, isEducationValid, isProfessionalValid, isValuePropositionValid,
  isWorkSetupValid, isComplianceValid, isToolsValid, isSkillsValid,
  normalizeGraduation, formatGraduation,
} from '@/lib/validation/stepValidation';
import { formatDateDenver, formatTimeDenver } from '@/lib/date';


import dashboardBanner from '@/assets/dashboard-banner.png';


import SearchableSelect from '@/components/common/SearchableSelect';
import { parseSocialLinks } from '@/components/common/SocialLinksInput';
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

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: 'personal', label: 'Personal Information', icon: User },
  { key: 'education', label: 'Education', icon: GraduationCap },
  { key: 'professional', label: 'Professional Background', icon: Briefcase },
  { key: 'workExperience', label: 'Work Experience', icon: BadgeCheck },
  { key: 'tools', label: 'Tools & Platforms Used', icon: Wrench },
  { key: 'skills', label: 'Skills & Core Competencies', icon: Sparkles },
  { key: 'portfolio', label: 'Portfolio / Sample Works', icon: FolderKanban },
  { key: 'certifications', label: 'Certifications / Trainings', icon: Award },
  { key: 'valueProp', label: 'Value Proposition', icon: Lightbulb },
  { key: 'workSetup', label: 'Work Setup', icon: Monitor },
  { key: 'compliance', label: 'Compliance', icon: ShieldCheck },
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
  const [activeSection, setActiveSection] = useState<SectionKey>(() => {
    // Remembered in session state only — never in the URL, so dashboard
    // sections can't be copied out of the address bar and shared.
    try {
      const saved = sessionStorage.getItem('cb_dashboard_section');
      if (saved) return saved as SectionKey;
    } catch { /* ignore */ }
    return 'personal';
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  /** Backend `last_stage_date_changed` — drives Apply Now vs Reapply. */
  const [lastStageDateChanged, setLastStageDateChanged] = useState<string>('');

  const [portfolioFileUrls, setPortfolioFileUrls] = useState<Array<{ name: string; url: string }>>([]);
  const [complianceUrls, setComplianceUrls] = useState<{
    validIdFiles: string[]; nbiFiles: string[]; policeFiles: string[]; coeFiles: string[];
  }>({ validIdFiles: [], nbiFiles: [], policeFiles: [], coeFiles: [] });
  const [validIdLabel, setValidIdLabel] = useState('');
  const [canDoAssessment, setCanDoAssessment] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
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
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  // Tracks whether the background-check warning has already been shown for this
  // compliance edit — a second save attempt goes through unauthorized.
  const authWarnedRef = useRef(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
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
  const [assessmentCooldown, setAssessmentCooldown] = useState(0);
  const [assessmentChecking, setAssessmentChecking] = useState(false);
  const submittingAssessment = assessmentChecking;
  const assessmentRef = useRef<AssessmentStepHandle>(null);
  const [assessmentConfirmOpen, setAssessmentConfirmOpen] = useState(false);
  const [assessmentPhase, setAssessmentPhase] = useState<AssessmentPhase>('loading');

  /**
   * True once the applicant finishes the assessment in *this* browser session.
   * Apply/Reapply only appears afterwards, and the assessment can't be retaken
   * until a fresh session.
   */
  const assessmentDoneKey = `cb_assessment_done_${contactId ?? 'anon'}`;
  const [assessmentDone, setAssessmentDone] = useState<boolean>(() => {
    try { return sessionStorage.getItem(`cb_assessment_done_${loadContactId() ?? 'anon'}`) === '1'; }
    catch { return false; }
  });
  const markAssessmentDone = () => {
    try { sessionStorage.setItem(assessmentDoneKey, '1'); } catch { /* ignore */ }
    setAssessmentDone(true);
  };

  /** Wrapper around the active section body so we can focus invalid fields. */
  const sectionBodyRef = useRef<HTMLDivElement>(null);



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

  useEffect(() => {
    setEditing(false);
    authWarnedRef.current = false;
    try { sessionStorage.setItem('cb_dashboard_section', activeSection); } catch { /* ignore */ }
  }, [activeSection]);

  useEffect(() => {
    if (draftCompliance?.authorized) authWarnedRef.current = false;
  }, [draftCompliance?.authorized]);

  useEffect(() => {
    if (assessmentCooldown <= 0) return;
    const t = window.setInterval(() => setAssessmentCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [assessmentCooldown]);



  // Load dashboard data on mount.
  const loadData = useCallback(async (silent = false) => {
    if (!contactId) { setLoading(false); return; }
    if (!silent) setLoading(true);
    setLoadError(null);

    {
      try {
        const d = await getDashboard(contactId);
        const pi = (d.personal_info || {}) as Record<string, unknown>;
        const str = (v: unknown) => (v == null ? '' : String(v));
        // Non-PH applicants only get a composed one-line address from the backend.
        const composedAddress = str(pi.address);
        setProfile({
          ...emptyProfile,
          firstName: str(pi.first_name),
          middleName: str(pi.middle_name),
          lastName: str(pi.last_name),
          suffix: str(pi.suffix),
          dateOfBirth: str(pi.date_of_birth),
          phoneNumber: str(pi.phone),
          languagesSpoken: str(pi.languages),
          houseStreet: str(pi.street),
          barangay: str(pi.barangay),
          city: str(pi.city),
          stateRegion: str(pi.state_region),
          postalCode: str(pi.postal_code),
          address: composedAddress,
          country: str(pi.country),
          nationality: str(pi.nationality),
          socialLinks: str(pi.social_links ?? pi.Social_Link),
          referredBy: str(pi['Referred By'] ?? pi.referred_by ?? pi.ref),
          referralLink: str(pi.referral_link),

          valueProposition: str(d.skills?.value_proposition),
        });
        const e = d.education || {};
        setEducation({
          highestLevel: e.education_level || '',
          schoolName: e.school_name || '',
          schoolLocation: e.school_location || '',
          graduationDate: normalizeGraduation(e.graduation_date),
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
        // Skills: the backend sends a richer `structured` array when available.
        const structured = (d.skills?.structured || []) as Array<Record<string, unknown>>;
        const flat = (d.skills?.items || []) as Array<Record<string, unknown>>;
        const skillSource = structured.length ? structured : flat;
        setSkills(
          skillSource
            .map((s) => ({
              skill: str(s.skill ?? s.name),
              category: str(s.category),
              proficiency: (str(s.level ?? s.proficiency) || 'Proficient') as SelectedSkill['proficiency'],
            }))
            .filter((s) => s.skill),
        );
        const tl = (d.tools || []) as Array<Record<string, unknown>>;
        setTools(
          tl
            .map((t) => ({
              tool: str(t.name ?? t.tool),
              proficiency: (str(t.experience ?? t.proficiency) || 'Proficient') as SelectedTool['proficiency'],
            }))
            .filter((t) => t.tool),
        );
        const we = (d.work_experience || []) as Array<Record<string, unknown>>;
        setWorkExperiences(we.map((w, i) => ({
          id: str(w.id) || `we-${i}`,
          title: str(w.position ?? w.title),
          employer: str(w.company ?? w.employer),
          location: str(w.location),
          startDate: str(w.start_date ?? w.startDate),
          endDate: str(w.end_date ?? w.endDate),
          currentlyWorking: Boolean(w.currently_working ?? w.currentlyWorking ?? false),
          responsibilities: str(w.description ?? w.responsibilities),
          toolsPlatforms: str(w.tools_platforms ?? w.toolsPlatforms),
          employmentType: str(w.employment_type),
        })));
        const ce = (d.certifications || []) as Array<Record<string, unknown>>;
        setCertifications(ce.map((c, i) => ({
          id: str(c.id) || `ce-${i}`,
          type: str(c.type),
          title: str(c.title),
          organization: str(c.issuer ?? c.organization),
          dateCompleted: str(c.date ?? c.dateCompleted ?? c.date_completed),
          expirationDate: str(c.expirationDate ?? c.expiration_date),
          credentialId: str(c.credentialId ?? c.credential_id),
          certificate: null,
        })));
        const ws = (d.work_setup || {}) as Record<string, unknown>;
        const yes = (v: unknown) => String(v ?? '').trim().toLowerCase() === 'yes';
        setWorkSetup({
          ...emptyWorkSetup,
          primaryDevice: str(ws.primary_device),
          secondaryDevice: str(ws.secondary_device),
          headset: yes(ws.has_noise_cancelling_headset ?? ws.noise_cancelling_headset),
          webcam: yes(ws.has_hd_webcam ?? ws.hd_webcam),
          primaryISP: str(ws.primary_internet_provider ?? ws.primary_internet),
          secondaryISP: str(ws.secondary_internet_provider ?? ws.secondary_internet),
          primaryISPSpeedtest: str(ws.primary_internet_provider_sharable_link),
          secondaryISPSpeedtest: str(ws.secondary_internet_provider_sharable_link),
          detectedSpecs: {
            cpu: str(ws.detected_cpu),
            ram: str(ws.detected_ram),
            storage: str(ws.detected_storage),
            source: (str(ws.detection_source) || '') as 'detected' | 'denied' | 'mobile' | '',
          },
        });
        const co = (d.compliance || {}) as Record<string, unknown>;
        setCompliance({
          authorized: yes(co.background_check),
          validId: null,
          nbiClearance: null,
          policeClearance: null,
          proofOfSeparation: null,
          nbiValidity: str(co.nbi_validity),
          policeValidity: str(co.police_validity),
        });
        const pf = d.portfolio || {};
        setPortfolioLink(pf.link || '');
        const pfFiles = Array.isArray(pf.files) ? pf.files : [];
        setPortfolioFileNames(
          pfFiles.map((f) => {
            if (typeof f === 'string') return f.split('/').pop() || f;
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

        // Profile photo lives at the top level of the payload.
        const photoUrl = str(d.profile_picture) || str(pi.photo_url) || str(pi.photoUrl);
        if (photoUrl) setPhotoPreview(photoUrl);

        // Every file slot can hold multiple uploads.
        const extractUrls = (val: unknown): string[] => {
          if (typeof val === 'string') return val.trim() ? [val.trim()] : [];
          if (!Array.isArray(val)) return [];
          return val
            .map((v) => (typeof v === 'string' ? v : (v as { url?: string })?.url || ''))
            .filter(Boolean);
        };
        setComplianceUrls({
          validIdFiles: extractUrls(co.valid_id_files),
          nbiFiles: extractUrls(co.nbi_clearance_files),
          policeFiles: extractUrls(co.police_clearance_files),
          coeFiles: extractUrls(co.COE ?? co.coe_files),
        });
        setValidIdLabel(str(co.valid_id));
        setWorkSetupUrls({
          primary: extractUrls(
            ws.primary_device_spec_files ?? ws.device_spec ?? ws.primary_device_screenshots,
          ),
          secondary: extractUrls(
            ws.secondary_device_spec_files ?? ws.device_spec_files ?? ws.secondary_device_screenshots,
          ),
        });


        // Date Applied — prefer top-level field, fall back to legacy custom field.
        const daCustom = (d.custom_fields_raw || []).find((f) => f.id === 'A0IfC6bqqoM4Kv98HTYb')?.value;
        setDateApplied(d.date_applied || daCustom || '');
        setLastStageDateChanged(d.last_stage_date_changed ? String(d.last_stage_date_changed) : '');

        const lu = d.last_update_changes ? new Date(d.last_update_changes) : null;
        setLastUpdated(lu && !isNaN(lu.getTime()) ? lu : null);
        setCanDoAssessment(yes(d.can_do_assessment));
        setTags(Array.isArray(d.tag) ? d.tag : []);
        setAccountEmail(d.email || '');
        // Cache identity so the Assessment step can launch IMX with real names.
        saveApplicantIdentity({
          email: d.email || '',
          firstName: str(pi.first_name),
          lastName: str(pi.last_name),
        });
      } catch (err) {
        console.warn('getDashboard failed', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load your dashboard.');
      } finally {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Warn before a reload wipes an in-progress section edit.
  useUnsavedChangesGuard(editing);


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

  /**
   * Scroll to and focus the first empty required-looking control in the section
   * so the applicant sees exactly what is missing instead of a disabled Save.
   */
  const focusFirstInvalidField = () => {
    const root = sectionBodyRef.current;
    if (!root) return;
    const controls = Array.from(
      root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input, select, textarea',
      ),
    ).filter((el) => {
      if (el.disabled || (el as HTMLInputElement).readOnly) return false;
      const type = (el as HTMLInputElement).type;
      if (type === 'hidden' || type === 'file' || type === 'checkbox' || type === 'radio') return false;
      if (el.offsetParent === null) return false;
      return !el.value?.trim();
    });
    const target = controls[0];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
    target.setAttribute('aria-invalid', 'true');
    target.classList.add('ring-2', 'ring-destructive', 'border-destructive');
    const clear = () => {
      target.classList.remove('ring-2', 'ring-destructive', 'border-destructive');
      target.removeAttribute('aria-invalid');
      target.removeEventListener('input', clear);
      target.removeEventListener('change', clear);
    };
    target.addEventListener('input', clear);
    target.addEventListener('change', clear);
  };

  const saveEdit = async () => {
    if (!contactId) {
      toast.error('Not signed in.');
      return;
    }
    // Missing required data — point the applicant at the offending field.
    if (!isDraftSectionValid()) {
      toast.error('Please complete the required fields before saving.');
      focusFirstInvalidField();
      return;
    }
    // Warn once when saving compliance without the background check authorization.
    if (activeSection === 'compliance' && !draftCompliance.authorized && !authWarnedRef.current) {
      authWarnedRef.current = true;
      setAuthPromptOpen(true);
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
      // Re-read the profile so freshly uploaded files (and the completion
      // percentage) show up immediately instead of only after a refresh.
      void loadData(true);

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

  // Reapply eligibility is driven by `last_stage_date_changed`:
  // blank/null -> the applicant has never been staged, so they can "Apply Now";
  // 60+ days old -> they can "Reapply"; otherwise we show a countdown.
  const stageDate = parseMDTDate(lastStageDateChanged);
  const daysSince = stageDate
    ? Math.floor((Date.now() - stageDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysLeft = daysSince !== null ? Math.max(0, 60 - daysSince) : null;
  const reapplyLabel = stageDate ? 'Reapply' : 'Apply Now';

  // Section completeness (excludes work experience, certifications, portfolio)
  const sectionChecks = useMemo(() => {
    // Files already stored on the backend come back as URLs, not File objects.
    // Treat an existing URL as a satisfied upload so completion is accurate.
    const placeholder = (urls: string[]) =>
      urls.map((u) => new File([], u.split('/').pop() || 'document'));
    const deviceFiles = (workSetup.deviceScreenshots?.length ?? 0) > 0
      ? workSetup.deviceScreenshots!
      : placeholder(workSetupUrls.primary);
    const secondaryDeviceFiles = (workSetup.secondaryDeviceScreenshots?.length ?? 0) > 0
      ? workSetup.secondaryDeviceScreenshots!
      : placeholder(workSetupUrls.secondary);
    const firstOrUrl = (file: File | null | undefined, urls: string[]) =>
      file ?? (urls.length > 0 ? placeholder(urls)[0] : null);

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
      deviceScreenshots: deviceFiles,
      secondaryDeviceScreenshots: secondaryDeviceFiles,
      systemSpecs: { cpu: '', ram: '', storage: '', source: '' as const },
    };
    const complianceForCheck = {
      authorizeBackgroundCheck: compliance.authorized,
      validId: firstOrUrl(compliance.validId, complianceUrls.validIdFiles),
      nbiClearance: firstOrUrl(compliance.nbiClearance, complianceUrls.nbiFiles),
      policeClearance: firstOrUrl(compliance.policeClearance, complianceUrls.policeFiles),
      proofOfSeparation: firstOrUrl(compliance.proofOfSeparation, complianceUrls.coeFiles),
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
  }, [profile, education, professional, tools, skills, workSetup, compliance, workSetupUrls, complianceUrls]);


  const completedCount = Object.values(sectionChecks).filter(Boolean).length;
  const totalCount = Object.keys(sectionChecks).length;
  const completionPct = Math.round((completedCount / totalCount) * 100);

  // Intro video — auto-plays once per session while the profile is incomplete.
  useEffect(() => {
    if (loading || completionPct >= 100) return;
    try {
      if (sessionStorage.getItem('cb_intro_seen') === '1') return;
      sessionStorage.setItem('cb_intro_seen', '1');
    } catch { /* ignore */ }
    setIntroOpen(true);
  }, [loading, completionPct]);

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

  // Sequential gating (mirrors the wizard): a required section stays locked until
  // every earlier required section is complete. Optional sections are never locked.
  const GATED_ORDER: SectionKey[] = ['personal', 'education', 'professional', 'valueProp', 'workSetup', 'compliance'];
  const isSectionLocked = (key: SectionKey): boolean => {
    const idx = GATED_ORDER.indexOf(key);
    if (idx <= 0) return false;
    return GATED_ORDER.slice(0, idx).some(
      (k) => !sectionChecks[k as keyof typeof sectionChecks],
    );
  };


  const coreReapplyReady =
    sectionChecks.personal && sectionChecks.education && sectionChecks.professional
    && sectionChecks.valueProp && sectionChecks.workSetup;
  const canReapply =
    (daysSince === null || daysSince >= 60) && coreReapplyReady && assessmentDone;

  // Applicant-facing notices resolved from the backend `tag[]` array.
  const notifications = useMemo(() => notificationsForTags(tags), [tags]);
  // The assessment is only offered once the profile is fully complete, the
  // backend says the applicant is eligible, and they haven't finished it yet
  // in this session.
  const showAssessmentCard = canDoAssessment && completionPct >= 100 && !assessmentDone;

  const documentCount =
    portfolioFileUrls.length
    + complianceUrls.validIdFiles.length + complianceUrls.nbiFiles.length
    + complianceUrls.policeFiles.length + complianceUrls.coeFiles.length
    + workSetupUrls.primary.length + workSetupUrls.secondary.length;


  const isDraftSectionValid = (): boolean => {
    switch (activeSection) {
      case 'personal': return isPersonalInfoValid(draftProfile);
      case 'education': return isEducationValid(draftEducation);
      case 'professional': return isProfessionalValid(draftProfessional);
      case 'tools': return isToolsValid(draftTools);
      case 'skills': return isSkillsValid(draftSkills);
      case 'valueProp': return isValuePropositionValid(draftProfile.valueProposition);
      case 'workSetup': return isWorkSetupValid({
        primaryDevice: draftWorkSetup.primaryDevice,
        hasNoiseCancellingHeadset: draftWorkSetup.headset,
        hasHDWebcam: draftWorkSetup.webcam,
        secondaryDevice: draftWorkSetup.secondaryDevice,
        primaryInternetProvider: draftWorkSetup.primaryISP,
        secondaryInternetProvider: draftWorkSetup.secondaryISP,
        primaryISPSpeedtest: draftWorkSetup.primaryISPSpeedtest ?? '',
        secondaryISPSpeedtest: draftWorkSetup.secondaryISPSpeedtest ?? '',
        documents: [],
        deviceScreenshots: (draftWorkSetup.deviceScreenshots?.length ?? 0) > 0
          ? draftWorkSetup.deviceScreenshots!
          : workSetupUrls.primary.map((u) => new File([], u.split('/').pop() || 'device')),
        secondaryDeviceScreenshots: draftWorkSetup.secondaryDeviceScreenshots ?? [],
        systemSpecs: { cpu: '', ram: '', storage: '', source: '' as const },
      });
      case 'compliance': return isComplianceValid({
        authorizeBackgroundCheck: draftCompliance.authorized,
        validId: draftCompliance.validId
          ?? (complianceUrls.validIdFiles.length > 0 ? new File([], 'valid-id') : null),
        nbiClearance: draftCompliance.nbiClearance ?? null,
        policeClearance: draftCompliance.policeClearance ?? null,
        proofOfSeparation: draftCompliance.proofOfSeparation ?? null,
        nbiValidity: draftCompliance.nbiValidity,
        policeValidity: draftCompliance.policeValidity,
      });

      default: return true;
    }
  };

  const handleReapplyClick = () => {
    if (!canReapply) return;
    // The assessment is available on its own card — applying no longer gates on it.
    setReapplyCode(getEntryRef());
    setReapplyOpen(true);
  };





  const submitReapply = async () => {
    if (!contactId) {
      toast.error('Not signed in.');
      return;
    }
    setReapplying(true);
    try {
      const code = extractReferralCode(reapplyCode);
      await reapply(contactId, code, todayMDT());
      trackApplicationLead();
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
                title={reapplyLabel}
                className="btn-primary text-sm px-5 py-2"
              >
                {reapplyLabel}
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
                  <button
                    onClick={() => { setUserMenuOpen(false); setIntroOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <PlayCircle className="w-4 h-4 text-muted-foreground" /> Watch Intro Video
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => { clearContactId(); navigate(getEntryPath()); }}
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
          className="relative rounded-2xl overflow-hidden mb-6 bg-primary text-primary-foreground bg-no-repeat"
          style={{ backgroundImage: `url(${dashboardBanner})`, backgroundSize: '115% 115%', backgroundPosition: 'right center' }}
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

        {/* Action required — driven by backend tags */}
        {notifications.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl shadow-sm p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <Bell className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-base font-bold text-amber-900">
                  Action Required ({notifications.length})
                </p>
                <ul className="mt-2 space-y-2">
                  {notifications.map((n) => (
                    <li key={n.tag} className="text-sm text-amber-900/90 flex gap-2">
                      <span aria-hidden className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                      <span>
                        {n.linkLabel && n.linkUrl ? (
                          <>
                            {n.message.split(n.linkLabel)[0]}
                            <a
                              href={n.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold underline"
                            >
                              {n.linkLabel}
                            </a>
                            {n.message.split(n.linkLabel).slice(1).join(n.linkLabel)}
                          </>
                        ) : n.message}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setManageDocsOpen(true)}
                  className="inline-flex items-center gap-1 text-sm text-amber-900 font-semibold mt-3 hover:underline"
                >
                  Upload Documents <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assessment invitation — only when the backend says the applicant is eligible */}
        {showAssessmentCard && (
          <div className="bg-card rounded-2xl border-2 border-primary/30 shadow-sm p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-base font-bold text-foreground">Take the Assessment</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                You're eligible to take your assessment. It takes about 20 minutes to complete.
              </p>
            </div>
            <button onClick={() => setAssessmentOpen(true)} className="btn-primary text-sm px-5 py-2 whitespace-nowrap">
              Start Assessment
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className={`grid grid-cols-1 ${variant === 'reapply' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6`}>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Documents</p>
              <p className="font-heading text-xl font-bold text-foreground">
                {documentCount} Uploaded
              </p>
              <button onClick={() => setManageDocsOpen(true)} className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-1 hover:underline">
                Manage Documents <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>


          {variant === 'reapply' && (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  incompleteSections.length > 0 ? 'bg-purple-500/10' : 'bg-emerald-500/10'
                }`}
              >
                {incompleteSections.length > 0 ? (
                  <ArrowRight className="w-5 h-5 text-purple-600" />
                ) : (
                  <Check className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {incompleteSections.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">Next Step</p>
                    <p className="font-heading text-base font-bold text-foreground truncate">
                      {incompleteSections[0].label}
                    </p>
                    <button
                      onClick={() => setActiveSection(incompleteSections[0].key)}
                      className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-1 hover:underline"
                    >
                      Start Now <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-heading text-base font-bold text-foreground truncate">Profile Complete</p>
                    <p className="text-xs text-muted-foreground mt-1">Every required step is filled in.</p>
                    {variant === 'reapply' && canReapply && (
                      <button
                        onClick={handleReapplyClick}
                        className="btn-primary text-sm px-4 py-1.5 mt-2"
                      >
                        {reapplyLabel}
                      </button>
                    )}
                    {variant === 'reapply' && !canReapply && daysLeft !== null && daysLeft > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground bg-muted px-2.5 py-1.5 rounded-md mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        Reapply in {daysLeft} day{daysLeft === 1 ? '' : 's'}
                      </span>
                    )}
                  </>
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
                {lastUpdated ? formatDateDenver(lastUpdated) : '—'}
              </p>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTimeDenver(lastUpdated)}
                </p>
              )}

            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <div className="space-y-4">
            <nav className="bg-card rounded-2xl border border-border shadow-sm p-2 h-fit">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const locked = isSectionLocked(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => { if (!locked) setActiveSection(s.key); }}
                    disabled={locked}
                    title={locked ? 'Complete the previous required section first' : undefined}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      activeSection === s.key
                        ? 'bg-primary text-primary-foreground'
                        : locked
                          ? 'text-muted-foreground opacity-60 cursor-not-allowed'
                          : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 opacity-80" />
                    <span className="truncate">{s.label}</span>
                    {locked && <Lock className="w-3.5 h-3.5 ml-auto shrink-0" />}
                  </button>
                );
              })}

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
                    <button onClick={saveEdit} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                      <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    {activeSection === 'workSetup' && (draftWorkSetup.activeTab ?? 'device') === 'device' && (
                      <button
                        type="button"
                        onClick={() => setDraftWorkSetup({ ...draftWorkSetup, activeTab: 'isp' })}
                        className="text-sm inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                      >
                        Next <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
            {editing && !isDraftSectionValid() && (
              <p className="text-xs text-muted-foreground -mt-2 mb-4">
                Some required fields are still missing — Save will point you to them.
              </p>
            )}


            {loading ? (
              <SectionSkeleton />
            ) : loadError ? (
              <ErrorRetry
                message="We couldn't load your profile"
                detail={loadError}
                onRetry={() => void loadData()}
              />
            ) : (
              <>
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
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Uploaded Files</p>
                    {portfolioFileUrls.length === 0 ? (
                      portfolioFileNames.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {portfolioFileNames.map((n, i) => (
                            <li key={`${n}-${i}`} className="text-sm text-foreground">{n}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No files uploaded</p>
                      )
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {portfolioFileUrls.map((f, i) => (
                          <FilePreviewLink key={`${f.url}-${i}`} url={f.url} name={f.name} />
                        ))}
                      </div>
                    )}
                  </div>
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
                  <div className="space-y-3">
                    {([
                      ['Primary Device Screenshots', workSetupUrls.primary],
                      ['Secondary Device Screenshots', workSetupUrls.secondary],
                    ] as const).map(([label, urls]) => (
                      <div key={label}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
                        {urls.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No files uploaded</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {urls.map((u, i) => <FilePreviewLink key={`${label}-${i}`} url={u} />)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              )
            )}

            {activeSection === 'compliance' && (
              editing ? (
                <ComplianceStep data={draftCompliance} onChange={setDraftCompliance} />
              ) : (
                <div className="space-y-6">
                  <ComplianceView data={compliance} />
                  <div className="space-y-3">
                    {([
                      ['Valid ID', complianceUrls.validIdFiles],
                      ['NBI Clearance', complianceUrls.nbiFiles],
                      ['Police Clearance', complianceUrls.policeFiles],
                      ['Proof of Separation / COE', complianceUrls.coeFiles],
                    ] as const).map(([label, urls]) => (
                      <div key={label}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                        {urls.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No files uploaded</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {urls.map((u, i) => (
                              <FilePreviewLink key={i} url={u} label={urls.length > 1 ? `${label} ${i + 1}` : label} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                  </div>
                </div>

              )
            )}
              </>
            )}

          </div>
        </div>
      </main>

      <Dialog open={assessmentOpen} onOpenChange={(o) => { if (!submittingAssessment) setAssessmentOpen(o); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assessment</DialogTitle>
            <DialogDescription>
              Please complete the embedded Values and DISC assessments below.
            </DialogDescription>
          </DialogHeader>
          <AssessmentStep
            ref={assessmentRef}
            contactId={contactId ?? ''}
            email={profile.valueProposition ? undefined : undefined}
            firstName={profile.firstName}
            lastName={profile.lastName}
            onPhaseChange={setAssessmentPhase}
            onCompleted={() => { /* completion is confirmed via the Next/Submit check */ }}
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
              Thank you. Your assessment has been recorded.
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
              onClick={() => setAssessmentConfirmOpen(false)}
              className="btn-primary"
            >
              Done
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
            <DialogTitle>{reapplyLabel}</DialogTitle>
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
              readOnly={!!getEntryRef()}
              title={getEntryRef() ? 'Referral code captured from the link you used' : undefined}
              className={`form-input ${getEntryRef() ? 'bg-muted cursor-not-allowed opacity-80' : ''}`}
            />
            {!!getEntryRef() && (
              <p className="text-xs text-muted-foreground">
                Referral code captured from the link you signed in with.
              </p>
            )}
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

      <IntroVideoModal open={introOpen} onOpenChange={setIntroOpen} />

      <ChangePasswordModal
        open={changePwOpen}
        onOpenChange={setChangePwOpen}
        contactId={contactId ?? ''}
        email={accountEmail}
      />

      {/* Background check authorization reminder — shown once per compliance edit. */}
      <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Background Check Authorization Required</DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <span className="block">
                A background check is an important part of our compliance process and helps ensure that
                profiles are properly verified and ready for potential client placement.
              </span>
              <span className="block">
                You have not yet authorized Cyberbacker to conduct a background check. Please review the
                authorization checkbox above before saving your compliance information.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className="btn-primary" onClick={() => setAuthPromptOpen(false)}>
              Review Authorization
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HelpCenterModal open={helpOpen} onOpenChange={setHelpOpen} />
      <ManageDocumentsModal
        open={manageDocsOpen}
        onOpenChange={setManageDocsOpen}
        contactId={contactId ?? ''}
        existing={{
          portfolioFiles: portfolioFileUrls,
          workSetupPrimary: workSetupUrls.primary,
          workSetupSecondary: workSetupUrls.secondary,
          compliance: { ...complianceUrls, nbiValidity: compliance.nbiValidity, policeValidity: compliance.policeValidity },
        }}
        onSaved={() => setLastUpdated(new Date())}
      />

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
  // Always render every field — missing values fall back to a "Not provided" placeholder.
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Primary Device" value={data.primaryDevice} />
        <Field label="Secondary Device" value={data.secondaryDevice} />
        <Field label="Noise-cancelling Headset" value={data.headset ? 'Yes' : 'No'} />
        <Field label="HD Webcam" value={data.webcam ? 'Yes' : 'No'} />
        <Field label="Primary Internet Provider" value={data.primaryISP} />
        <Field label="Secondary Internet Provider" value={data.secondaryISP} />
        <LinkField label="Primary ISP Speedtest Link" value={data.primaryISPSpeedtest ?? ''} />
        <LinkField label="Secondary ISP Speedtest Link" value={data.secondaryISPSpeedtest ?? ''} />
      </div>
    </div>
  );
};

const isComplianceEmpty = (d: ComplianceFormData) =>
  !d.authorized && !d.nbiValidity && !d.policeValidity && !d.proofOfSeparation;

const ComplianceView = ({ data }: { data: ComplianceFormData }) => {
  // Always render every field — missing values fall back to a "Not provided" placeholder.
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <Field label="Background Check Authorized" value={data.authorized ? 'Yes' : 'No'} />
        <Field label="NBI Clearance Valid Until" value={data.nbiValidity} />
        <Field label="Police Clearance Valid Until" value={data.policeValidity} />
      </div>
    </div>
  );
};

const LinkField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
    {value ? (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary underline underline-offset-2 break-all hover:no-underline"
      >
        {value}
      </a>
    ) : (
      <p className="text-sm text-muted-foreground italic">Not provided</p>
    )}
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm text-foreground">
      {value || <span className="text-muted-foreground italic">Not provided</span>}
    </p>
  </div>
);

const PersonalView = ({ profile }: { profile: PersonalInfo }) => {
  const isPH = (profile.country || '').trim().toLowerCase() === 'philippines';
  const socials = parseSocialLinks(profile.socialLinks);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        <Field label="First Name" value={profile.firstName} />
        <Field label="Middle Name" value={profile.middleName} />
        <Field label="Last Name" value={profile.lastName} />
        <Field label="Suffix" value={profile.suffix} />
        <Field label="Date of Birth" value={profile.dateOfBirth} />
        <Field label="Phone Number" value={profile.phoneNumber} />
        <Field label="Languages Spoken" value={profile.languagesSpoken} />
        <Field label="Country" value={profile.country} />
        <Field label="Nationality" value={profile.nationality} />
        {isPH ? (
          <>
            <Field label="House No. / Street" value={profile.houseStreet} />
            <Field label="Barangay" value={profile.barangay} />
            <Field label="City / Municipality" value={profile.city} />
          </>
        ) : (
          <>
            <Field label="Street Address" value={profile.address || profile.houseStreet} />
            <Field label="City" value={profile.city} />
            <Field label="State / Region / Province" value={profile.stateRegion ?? ''} />
            <Field label="Postal / ZIP Code" value={profile.postalCode ?? ''} />
          </>
        )}
        <Field label="Referred By" value={profile.referredBy ?? ''} />
      </div>

      <div>
        <h3 className="font-heading text-base font-semibold text-foreground mb-2">
          Social Media Profiles
        </h3>
        {socials.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No social profiles added.</p>
        ) : (
          <ul className="space-y-1">
            {socials.map((s) => (
              <li key={`${s.platform}-${s.url}`} className="text-sm">
                <span className="text-muted-foreground">{s.platform}: </span>
                <a
                  href={s.url.startsWith('http') ? s.url : `https://${s.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {s.url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};


const EducationView = ({ data }: { data: Education }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
    <Field label="Highest Level" value={data.highestLevel} />
    <Field label="Degree / Field" value={data.degreeField} />
    <Field label="School Name" value={data.schoolName} />
    <Field label="School Location" value={data.schoolLocation} />
    <Field label="Graduation Date" value={formatGraduation(data.graduationDate)} />
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
