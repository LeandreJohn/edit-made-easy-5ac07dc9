import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { ProfessionalBackground } from '@/types/application';
import RequiredLabel from '@/components/wizard/RequiredLabel';
import SearchableSelect from '@/components/common/SearchableSelect';
import RoleInfoModal from '@/components/common/RoleInfoModal';
import { INDUSTRY_OPTIONS } from '@/data/industries';
import { type RoleName } from '@/data/roleDescriptions';
import { getRolesForIndustry } from '@/data/industryRoleMatrix';

interface ProfessionalBgStepProps {
  data: ProfessionalBackground;
  onChange: (data: ProfessionalBackground) => void;
}

const SCHEDULES = ['Immediate', '1 week', '2 weeks', '30 Days', '60 Days', '90 Days', 'Others...'];
const HOURS = ['Part-time', 'Full-time'];

const ProfessionalBgStep = ({ data, onChange }: ProfessionalBgStepProps) => {
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [initialRole, setInitialRole] = useState<RoleName | undefined>(undefined);

  const update = (field: keyof ProfessionalBackground, value: string) => {
    onChange({ ...data, [field]: value });
  };

  // Backfill defaults so the dropdowns are never blank.
  useEffect(() => {
    const patch: Partial<ProfessionalBackground> = {};
    if (!data.schedule) patch.schedule = 'Immediate';
    if (!data.hoursPerDay) patch.hoursPerDay = 'Full-time';
    if (Object.keys(patch).length) onChange({ ...data, ...patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableRoles = getRolesForIndustry(data.preferredIndustry);

  const selectedRoles = (data.preferredRole || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleIndustryChange = (v: string) => {
    const nextAvailable = getRolesForIndustry(v);
    const filteredRoles = selectedRoles.filter((r) => nextAvailable.includes(r as RoleName));
    onChange({
      ...data,
      preferredIndustry: v,
      preferredRole: filteredRoles.join(', '),
      preferredIndustryOther: v === 'Others' ? (data.preferredIndustryOther ?? '') : '',
    });
  };

  const toggleRole = (role: string) => {
    const exists = selectedRoles.includes(role);
    let next: string[];
    if (exists) {
      next = selectedRoles.filter((r) => r !== role);
    } else {
      if (selectedRoles.length >= 3) return;
      next = [...selectedRoles, role];
    }
    update('preferredRole', next.join(', '));
  };

  const openRoleInfo = (role?: RoleName) => {
    setInitialRole(role);
    setRoleModalOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground">Showcase your professional experience.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Help potential clients understand your background, skills, and the value you can bring to their business.
        </p>
      </div>

      <div>
        <RequiredLabel>Preferred Industry</RequiredLabel>
        <SearchableSelect
          value={data.preferredIndustry}
          onChange={handleIndustryChange}
          options={[...INDUSTRY_OPTIONS]}
          placeholder="Select an industry..."
        />
        {data.preferredIndustry === 'Others' && (
          <div className="mt-3">
            <RequiredLabel>Specify Industry</RequiredLabel>
            <input
              type="text"
              className="form-input"
              value={data.preferredIndustryOther ?? ''}
              onChange={(e) => onChange({ ...data, preferredIndustryOther: e.target.value })}
              placeholder="Enter your industry"
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <RequiredLabel>Preferred Role (select up to 3)</RequiredLabel>
          <button
            type="button"
            onClick={() => openRoleInfo()}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Info className="w-3.5 h-3.5" />
            View role descriptions
          </button>
        </div>
        {availableRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2 italic">
            Select a preferred industry to see matching roles.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableRoles.map((r) => {
                const active = selectedRoles.includes(r);
                const disabled = !active && selectedRoles.length >= 3;
                return (
                  <div key={r} className="inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleRole(r)}
                      disabled={disabled}
                      className={`skill-chip ${active ? 'skill-chip-active' : 'skill-chip-inactive'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {r}
                    </button>
                    <button
                      type="button"
                      onClick={() => openRoleInfo(r)}
                      className="ml-1 text-muted-foreground hover:text-primary"
                      aria-label={`About ${r}`}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selectedRoles.length}/3 selected</p>
          </>
        )}
      </div>

      <div>
        <RequiredLabel>Current Availability</RequiredLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <select className="form-select" value={data.schedule || 'Immediate'} onChange={(e) => update('schedule', e.target.value)}>
              {SCHEDULES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <select className="form-select" value={data.hoursPerDay || 'Full-time'} onChange={(e) => update('hoursPerDay', e.target.value)}>
              {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
      </div>

      <RoleInfoModal open={roleModalOpen} onOpenChange={setRoleModalOpen} initialRole={initialRole} />
    </div>
  );
};

export default ProfessionalBgStep;
