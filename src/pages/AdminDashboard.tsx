import { useMemo, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import {
  LogOut,
  Search,
  Download,
  FileText,
  User,
  Star,
  ChevronDown,
  ChevronLeft,
  Mail,
  Phone,
  CalendarDays,
  Loader2,
  Wrench,
  Sparkles,
  Users,
  ExternalLink,
  FileBarChart,
  GraduationCap,
  Briefcase,
  FolderOpen,
  Award,
  Monitor,
  ShieldCheck,
} from 'lucide-react';
import jsPDF from 'jspdf';
import Logo from '@/components/Logo';
import page1Bg from '@/assets/resume-page1-bg.png';
import page2Bg from '@/assets/resume-page2-bg.png';
import Footer from '@/components/Footer';
import FilePreviewLink from '@/components/common/FilePreviewLink';
import FilePreviewModal from '@/components/common/FilePreviewModal';
import type { MockApplicant } from '@/data/mockApplicants';
import type { SelectedSkill } from '@/types/application';
import {
  getApplicantByEmail,
  getApplicantsByEmails,
  type AdminApplicantRecord,
} from '@/lib/apiClient';
import { formatDateDenver } from '@/lib/date';
import { toast } from 'sonner';


const PROFICIENCY_DOTS: Record<SelectedSkill['proficiency'], number> = {
  'No Experience': 1,
  Basic: 2,
  Intermediate: 3,
  Proficient: 4,
  Expert: 5,
};
const PROFICIENCY_STARS = PROFICIENCY_DOTS;

interface ApplicantState {
  enabledSkills: Record<string, boolean>; // keyed by skill name
  enabledTools: Record<string, boolean>; // keyed by tool name
  /** Include the value proposition ("ABOUT ME") block on the resume. */
  includeAbout: boolean;
  /** Per-work-experience inclusion, keyed by experience id. */
  enabledExperiences: Record<string, boolean>;
  photoDataUrl: string | null;
}

interface ToolEntry {
  tool: string;
  proficiency: SelectedSkill['proficiency'];
}

interface CertificationEntry {
  id: string;
  title: string;
  organization: string;
  type: string;
  dateCompleted: string;
  expirationDate: string;
  credentialId: string;
  certificateUrl: string;
}

interface AdminApplicant extends MockApplicant {
  phone: string;
  dateAdded: string;
  lastUpdated: string;
  canDoAssessment: string;
  tags: string[];
  toolEntries: ToolEntry[];
  valuesScores?: Record<string, unknown>;
  valuesReportUrl?: string;
  discScores?: Record<string, unknown>;
  discReportUrl?: string;
  personal: {
    middleName: string;
    suffix: string;
    dateOfBirth: string;
    street: string;
    barangay: string;
    city: string;
    country: string;
    nationality: string;
    languages: string;
    address: string;
    referredBy: string;
    socialLinks: { label: string; url: string }[];
  };
  education: {
    level: string;
    school: string;
    schoolLocation: string;
    graduationDate: string;
    degree: string;
  };
  professional: {
    industry: string;
    roles: string;
    bio: string;
    availability: string;
    hoursPerDay: string;
  };
  portfolio: { link: string; files: string[] };
  certifications: CertificationEntry[];
  workSetup: {
    primaryDevice: string;
    secondaryDevice: string;
    hdWebcam: string;
    noiseCancellingHeadset: string;
    primaryIsp: string;
    secondaryIsp: string;
    primaryIspLink: string;
    secondaryIspLink: string;
    cpu: string;
    ram: string;
    storage: string;
    detectionSource: string;
    detectionConsent: string;
    primaryDeviceFiles: string[];
    secondaryDeviceFiles: string[];
  };
  compliance: {
    backgroundCheck: string;
    validIdFiles: string[];
    nbiFiles: string[];
    nbiValidity: string;
    policeFiles: string[];
    policeValidity: string;
    coeFiles: string[];
  };
}

/** Parse a field that may arrive as a JSON string or an already-parsed array. */
function parseList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Parse a field that may arrive as a JSON string or an already-parsed object. */
function parseJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Coerce any nullable field into a trimmed display string. */
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

/** Normalize a list of file URLs that may arrive as an array or a JSON string. */
const fileList = (value: unknown): string[] =>
  parseList<unknown>(value)
    .map((f) => str(f))
    .filter((f) => f.length > 0);

const asProficiency = (v: unknown): SelectedSkill['proficiency'] => {
  const s = String(v ?? '');
  return (s in PROFICIENCY_DOTS ? s : 'Proficient') as SelectedSkill['proficiency'];
};

function mapRecord(rec: AdminApplicantRecord): AdminApplicant {
  const pi = (rec.personal_info ?? {}) as Record<string, unknown>;
  const edu = (rec.education ?? {}) as Record<string, unknown>;
  const pb = (rec.professional_background ?? {}) as Record<string, unknown>;
  const ws = (rec.work_setup ?? {}) as Record<string, unknown>;
  const comp = (rec.compliance ?? {}) as Record<string, unknown>;
  const values = (rec.values ?? {}) as Record<string, unknown>;
  const skillsSection = parseJsonObject(rec.skills) ?? {};

  const firstName = str(pi.first_name);
  const lastName = [str(pi.last_name), str(pi.suffix)].filter(Boolean).join(' ');

  const skills = parseList<Record<string, unknown>>(skillsSection.items)
    .filter((s) => s && s.skill)
    .map((s) => ({
      skill: str(s.skill),
      category: str(s.category),
      proficiency: asProficiency(s.proficiency),
    }));

  const toolEntries = parseList<Record<string, unknown>>(rec.tools)
    .filter((t) => t && t.tool)
    .map((t) => ({ tool: str(t.tool), proficiency: asProficiency(t.proficiency) }));

  const experiences = parseList<Record<string, unknown>>(rec.work_experience).map((e, i) => ({
    id: str(e.id) || `we-${i}`,
    title: str(e.title),
    employer: str(e.employer),
    location: str(e.location),
    startDate: str(e.startDate ?? e.start_date),
    endDate: str(e.endDate ?? e.end_date),
    currentlyWorking: Boolean(e.currentlyWorking ?? e.current ?? e.currently_working ?? false),
    responsibilities: str(e.responsibilities),
    toolsPlatforms: str(e.toolsPlatforms ?? e.tools_platforms),
  }));

  const socialRaw = parseJsonObject(pi.Social_Link ?? pi.social_link) ?? {};
  const socialLinks = Object.entries(socialRaw)
    .map(([label, url]) => ({ label, url: str(url) }))
    .filter((s) => s.url.length > 0);

  const dobRaw = pi.date_of_birth;
  const dateOfBirth =
    typeof dobRaw === 'number'
      ? formatDateDenver(new Date(dobRaw))
      : str(dobRaw)
        ? formatDateDenver(str(dobRaw))
        : '';

  const portfolio = (rec.portfolio ?? {}) as Record<string, unknown>;

  const certifications = parseList<Record<string, unknown>>(rec.certifications).map((c, i) => ({
    id: str(c.id) || `cert-${i}`,
    title: str(c.title),
    organization: str(c.organization),
    type: str(c.type),
    dateCompleted: str(c.dateCompleted ?? c.date_completed),
    expirationDate: str(c.expirationDate ?? c.expiration_date),
    credentialId: str(c.credentialId ?? c.credential_id),
    certificateUrl: str(c.certificate_url ?? c.certificateUrl),
  }));

  return {
    id: rec.id,
    firstName: firstName || str(rec.email) || 'Applicant',
    lastName,
    email: str(rec.email),
    role: 'Cyberbacker',
    location: [str(pi.city), str(pi.country)].filter(Boolean).join(', '),
    photoUrl: rec.profile_picture ?? null,
    about: str(skillsSection.value_proposition),
    skills,
    tools: toolEntries.map((t) => t.tool),
    experiences,
    phone: str(pi.phone),
    dateAdded: str(rec.date_applied),
    lastUpdated: str(rec.last_update_changes),
    canDoAssessment: str(rec.can_do_assessment),
    tags: Array.isArray(rec.tag) ? rec.tag.map(str).filter(Boolean) : [],
    toolEntries,
    valuesScores: parseJsonObject(values.value_assessment_score),
    valuesReportUrl: str(values.value_assessment_report) || undefined,
    discScores: parseJsonObject(values.disc_assessment_score),
    discReportUrl: str(values.disc_assessment_report) || undefined,
    personal: {
      middleName: str(pi.middle_name),
      suffix: str(pi.suffix),
      dateOfBirth,
      street: str(pi.street),
      barangay: str(pi.barangay),
      city: str(pi.city),
      country: str(pi.country),
      nationality: str(pi.nationality),
      languages: str(pi.languages),
      address: str(pi.address),
      referredBy: str(pi['Referred By'] ?? pi.referred_by),
      socialLinks,
    },
    education: {
      level: str(edu.education_level),
      school: str(edu.school_name),
      schoolLocation: str(edu.school_location),
      graduationDate: str(edu.graduation_date) ? formatDateDenver(str(edu.graduation_date)) : '',
      degree: str(edu.degree),
    },
    professional: {
      industry: str(pb.preferred_industry),
      roles: str(pb.preferred_role),
      bio: str(pb.preferred_bio),
      availability: str(pb.availability),
      hoursPerDay: str(pb.hours_per_day),
    },
    portfolio: {
      link: str(portfolio.link),
      files: fileList(portfolio.files),
    },
    certifications,
    workSetup: {
      primaryDevice: str(ws.primary_device),
      secondaryDevice: str(ws.secondary_device),
      hdWebcam: str(ws.has_hd_webcam),
      noiseCancellingHeadset: str(ws.has_noise_cancelling_headset),
      primaryIsp: str(ws.primary_internet_provider),
      secondaryIsp: str(ws.secondary_internet_provider),
      primaryIspLink: str(ws.primary_internet_provider_sharable_link),
      secondaryIspLink: str(ws.secondary_internet_provider_sharable_link),
      cpu: str(ws.detected_cpu),
      ram: str(ws.detected_ram),
      storage: str(ws.detected_storage),
      detectionSource: str(ws.detection_source),
      detectionConsent: str(ws.detection_consent),
      primaryDeviceFiles: fileList(ws.primary_device_spec_files),
      secondaryDeviceFiles: fileList(ws.secondary_device_spec_files),
    },
    compliance: {
      backgroundCheck: str(comp.background_check),
      validIdFiles: fileList(comp.valid_id_files),
      nbiFiles: fileList(comp.nbi_clearance_files),
      nbiValidity: str(comp.nbi_validity) ? formatDateDenver(str(comp.nbi_validity)) : '',
      policeFiles: fileList(comp.police_clearance_files),
      policeValidity: str(comp.police_validity) ? formatDateDenver(str(comp.police_validity)) : '',
      coeFiles: fileList(comp.COE ?? comp.coe),
    },
  };
}


/** Split a free-text blob of emails (newline / comma / semicolon / space separated). */
function parseEmailInput(raw: string): { emails: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const emails: string[] = [];
  const invalid: string[] = [];
  tokens.forEach((t) => {
    const lower = t.toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower)) {
      if (!invalid.includes(t)) invalid.push(t);
      return;
    }
    if (seen.has(lower)) return;
    seen.add(lower);
    emails.push(lower);
  });
  return { emails, invalid };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [query, setQuery] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<AdminApplicant[]>([]);
  const [missingEmails, setMissingEmails] = useState<string[]>([]);
  const [applicant, setApplicant] = useState<AdminApplicant | null>(null);
  const [state, setState] = useState<ApplicantState>({
    enabledSkills: {},
    enabledTools: {},
    includeAbout: true,
    enabledExperiences: {},
    photoDataUrl: null,
  });
  const [open, setOpen] = useState<Record<string, boolean>>({
    about: true,
    personal: true,
    education: true,
    professional: true,
    skills: true,
    tools: true,
    experience: true,
    portfolio: true,
    certifications: true,
    workSetup: true,
    compliance: true,
  });
  const [profileTab, setProfileTab] = useState<'profile' | 'resume'>('profile');
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  const toggleSection = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  /** Select an applicant for the profile card and prime the resume toggles/photo. */
  const selectApplicant = (mapped: AdminApplicant) => {
    setApplicant(mapped);
    setProfileTab('profile');
    setState({
      enabledSkills: Object.fromEntries(mapped.skills.map((s) => [s.skill, true])),
      enabledTools: Object.fromEntries(mapped.tools.map((t) => [t, true])),
      includeAbout: true,
      enabledExperiences: Object.fromEntries(mapped.experiences.map((e) => [e.id, true])),
      photoDataUrl: null,
    });
    if (mapped.photoUrl) {
      void loadImageAsDataUrl(mapped.photoUrl).then((dataUrl) => {
        if (dataUrl) setState((s) => ({ ...s, photoDataUrl: dataUrl }));
      });
    }
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await getApplicantByEmail(q);
      const rec = res?.data?.[0];
      setResults([]);
      setMissingEmails([]);
      if (!rec?.id) {
        setApplicant(null);
        setSearched(true);
        toast.error('No applicant found for that email.');
        return;
      }
      const mapped = mapRecord(rec);
      selectApplicant(mapped);
      setSearched(true);
      toast.success(`Found ${mapped.firstName} ${mapped.lastName}`.trim());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleBulkSearch = async () => {
    const { emails, invalid } = parseEmailInput(bulkInput);
    if (invalid.length) {
      toast.error(`Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.slice(0, 3).join(', ')}`);
      return;
    }
    if (!emails.length) {
      toast.error('Enter at least one email address.');
      return;
    }
    setSearching(true);
    try {
      const res = await getApplicantsByEmails(emails);
      const recs = (res?.data ?? []).filter((r) => r?.id);
      const mapped = recs.map(mapRecord);
      const found = new Set(mapped.map((m) => m.email.toLowerCase()));
      setResults(mapped);
      setMissingEmails(emails.filter((e) => !found.has(e)));
      setApplicant(null);
      setSearched(true);
      if (!mapped.length) toast.error('No applicants found for those emails.');
      else toast.success(`Found ${mapped.length} of ${emails.length} applicant(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk search failed');
    } finally {
      setSearching(false);
    }
  };

  const switchMode = (next: 'single' | 'bulk') => {
    setMode(next);
    setApplicant(null);
    setResults([]);
    setMissingEmails([]);
    setSearched(false);
  };

  const skillGroups = useMemo(() => {
    if (!applicant) return [] as Array<{ category: string; items: SelectedSkill[] }>;
    const map = new Map<string, SelectedSkill[]>();
    applicant.skills.forEach((s) => {
      const key = s.category || 'Other Skills';
      map.set(key, [...(map.get(key) ?? []), s]);
    });
    return Array.from(map, ([category, items]) => ({ category, items }));
  }, [applicant]);

  const toggleSkill = (skill: string) =>
    setState((s) => ({
      ...s,
      enabledSkills: { ...s.enabledSkills, [skill]: !s.enabledSkills[skill] },
    }));

  const toggleTool = (tool: string) =>
    setState((s) => ({
      ...s,
      enabledTools: { ...s.enabledTools, [tool]: !s.enabledTools[tool] },
    }));

  const toggleAbout = () => setState((s) => ({ ...s, includeAbout: !s.includeAbout }));

  const toggleExperience = (id: string) =>
    setState((s) => ({
      ...s,
      enabledExperiences: { ...s.enabledExperiences, [id]: !s.enabledExperiences[id] },
    }));



  const generateResume = async () => {
    if (!applicant) return;
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const [page1DataUrl, page2DataUrl] = await Promise.all([
        loadImageAsDataUrl(page1Bg),
        loadImageAsDataUrl(page2Bg),
      ]);
      drawResume(doc, applicant, state, page1DataUrl, page2DataUrl);
      const filename = `${applicant.firstName}_Resume.pdf`.replace(/\s+/g, '_');
      doc.save(filename);
      toast.success('Resume generated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate resume');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-auto" variant="black" />
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded bg-primary/10 text-primary">
              Admin
            </span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn-outline text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Search an applicant by email, review their profile, and generate a downloadable resume.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-3 inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
          {(['single', 'bulk'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'single' ? <Search className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              {m === 'single' ? 'Single' : 'Bulk'}
            </button>
          ))}
        </div>

        {/* Search */}
        {mode === 'single' ? (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Search by email address..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSearch();
                }}
                className="w-full bg-transparent border-0 outline-none pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
                aria-label="Search applicants by email"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={searching || !query.trim()}
              className="btn-primary text-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <label
              htmlFor="bulk-emails"
              className="block text-sm font-semibold text-foreground mb-1"
            >
              Bulk email lookup
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Paste one email per line, or separate them with commas or semicolons. Duplicates are
              removed automatically.
            </p>
            <pre className="text-[11px] leading-relaxed text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-3 whitespace-pre-wrap">
{`john@example.com
jane@example.com
maria@example.com`}
            </pre>
            <textarea
              id="bulk-emails"
              rows={5}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="john@example.com&#10;jane@example.com"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {parseEmailInput(bulkInput).emails.length} valid email(s) detected
              </span>
              <button
                type="button"
                onClick={() => void handleBulkSearch()}
                disabled={searching || !bulkInput.trim()}
                className="btn-primary text-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search all'}
              </button>
            </div>
          </div>
        )}

        {/* States */}
        {searching && !applicant && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Looking up applicant...</p>
          </div>
        )}

        {/* Bulk results list */}
        {!searching && !applicant && mode === 'bulk' && (results.length > 0 || missingEmails.length > 0) && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                {results.length} applicant{results.length === 1 ? '' : 's'} found
              </h2>
            </div>
            <ul className="divide-y divide-border">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => selectApplicant(r)}
                    className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-muted/60 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {r.photoUrl ? (
                        <img
                          src={r.photoUrl}
                          alt={`${r.firstName} ${r.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {r.firstName} {r.lastName}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        {r.email && <span className="truncate">{r.email}</span>}
                        {r.phone && <span>{r.phone}</span>}
                        {r.dateAdded && <span>{formatDateDenver(r.dateAdded)}</span>}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
            {missingEmails.length > 0 && (
              <div className="px-5 py-3 border-t border-border bg-muted/40">
                <p className="text-xs font-semibold text-foreground mb-1">
                  No match ({missingEmails.length})
                </p>
                <p className="text-xs text-muted-foreground break-words">
                  {missingEmails.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {!searching && !applicant && results.length === 0 && missingEmails.length === 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
            <Search className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              {searched
                ? mode === 'bulk'
                  ? 'No applicants found for those emails.'
                  : 'No applicant found for that email.'
                : mode === 'bulk'
                  ? 'Paste a list of emails to look them up together'
                  : 'Search an applicant by email to begin'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {searched
                ? 'Double-check the addresses and try again.'
                : 'Enter the full email address used on their application.'}
            </p>
          </div>
        )}

        {applicant && results.length > 0 && (
          <button
            type="button"
            onClick={() => setApplicant(null)}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ChevronLeft className="w-4 h-4" /> Back to results
          </button>
        )}

        {applicant && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 p-6 border-b border-border">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => applicant.photoUrl && setPreview({ url: applicant.photoUrl, name: 'Profile picture' })}
                  disabled={!applicant.photoUrl}
                  className="w-20 h-20 rounded-2xl border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0 disabled:cursor-default"
                  title={applicant.photoUrl ? 'Preview profile picture' : undefined}
                >
                  {applicant.photoUrl ? (
                    <img
                      src={applicant.photoUrl}
                      alt={`${applicant.firstName} ${applicant.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
                <div className="min-w-0">
                  <h2 className="font-heading text-2xl font-bold text-foreground truncate">
                    {applicant.firstName} {applicant.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {applicant.location || applicant.role}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {applicant.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {applicant.email}
                      </span>
                    )}
                    {applicant.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {applicant.phone}
                      </span>
                    )}
                    {applicant.dateAdded && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" /> Applied{' '}
                        {formatDateDenver(applicant.dateAdded)}
                      </span>
                    )}
                    {applicant.lastUpdated && (
                      <span className="inline-flex items-center gap-1.5">
                        Updated {formatDateDenver(applicant.lastUpdated)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {applicant.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                      >
                        {t}
                      </span>
                    ))}
                    {applicant.canDoAssessment && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Can do assessment: {applicant.canDoAssessment}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 border-b border-border bg-muted/30">
              <div className="flex gap-1">
                {([
                  { key: 'profile', label: 'Applicant Profile', icon: <User className="w-4 h-4" /> },
                  { key: 'resume', label: 'Resume', icon: <FileText className="w-4 h-4" /> },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setProfileTab(t.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                      profileTab === t.key
                        ? 'border-primary text-primary bg-card'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {profileTab === 'profile' ? (
              <>
                {/* Assessments */}
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Assessments
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AssessmentCard
                      label="Values Assessment"
                      icon={<FileBarChart className="w-4 h-4" />}
                      scores={applicant.valuesScores?.results ?? applicant.valuesScores}
                      reportUrl={applicant.valuesReportUrl}
                    />
                    <AssessmentCard
                      label="DISC Assessment"
                      icon={<FileBarChart className="w-4 h-4" />}
                      scores={applicant.discScores?.results ?? applicant.discScores}
                      reportUrl={applicant.discReportUrl}
                    />
                  </div>
                </div>

                {/* About */}
                <Section
                  title="About"
                  open={open.about}
                  onToggle={() => toggleSection('about')}
                  icon={<User className="w-4 h-4" />}
                >
                  {applicant.about ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {applicant.about}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No value proposition added.
                    </p>
                  )}
                </Section>

                {/* Personal info */}
                <Section
                  title="Personal Information"
                  open={open.personal}
                  onToggle={() => toggleSection('personal')}
                  icon={<User className="w-4 h-4" />}
                >
                  <InfoGrid
                    items={[
                      ['Middle name', applicant.personal.middleName],
                      ['Suffix', applicant.personal.suffix],
                      ['Date of birth', applicant.personal.dateOfBirth],
                      ['Phone', applicant.phone],
                      ['Nationality', applicant.personal.nationality],
                      ['Languages', applicant.personal.languages],
                      [
                        'Address',
                        applicant.personal.address ||
                          [
                            applicant.personal.street,
                            applicant.personal.barangay,
                            applicant.personal.city,
                            applicant.personal.country,
                          ]
                            .filter(Boolean)
                            .join(', '),
                      ],
                      ['Referred by', applicant.personal.referredBy],
                    ]}
                  />
                  {applicant.personal.socialLinks.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Social profiles
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {applicant.personal.socialLinks.map((s) => (
                          <ExternalUrl key={s.label} url={s.url} label={s.label} />
                        ))}
                      </div>
                    </div>
                  )}
                </Section>

                {/* Education */}
                <Section
                  title="Education"
                  open={open.education}
                  onToggle={() => toggleSection('education')}
                  icon={<GraduationCap className="w-4 h-4" />}
                >
                  <InfoGrid
                    items={[
                      ['Highest level', applicant.education.level],
                      ['School', applicant.education.school],
                      ['School location', applicant.education.schoolLocation],
                      ['Graduation date', applicant.education.graduationDate],
                      ['Degree / Field of study', applicant.education.degree],
                    ]}
                  />
                </Section>

                {/* Professional background */}
                <Section
                  title="Professional Background"
                  open={open.professional}
                  onToggle={() => toggleSection('professional')}
                  icon={<Briefcase className="w-4 h-4" />}
                >
                  <InfoGrid
                    items={[
                      ['Preferred industry', applicant.professional.industry],
                      ['Preferred roles', applicant.professional.roles],
                      ['Availability', applicant.professional.availability],
                      ['Hours per day', applicant.professional.hoursPerDay],
                      ['Bio', applicant.professional.bio],
                    ]}
                  />
                </Section>

                {/* Experience */}
                <Section
                  title="Experience"
                  open={open.experience}
                  onToggle={() => toggleSection('experience')}
                  icon={<FileText className="w-4 h-4" />}
                  count={applicant.experiences.length}
                >
                  {applicant.experiences.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No experience added.</p>
                  ) : (
                    <div className="space-y-3">
                      {applicant.experiences.map((e) => (
                        <div key={e.id} className="border border-border rounded-xl p-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{e.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.startDate}
                              {e.currentlyWorking
                                ? ' – Present'
                                : e.endDate
                                  ? ` – ${e.endDate}`
                                  : ''}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {e.employer}
                            {e.location ? ` · ${e.location}` : ''}
                          </p>
                          {e.responsibilities && (
                            <p className="text-sm text-foreground mt-2 whitespace-pre-line leading-relaxed">
                              {e.responsibilities}
                            </p>
                          )}
                          {e.toolsPlatforms && (
                            <p className="text-xs text-muted-foreground mt-2">
                              <span className="font-medium text-foreground">Tools:</span>{' '}
                              {e.toolsPlatforms}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Skills */}
                <Section
                  title="Core Skills"
                  open={open.skills}
                  onToggle={() => toggleSection('skills')}
                  icon={<Sparkles className="w-4 h-4" />}
                  count={applicant.skills.length}
                >
                  {applicant.skills.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No skills added.</p>
                  ) : (
                    <div className="space-y-5">
                      {skillGroups.map((group) => (
                        <div key={group.category}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            {group.category}
                          </p>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {group.items.map((s) => (
                              <div
                                key={`${group.category}-${s.skill}`}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {s.skill}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{s.proficiency}</p>
                                </div>
                                <StarRating count={PROFICIENCY_STARS[s.proficiency]} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Tools */}
                <Section
                  title="Tools"
                  open={open.tools}
                  onToggle={() => toggleSection('tools')}
                  icon={<Wrench className="w-4 h-4" />}
                  count={applicant.toolEntries.length}
                >
                  {applicant.toolEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No tools added.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {applicant.toolEntries.map((t) => (
                        <div
                          key={t.tool}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{t.tool}</p>
                            <p className="text-xs text-muted-foreground">{t.proficiency}</p>
                          </div>
                          <StarRating count={PROFICIENCY_STARS[t.proficiency]} />
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Portfolio */}
                <Section
                  title="Portfolio"
                  open={open.portfolio}
                  onToggle={() => toggleSection('portfolio')}
                  icon={<FolderOpen className="w-4 h-4" />}
                >
                  {applicant.portfolio.link ? (
                    /^https?:\/\//i.test(applicant.portfolio.link) ? (
                      <ExternalUrl url={applicant.portfolio.link} label="Portfolio link" />
                    ) : (
                      <p className="text-sm text-foreground">{applicant.portfolio.link}</p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No portfolio link.</p>
                  )}
                  <FileChips files={applicant.portfolio.files} className="mt-3" />
                </Section>

                {/* Certifications */}
                <Section
                  title="Certifications"
                  open={open.certifications}
                  onToggle={() => toggleSection('certifications')}
                  icon={<Award className="w-4 h-4" />}
                  count={applicant.certifications.length}
                >
                  {applicant.certifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No certifications added.</p>
                  ) : (
                    <div className="space-y-3">
                      {applicant.certifications.map((c) => (
                        <div key={c.id} className="border border-border rounded-xl p-4">
                          <p className="text-sm font-semibold text-foreground">{c.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[c.organization, c.type].filter(Boolean).join(' · ')}
                          </p>
                          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-muted-foreground">
                            {c.dateCompleted && <span>Completed {c.dateCompleted}</span>}
                            {c.expirationDate && <span>Expires {c.expirationDate}</span>}
                            {c.credentialId && <span>ID: {c.credentialId}</span>}
                          </div>
                          <FileChips files={[c.certificateUrl]} className="mt-3" />
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Work setup */}
                <Section
                  title="Work Setup"
                  open={open.workSetup}
                  onToggle={() => toggleSection('workSetup')}
                  icon={<Monitor className="w-4 h-4" />}
                >
                  <InfoGrid
                    items={[
                      ['Primary device', applicant.workSetup.primaryDevice],
                      ['Secondary device', applicant.workSetup.secondaryDevice],
                      ['HD webcam', applicant.workSetup.hdWebcam],
                      ['Noise-cancelling headset', applicant.workSetup.noiseCancellingHeadset],
                      ['Primary ISP', applicant.workSetup.primaryIsp],
                      ['Secondary ISP', applicant.workSetup.secondaryIsp],
                      ['CPU', applicant.workSetup.cpu],
                      ['RAM', applicant.workSetup.ram],
                      ['Storage', applicant.workSetup.storage],
                      ['Detection source', applicant.workSetup.detectionSource],
                      ['Detection consent', applicant.workSetup.detectionConsent],
                    ]}
                  />
                  {(applicant.workSetup.primaryIspLink || applicant.workSetup.secondaryIspLink) && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Speed test results
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {applicant.workSetup.primaryIspLink &&
                          (/^https?:\/\//i.test(applicant.workSetup.primaryIspLink) ? (
                            <ExternalUrl
                              url={applicant.workSetup.primaryIspLink}
                              label="Primary ISP speed test"
                            />
                          ) : (
                            <span className="text-sm text-foreground">
                              Primary: {applicant.workSetup.primaryIspLink}
                            </span>
                          ))}
                        {applicant.workSetup.secondaryIspLink &&
                          (/^https?:\/\//i.test(applicant.workSetup.secondaryIspLink) ? (
                            <ExternalUrl
                              url={applicant.workSetup.secondaryIspLink}
                              label="Secondary ISP speed test"
                            />
                          ) : (
                            <span className="text-sm text-foreground">
                              Secondary: {applicant.workSetup.secondaryIspLink}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  <FileGroup
                    label="Primary device specs"
                    files={applicant.workSetup.primaryDeviceFiles}
                  />
                  <FileGroup
                    label="Secondary device specs"
                    files={applicant.workSetup.secondaryDeviceFiles}
                  />
                </Section>

                {/* Compliance */}
                <Section
                  title="Compliance"
                  open={open.compliance}
                  onToggle={() => toggleSection('compliance')}
                  icon={<ShieldCheck className="w-4 h-4" />}
                  last
                >
                  <InfoGrid
                    items={[
                      ['Background check authorized', applicant.compliance.backgroundCheck],
                      ['NBI valid until', applicant.compliance.nbiValidity],
                      ['Police clearance valid until', applicant.compliance.policeValidity],
                    ]}
                  />
                  <FileGroup label="Valid ID" files={applicant.compliance.validIdFiles} />
                  <FileGroup label="NBI clearance" files={applicant.compliance.nbiFiles} />
                  <FileGroup label="Police clearance" files={applicant.compliance.policeFiles} />
                  <FileGroup
                    label="Proof of separation / COE"
                    files={applicant.compliance.coeFiles}
                  />
                </Section>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border">
                  <p className="text-sm text-muted-foreground">
                    Choose what appears on the generated resume — untick anything to leave it out.
                  </p>
                  <button
                    onClick={generateResume}
                    className="btn-primary text-sm inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Generate Resume PDF
                  </button>
                </div>

                {/* Value proposition (resume toggle) */}
                <Section
                  title="Value Proposition"
                  open={open.about}
                  onToggle={() => toggleSection('about')}
                  icon={<User className="w-4 h-4" />}
                  hint="Toggle to include/exclude on resume"
                >
                  {!applicant.about ? (
                    <p className="text-sm text-muted-foreground italic">
                      No value proposition provided.
                    </p>
                  ) : (
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        state.includeAbout
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-muted/40 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={state.includeAbout}
                        onChange={toggleAbout}
                        className="w-4 h-4 accent-primary shrink-0 mt-0.5"
                      />
                      <p className="text-sm text-foreground whitespace-pre-line">
                        {applicant.about}
                      </p>
                    </label>
                  )}
                </Section>

                {/* Work experience (resume toggles) */}
                <Section
                  title="Work Experience"
                  open={open.experience}
                  onToggle={() => toggleSection('experience')}
                  icon={<Briefcase className="w-4 h-4" />}
                  hint="Toggle to include/exclude on resume"
                  count={applicant.experiences.length}
                >
                  {applicant.experiences.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No work experience added.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {applicant.experiences.map((e) => {
                        const enabled = state.enabledExperiences[e.id];
                        const range = e.currentlyWorking
                          ? [e.startDate, 'Present'].filter(Boolean).join(' - ')
                          : [e.startDate, e.endDate].filter(Boolean).join(' - ');
                        return (
                          <label
                            key={e.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              enabled
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border bg-muted/40 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!enabled}
                              onChange={() => toggleExperience(e.id)}
                              className="w-4 h-4 accent-primary shrink-0 mt-0.5"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {e.title || 'Untitled role'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {[e.employer, e.location, range].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </Section>



                {/* Skills (resume toggles) */}
                <Section
                  title="Core Skills"
                  open={open.skills}
                  onToggle={() => toggleSection('skills')}
                  icon={<Sparkles className="w-4 h-4" />}
                  hint="Toggle to include/exclude on resume"
                  count={applicant.skills.length}
                >
                  {applicant.skills.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No skills added.</p>
                  ) : (
                    <div className="space-y-5">
                      {skillGroups.map((group) => (
                        <div key={group.category}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            {group.category}
                          </p>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {group.items.map((s) => {
                              const enabled = state.enabledSkills[s.skill];
                              return (
                                <label
                                  key={`${group.category}-${s.skill}`}
                                  className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                                    enabled
                                      ? 'border-primary/40 bg-primary/5'
                                      : 'border-border bg-muted/40 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={!!enabled}
                                      onChange={() => toggleSkill(s.skill)}
                                      className="w-4 h-4 accent-primary shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {s.skill}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {s.proficiency}
                                      </p>
                                    </div>
                                  </div>
                                  <StarRating count={PROFICIENCY_STARS[s.proficiency]} />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Tools (resume toggles) */}
                <Section
                  title="Tools"
                  open={open.tools}
                  onToggle={() => toggleSection('tools')}
                  icon={<Wrench className="w-4 h-4" />}
                  hint="Toggle to include/exclude on resume"
                  count={applicant.toolEntries.length}
                  last
                >
                  {applicant.toolEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No tools added.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {applicant.toolEntries.map((t) => {
                        const enabled = state.enabledTools[t.tool];
                        return (
                          <label
                            key={t.tool}
                            className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                              enabled
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border bg-muted/40 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={!!enabled}
                                onChange={() => toggleTool(t.tool)}
                                className="w-4 h-4 accent-primary shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {t.tool}
                                </p>
                                <p className="text-xs text-muted-foreground">{t.proficiency}</p>
                              </div>
                            </div>
                            <StarRating count={PROFICIENCY_STARS[t.proficiency]} />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </Section>
              </>
            )}
          </div>
        )}
        {preview && (
          <FilePreviewModal
            open
            onClose={() => setPreview(null)}
            url={preview.url}
            name={preview.name}
          />
        )}
      </main>
      <Footer />
    </div>
  );
};

/** Label / value grid used across the read-only profile sections. */
const InfoGrid = ({ items }: { items: [string, string][] }) => {
  const rows = items.filter(([, v]) => v && v.trim().length > 0);
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground italic">No details provided.</p>;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </dt>
          <dd className="text-sm text-foreground break-words whitespace-pre-line">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

/** External URL rendered as a chip that opens in a new tab. */
const ExternalUrl = ({ url, label }: { url: string; label?: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    title={url}
    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/40 text-sm text-primary hover:bg-muted hover:border-primary/40 transition-colors max-w-full"
  >
    <span className="truncate">{label || url}</span>
    <ExternalLink className="w-4 h-4 shrink-0" />
  </a>
);

/** Row of previewable file chips. */
const FileChips = ({ files, className = '' }: { files: string[]; className?: string }) => {
  const list = files.filter((f) => f && f.trim().length > 0);
  if (list.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {list.map((f, i) => (
        <FilePreviewLink key={`${f}-${i}`} url={f} />
      ))}
    </div>
  );
};

/** Labelled group of file chips (hidden when there are no files). */
const FileGroup = ({ label, files }: { label: string; files: string[] }) => {
  const list = files.filter((f) => f && f.trim().length > 0);
  if (list.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {label}
      </p>
      <FileChips files={list} />
    </div>
  );
};

const Section = ({
  title,
  icon,
  hint,
  count,
  open,
  onToggle,
  last,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  hint?: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  last?: boolean;
  children: React.ReactNode;
}) => (
  <section className={last ? '' : 'border-b border-border'}>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-muted/50 transition-colors"
    >
      <span className="inline-flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wide text-foreground">
        {icon}
        {title}
        {typeof count === 'number' && (
          <span className="text-xs font-medium normal-case text-muted-foreground">({count})</span>
        )}
      </span>
      <span className="inline-flex items-center gap-3">
        {hint && <span className="hidden sm:inline text-xs text-muted-foreground">{hint}</span>}
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </span>
    </button>
    {open && <div className="px-6 pb-6">{children}</div>}
  </section>
);

const StarRating = ({ count }: { count: number }) => (
  <div className="flex gap-0.5 shrink-0">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < count ? 'fill-primary text-primary' : 'fill-muted text-muted-foreground/40'}`}
      />
    ))}
  </div>
);

const AssessmentCard = ({
  label,
  icon,
  scores,
  reportUrl,
}: {
  label: string;
  icon: React.ReactNode;
  scores: unknown;
  reportUrl: string | undefined;
}) => {
  const normalized =
    scores && typeof scores === 'object' && !Array.isArray(scores)
      ? (scores as Record<string, unknown>)
      : undefined;

  const entries = normalized
    ? Object.entries(normalized).filter(
        ([_, v]) => typeof v === 'string' || typeof v === 'number',
      )
    : [];

  const isDiscStyle =
    normalized &&
    ((normalized.authentic && typeof normalized.authentic === 'object') ||
      (normalized.modified && typeof normalized.modified === 'object'));

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {icon}
          {label}
        </span>
        {reportUrl ? (
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View report <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No report</span>
        )}
      </div>
      {isDiscStyle ? (
        <div className="space-y-3">
          {!!normalized?.authentic && typeof normalized.authentic === 'object' && !Array.isArray(normalized.authentic) && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Authentic
              </p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(normalized.authentic as Record<string, unknown>)
                  .filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
                  .map(([key, value]) => (
                    <div key={key} className="bg-muted/50 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                        {key}
                      </p>
                      <p className="text-sm font-semibold text-foreground truncate">
                        {String(value)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {normalized?.modified && typeof normalized.modified === 'object' && !Array.isArray(normalized.modified) && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Modified
              </p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(normalized.modified as Record<string, unknown>)
                  .filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
                  .map(([key, value]) => (
                    <div key={key} className="bg-muted/50 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                        {key}
                      </p>
                      <p className="text-sm font-semibold text-foreground truncate">
                        {String(value)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : entries.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="bg-muted/50 rounded-lg px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                {key}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {String(value)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No scores available.</p>
      )}
    </div>
  );
};


// ============================================================================
// PDF GENERATION
// ============================================================================


function drawResume(
  doc: jsPDF,
  applicant: AdminApplicant,
  state: ApplicantState,
  page1Bg: string | null,
  page2Bg: string | null,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  // Left panel widths come from the background art:
  // page1 background: blue panel covers ~27% of width
  // page2 background (used for all pages): blue strip covers ~30% of width
  const leftWPage1 = pageW * 0.27;
  const leftWPage2 = pageW * 0.30;
  // Push content well clear of the blue strip on every page so text never
  // overlaps the background. Use the wider page2 strip + generous padding.
  const rightX = leftWPage2 + 40;
  const rightW = pageW - rightX - 48;
  const topMargin = 80;
  const bottomLimit = pageH - 70;

  // ---- chrome (called for every page): just paints the bg image full-bleed ----
  const drawChrome = (pageIndex: number) => {
    // Use page2 background for ALL pages per design update
    const bg = page2Bg;
    if (bg) {
      try {
        doc.addImage(bg, 'PNG', 0, 0, pageW, pageH);
      } catch {
        // ignore
      }
    }

    if (pageIndex === 0) {
      drawLeftPanelHeader();
    } else {
      // Continuation header on left strip
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      const cx = leftWPage2 / 2;
      doc.text(applicant.firstName, cx, 70, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(applicant.role, cx, 88, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(220, 230, 245);
      doc.text(`Page ${pageIndex + 1}`, cx, pageH - 30, { align: 'center' });
    }
  };

  const drawLeftPanelHeader = () => {
    // Photo box position aligned to the artwork on page1Bg
    const photoX = pageW * 0.035;
    const photoY = pageH * 0.07;
    const photoW = leftWPage1 - photoX * 2;
    const photoH = photoW;
    if (state.photoDataUrl) {
      try {
        const fmt = state.photoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(state.photoDataUrl, fmt, photoX, photoY, photoW, photoH);
      } catch {
        // ignore
      }
    }

    // City / country sit directly under the picture.
    const locTextX = photoX + photoW / 2;
    let locY = photoY + photoH + 26;
    doc.setTextColor(255, 255, 255);
    const city = (applicant.personal.city || '').trim();
    const country = (applicant.personal.country || '').trim();
    if (city) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(city.toUpperCase(), locTextX, locY, { align: 'center', maxWidth: photoW });
      locY += 13;
    }
    if (country) {
      doc.setFont('helvetica', city ? 'normal' : 'bold');
      doc.setFontSize(city ? 9 : 11);
      doc.text(city ? country : country.toUpperCase(), locTextX, locY, {
        align: 'center',
        maxWidth: photoW,
      });
    }
  };

  let pageIndex = 0;
  drawChrome(pageIndex);

  // Page-break helper: ensures `needed` vertical space is free; new page if not.
  const ensureSpace = (currentY: number, needed: number): number => {
    if (currentY + needed <= bottomLimit) return currentY;
    doc.addPage();
    pageIndex += 1;
    drawChrome(pageIndex);
    return topMargin;
  };

  let y = topMargin;

  // ===== Header (page 1 only) =====
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(applicant.firstName, rightX, y);
  y += 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(60, 60, 60);
  doc.text(applicant.role, rightX, y);
  y += 28;

  // About (value proposition) — optional
  if (state.includeAbout && applicant.about.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text('ABOUT ME', rightX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const aboutLines = doc.splitTextToSize(applicant.about, rightW);
    doc.text(aboutLines, rightX, y, { lineHeightFactor: 1.4 });
    y += aboutLines.length * 12 + 8;

    // Divider
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.7);
    doc.line(rightX, y, rightX + rightW, y);
    y += 16;
  }

  // ===== Skills + Tools (paginated row-by-row) =====
  const colW = (rightW - 30) / 2;
  const colGap = 30;
  const rowH = 14;
  const sectionTitleH = 18;

  const enabledSkills = applicant.skills.filter((s) => state.enabledSkills[s.skill]);
  const enabledTools = applicant.tools.filter((t) => state.enabledTools[t]);

  const skillItems = enabledSkills.map((s) => ({ label: s.skill, dots: PROFICIENCY_DOTS[s.proficiency] }));
  const toolItems = enabledTools.map((t) => ({ label: t, dots: 5 }));
  const totalRows = Math.max(skillItems.length, toolItems.length);

  // Need at least title + one row to start the section on this page
  y = ensureSpace(y, sectionTitleH + rowH + 12);

  let rowIndex = 0;
  let drawTitles = true;
  let sectionStartY = y;

  while (rowIndex < totalRows) {
    if (drawTitles) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(rowIndex === 0 ? 'CORE SKILLS:' : 'CORE SKILLS (cont.):', rightX, sectionStartY);
      doc.text(rowIndex === 0 ? 'TOOLS:' : 'TOOLS (cont.):', rightX + colW + colGap, sectionStartY);
      drawTitles = false;
      y = sectionStartY + sectionTitleH;
    }

    // How many rows fit on this page from current y?
    const remaining = bottomLimit - y;
    const rowsThatFit = Math.max(0, Math.floor(remaining / rowH));
    if (rowsThatFit === 0) {
      y = ensureSpace(y, rowH * 4);
      sectionStartY = y;
      drawTitles = true;
      continue;
    }

    const rowsToDraw = Math.min(rowsThatFit, totalRows - rowIndex);
    const skillSlice = skillItems.slice(rowIndex, rowIndex + rowsToDraw);
    const toolSlice = toolItems.slice(rowIndex, rowIndex + rowsToDraw);

    drawSkillRows(doc, skillSlice, rightX, y, colW);
    drawSkillRows(doc, toolSlice, rightX + colW + colGap, y, colW);

    y += rowsToDraw * rowH;
    rowIndex += rowsToDraw;

    if (rowIndex < totalRows) {
      // Need a new page for remaining rows
      y = ensureSpace(y, rowH * 4);
      sectionStartY = y;
      drawTitles = true;
    }
  }

  y += 12;

  // ===== Experience (only the entries ticked in the resume tab) =====
  const includedExperiences = applicant.experiences.filter(
    (e) =>
      state.enabledExperiences[e.id] &&
      (e.title || e.employer || e.responsibilities || e.startDate),
  );

  if (includedExperiences.length > 0) {
    // Divider before experience
    y = ensureSpace(y, 30);
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.7);
    doc.line(rightX, y, rightX + rightW, y);
    y += 16;

    y = ensureSpace(y, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text('EXPERIENCE', rightX, y);
    y += 16;

    for (const exp of includedExperiences) {
      const range = exp.currentlyWorking
        ? [exp.startDate, 'Present'].filter(Boolean).join(' - ')
        : [exp.startDate, exp.endDate].filter(Boolean).join(' - ');

      const heading = [exp.title || 'Role', range].filter(Boolean).join(' - ');
      const subheading = [exp.employer, exp.location].filter(Boolean).join(' | ');

      y = ensureSpace(y, subheading ? 44 : 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(20, 20, 20);
      const headingLines = doc.splitTextToSize(heading, rightW);
      doc.text(headingLines, rightX, y);
      y += headingLines.length * 13;

      if (subheading) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        const subLines = doc.splitTextToSize(subheading, rightW);
        doc.text(subLines, rightX, y);
        y += subLines.length * 12;
      }
      y += 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 50);
      const bullets = exp.responsibilities
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean);
      for (const b of bullets) {
        const lines = doc.splitTextToSize(`• ${b}`, rightW - 10);
        // Break per bullet if needed
        y = ensureSpace(y, lines.length * 11);
        doc.text(lines, rightX + 6, y);
        y += lines.length * 11;
      }

      if (exp.toolsPlatforms.trim()) {
        const toolLines = doc.splitTextToSize(
          `Tools & Platforms: ${exp.toolsPlatforms.trim()}`,
          rightW - 10,
        );
        y = ensureSpace(y, toolLines.length * 11 + 2);
        doc.setTextColor(80, 80, 80);
        doc.text(toolLines, rightX + 6, y);
        y += toolLines.length * 11;
      }

      y += 8;
    }
  }
}

function drawSkillRows(
  doc: jsPDF,
  items: { label: string; dots: number }[],
  x: number,
  startY: number,
  width: number,
) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let cy = startY;
  for (const it of items) {
    doc.setTextColor(50, 50, 50);
    // Truncate label to leave room for stars
    const starsW = 5 * 6 + 4 * 2;
    const labelMaxW = width - starsW - 8;
    const labelLines = doc.splitTextToSize(`• ${it.label}`, labelMaxW);
    doc.text(labelLines[0], x, cy);

    const starSize = 6;
    const gap = 2;
    const totalW = 5 * starSize + 4 * gap;
    let sx = x + width - totalW;
    for (let i = 0; i < 5; i++) {
      drawStar(doc, sx + starSize / 2, cy - 3, starSize / 2, i < it.dots);
      sx += starSize + gap;
    }
    cy += 14;
  }
}

function drawStar(doc: jsPDF, cx: number, cy: number, r: number, filled: boolean) {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  if (filled) {
    doc.setFillColor(28, 78, 156);
  } else {
    doc.setFillColor(220, 220, 225);
  }
  // jsPDF lines() expects relative deltas
  const lines: [number, number][] = [];
  for (let i = 1; i < points.length; i++) {
    lines.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
  }
  lines.push([points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]]);
  doc.lines(lines, points[0][0], points[0][1], [1, 1], 'F', true);
}

function drawMapPin(doc: jsPDF, x: number, y: number, size: number, r: number, g: number, b: number) {
  // White rounded "chip" background circle
  doc.setFillColor(255, 255, 255);
  doc.circle(x + size / 2, y + size / 2, size * 0.95, 'F');
  // Pin body (teardrop approximated by circle + small triangle)
  doc.setFillColor(r, g, b);
  const cx = x + size / 2;
  const cy = y + size / 2 - size * 0.05;
  doc.circle(cx, cy, size * 0.45, 'F');
  // Triangle tip
  doc.triangle(
    cx - size * 0.3, cy + size * 0.15,
    cx + size * 0.3, cy + size * 0.15,
    cx, cy + size * 0.65,
    'F',
  );
  // Inner white dot
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy - size * 0.05, size * 0.16, 'F');
}

function loadImageAsDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default AdminDashboard;
