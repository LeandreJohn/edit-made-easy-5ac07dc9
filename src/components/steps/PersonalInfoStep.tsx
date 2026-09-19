import { PersonalInfo } from '@/types/application';
import { Camera, Check, ChevronDown, X, Upload, Loader2, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import RequiredLabel from '@/components/wizard/RequiredLabel';
import SearchableSelect from '@/components/common/SearchableSelect';
import FieldTooltip from '@/components/common/FieldTooltip';

import PhoneInput from '@/components/common/PhoneInput';
import SocialLinksInput from '@/components/common/SocialLinksInput';
import EligibilityModal from '@/components/common/EligibilityModal';
import { COUNTRY_NAMES, NATIONALITIES } from '@/lib/countries';
import { fetchPhCities, fetchPhBarangays, PsgcCity } from '@/lib/philippines';
import { parseResume } from '@/lib/apiClient';

import { toast } from 'sonner';

const computeAge = (iso: string): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

const LANGUAGE_OPTIONS = [
  'English',
  'Filipino / Tagalog',
  'Mandarin / Chinese',
  'Japanese',
  'Korean',
  'Spanish',
  'French',
  'German',
  'Arabic',
  'Hindi',
  'Portuguese',
  'Russian',
  'Italian',
  'Vietnamese',
  'Thai',
  'Indonesian / Malay',
];

interface PersonalInfoStepProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

const PersonalInfoStep = ({ data, onChange }: PersonalInfoStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // PSGC city + barangay data, lazily loaded when the country is Philippines.
  // If the PSGC API errors out (e.g. network failure or rate limit), we fall
  // back to free-text inputs so applicants can still enter their address.
  const [phCities, setPhCities] = useState<PsgcCity[]>([]);
  const [phBarangays, setPhBarangays] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [citiesFailed, setCitiesFailed] = useState(false);
  const [barangaysFailed, setBarangaysFailed] = useState(false);

  useEffect(() => {
    if (data.country !== 'Philippines' || phCities.length > 0 || citiesFailed) return;
    setLoadingCities(true);
    fetchPhCities()
      .then((c) => { setPhCities(c); setCitiesFailed(false); })
      .catch(() => {
        setCitiesFailed(true);
        toast.error('Could not load Philippine cities — type your city manually.');
      })
      .finally(() => setLoadingCities(false));
  }, [data.country, phCities.length, citiesFailed]);

  const selectedCity = phCities.find((c) => c.label === data.city);

  useEffect(() => {
    if (!selectedCity) {
      setPhBarangays([]);
      setBarangaysFailed(false);
      return;
    }
    setLoadingBarangays(true);
    setBarangaysFailed(false);
    fetchPhBarangays(selectedCity.code)
      .then(setPhBarangays)
      .catch(() => {
        setBarangaysFailed(true);
        toast.error('Could not load barangays — type your barangay manually.');
      })
      .finally(() => setLoadingBarangays(false));
  }, [selectedCity?.code]);

  // Eligibility modals — only one can be open at a time.
  type EligibilityVariant = 'location' | 'nbi' | 'nbiFail' | 'underage';
  const [activeModal, setActiveModal] = useState<EligibilityVariant | null>(null);
  const lastEligibilityKey = useRef<string>('');
  const lastDobKey = useRef<string>('');

  useEffect(() => {
    if (!data.country || !data.nationality) return;
    const key = `${data.country}|${data.nationality}`;
    if (lastEligibilityKey.current === key) return;
    lastEligibilityKey.current = key;
    const isPH = data.country === 'Philippines';
    const isFilipino = data.nationality === 'Filipino';
    // Only show the location modal when BOTH conditions fail the PH/Filipino check.
    if (!isPH && !isFilipino) {
      setActiveModal('location');
    } else if (activeModal === 'location') {
      setActiveModal(null);
    }
  }, [data.country, data.nationality, activeModal]);


  useEffect(() => {
    if (!data.dateOfBirth) return;
    if (lastDobKey.current === data.dateOfBirth) return;
    lastDobKey.current = data.dateOfBirth;
    const age = computeAge(data.dateOfBirth);
    if (age !== null && age < 18) {
      setActiveModal('underage');
    }
  }, [data.dateOfBirth]);


  const update = (field: keyof PersonalInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const selectedLanguages = (data.languagesSpoken || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);



  const toggleLanguage = (lang: string) => {
    const exists = selectedLanguages.includes(lang);
    const next = exists
      ? selectedLanguages.filter((l) => l !== lang)
      : [...selectedLanguages, lang];
    update('languagesSpoken', next.join(', '));
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!data.photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(data.photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [data.photo]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    onChange({ ...data, photo: file });
  };

  const splitName = (full: string): { first: string; middle: string; last: string } => {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', middle: '', last: '' };
    if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
    if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
    return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF résumé.');
      return;
    }
    setParsing(true);
    try {
      const res = await parseResume(file);
      const p = res.parsed_data;
      const next: PersonalInfo = { ...data };
      if (p.name && !data.firstName && !data.lastName) {
        const { first, middle, last } = splitName(p.name);
        next.firstName = first;
        if (middle) next.middleName = middle;
        next.lastName = last;
      }
      if (p.phone && !data.phoneNumber) next.phoneNumber = p.phone.trim();
      onChange(next);
      toast.success('Résumé parsed — fields prefilled where empty.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse résumé.');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Provide complete and accurate personal information. This section allows both our team and potential clients to understand your background and strengthens their confidence in your readiness to support them.
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Resume Upload</p>
          <p className="text-xs text-muted-foreground">
            Upload your resume in PDF format to automatically populate parts of your profile. This helps speed up profile creation and improves the accuracy of your information. Please ensure your resume is updated, clearly formatted, and saved as a PDF file before uploading.
          </p>
        </div>
        <button
          type="button"
          onClick={() => resumeInputRef.current?.click()}
          disabled={parsing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
        >
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {parsing ? 'Parsing…' : 'Upload Résumé'}
        </button>
        <input
          ref={resumeInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleResumeUpload}
        />
      </div>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 mb-8">
        <div className="shrink-0 flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted cursor-pointer hover:border-primary transition-colors overflow-hidden p-0"
            title="Click to upload your profile picture"
          >
            {preview ? (
              <img src={preview} alt="Profile preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-primary font-medium">Upload Photo</span>
              </>
            )}
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground text-center max-w-[7.5rem] leading-tight">
            Click to upload your profile picture (JPG/PNG).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          {preview && (
            <button
              type="button"
              onClick={() => onChange({ ...data, photo: null })}
              className="mt-1 text-xs text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          )}
        </div>


        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-3" data-field="firstName">
            <RequiredLabel>First Name</RequiredLabel>
            <input className="form-input" value={data.firstName} onChange={(e) => update('firstName', e.target.value)} />
          </div>
          <div className="lg:col-span-3">
            <label className="form-label">Middle Name</label>
            <input className="form-input" value={data.middleName} onChange={(e) => update('middleName', e.target.value)} />
          </div>
          <div className="lg:col-span-4" data-field="lastName">
            <RequiredLabel>Last Name</RequiredLabel>
            <input className="form-input" value={data.lastName} onChange={(e) => update('lastName', e.target.value)} />
          </div>
          <div className="lg:col-span-2">
            <label className="form-label">Suffix</label>
            <input className="form-input" placeholder="Jr., Sr., III" value={data.suffix} onChange={(e) => update('suffix', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div data-field="dateOfBirth">
          <RequiredLabel>Date of Birth</RequiredLabel>
          <input type="date" className="form-input" value={data.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
        </div>
      </div>

      <div className="mb-5" data-field="phoneNumber">
        <RequiredLabel>Phone Number</RequiredLabel>
        <PhoneInput
          value={data.phoneNumber}
          onChange={(v, c) => onChange({ ...data, phoneNumber: v, ...(c ? { phoneCountry: c } : {}) })}
          countryName={data.phoneCountry}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div ref={langRef} className="relative" data-field="languagesSpoken">
          <RequiredLabel>Languages Spoken</RequiredLabel>
          <button
            type="button"
            onClick={() => setLangOpen((o) => !o)}
            className="form-input w-full text-left flex items-center justify-between gap-2 min-h-[42px]"
          >
            <span className={`truncate ${selectedLanguages.length === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
              {selectedLanguages.length === 0
                ? 'Select languages...'
                : `${selectedLanguages.length} selected`}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          {selectedLanguages.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedLanguages.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
                >
                  {l}
                  <button
                    type="button"
                    onClick={() => toggleLanguage(l)}
                    className="hover:text-destructive"
                    aria-label={`Remove ${l}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {langOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {LANGUAGE_OPTIONS.map((lang) => {
                const checked = selectedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted text-left"
                  >
                    <span>{lang}</span>
                    {checked && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div data-field="country">
          <RequiredLabel>Country</RequiredLabel>
          <SearchableSelect
            value={data.country}
            onChange={(v) => update('country', v)}
            options={COUNTRY_NAMES}
            placeholder="Select country..."
          />
        </div>
        <div data-field="nationality">
          <RequiredLabel>Nationality</RequiredLabel>
          <SearchableSelect
            value={data.nationality}
            onChange={(v) => update('nationality', v)}
            options={NATIONALITIES}
            placeholder="Select nationality..."
          />
        </div>
        {data.referredBy && (
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Referred By</span>
              <FieldTooltip fieldKey="referredBy" />
            </label>
            <input
              className="form-input bg-muted text-muted-foreground cursor-not-allowed opacity-90"
              value={data.referredBy}
              disabled
              readOnly
              aria-readonly
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Captured from your referral link — this cannot be changed.
            </p>
          </div>
        )}

      </div>


      <div className="mb-4">
        <Separator />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-1">Address</h4>
        <p className="text-xs text-muted-foreground">Where you're currently based.</p>
      </div>

      {data.country === 'Philippines' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          <div data-field="houseStreet">
            <RequiredLabel>House No. / Street</RequiredLabel>
            <input className="form-input" value={data.houseStreet} onChange={(e) => update('houseStreet', e.target.value)} />
          </div>
          <div data-field="city">
            <RequiredLabel>City / Municipality</RequiredLabel>
            {citiesFailed ? (
              <input
                className="form-input"
                value={data.city}
                onChange={(e) => onChange({ ...data, city: e.target.value, barangay: data.barangay })}
                placeholder="Enter city / municipality"
              />
            ) : (
              <SearchableSelect
                value={data.city}
                onChange={(v) => onChange({ ...data, city: v, barangay: '' })}
                options={phCities.map((c) => c.label)}
                placeholder={loadingCities ? 'Loading cities…' : 'Select city...'}
                disabled={loadingCities || phCities.length === 0}
              />
            )}
          </div>
          <div data-field="barangay">
            <RequiredLabel>Barangay</RequiredLabel>
            {citiesFailed || barangaysFailed ? (
              <input
                className="form-input"
                value={data.barangay}
                onChange={(e) => update('barangay', e.target.value)}
                placeholder="Enter barangay"
                disabled={!data.city}
              />
            ) : (
              <SearchableSelect
                value={data.barangay}
                onChange={(v) => update('barangay', v)}
                options={phBarangays}
                placeholder={
                  !data.city
                    ? 'Select a city first'
                    : loadingBarangays
                      ? 'Loading barangays…'
                      : 'Select barangay...'
                }
                disabled={!data.city || loadingBarangays}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <div className="sm:col-span-2" data-field="address">
            <RequiredLabel>Street Address</RequiredLabel>
            <input
              className="form-input"
              value={data.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="House / building number and street"
            />
          </div>
          <div data-field="city">
            <RequiredLabel>City</RequiredLabel>
            <input
              className="form-input"
              value={data.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Enter city"
            />
          </div>
          <div>
            <label className="form-label">State / Region / Province</label>
            <input
              className="form-input"
              value={data.stateRegion ?? ''}
              onChange={(e) => update('stateRegion', e.target.value)}
              placeholder="Enter state or region"
            />
          </div>
          <div>
            <label className="form-label">Postal / ZIP Code</label>
            <input
              className="form-input"
              value={data.postalCode ?? ''}
              onChange={(e) => update('postalCode', e.target.value)}
              placeholder="Enter postal code"
            />
          </div>
        </div>
      )}

      <div className="mb-4">
        <Separator />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-1">Social Media Profiles</h4>
        <p className="text-xs text-muted-foreground">
          Optional — share any profiles that showcase your professional presence.
        </p>
      </div>
      <div className="mb-6">
        <SocialLinksInput
          value={data.socialLinks ?? ''}
          onChange={(v) => update('socialLinks', v)}
        />
      </div>




      <EligibilityModal
        open={activeModal !== null}
        onOpenChange={(o) => { if (!o) setActiveModal(null); }}
        variant={activeModal ?? 'location'}
        onNo={() => setActiveModal('nbiFail')}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};

export default PersonalInfoStep;
