import { Education } from '@/types/application';
import RequiredLabel from '@/components/wizard/RequiredLabel';

interface EducationStepProps {
  data: Education;
  onChange: (data: Education) => void;
}

const EDUCATION_LEVELS = [
  'High School Graduate',
  'Vocational / Short Course',
  'Some College / Undergraduate',
  'Associate Degree',
  "Bachelor's Degree",
  "Postgraduate Degree (Master's)",
  'Doctorate / PhD',
];

const FIELDS_OF_STUDY = [
  'Accounting & Finance',
  'Architecture',
  'Arts & Design',
  'Business Administration',
  'Communications',
  'Computer Science',
  'Customer Service',
  'Economics',
  'Education',
  'Engineering',
  'Healthcare / Nursing',
  'Hospitality & Tourism',
  'Human Resources',
  'Information Technology (IT)',
  'Law / Legal Studies',
  'Marketing',
  'Mathematics',
  'Office Administration',
  'Psychology',
  'Public Relations',
  'Sales',
  'Social Sciences',
  'Other',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
// Allow expected graduation up to 6 years out, and history back 60 years.
const YEARS = Array.from({ length: 67 }, (_, i) => CURRENT_YEAR + 6 - i);

/** Split a stored "MM/YYYY" (or partial "MM/" / "/YYYY", or legacy ISO) value into parts. */
function splitGraduation(value: string): { month: string; year: string } {
  const norm = normalizeGraduation(value);
  if (norm) {
    const [month, year] = norm.split('/');
    return { month, year };
  }
  const partial = (value || '').match(/^(\d{2})?\/(\d{4})?$/);
  if (partial) return { month: partial[1] ?? '', year: partial[2] ?? '' };
  const yearOnly = (value || '').match(/^(\d{4})$/);
  if (yearOnly) return { month: '', year: yearOnly[1] };
  return { month: '', year: '' };
}


const EducationStep = ({ data, onChange }: EducationStepProps) => {
  const update = (field: keyof Education, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const { month: gradMonth, year: gradYear } = splitGraduation(data.graduationDate);
  const isUndergrad = /undergraduate|currently/i.test(data.highestLevel || '');

  // Stored as "MM/YYYY"; partial input is kept as "MM/" or "/YYYY" so the two
  // dropdowns can be filled in either order without losing the first pick.
  const setGraduation = (month: string, year: string) => {
    if (!month && !year) return update('graduationDate', '');
    update('graduationDate', `${month}/${year}`);
  };

  const gradIncomplete = (!!gradMonth && !gradYear) || (!gradMonth && !!gradYear);


  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground">Highest Level of Education</p>
        <p className="text-sm text-muted-foreground mt-1">
          Select your highest level of education completed. If applicable, include your field of study, school, and year completed to strengthen your professional profile and help clients better understand your educational background. If you did not complete a degree program, you may indicate your undergraduate studies.
        </p>
      </div>
      <div>
        <RequiredLabel>Highest Level of Education</RequiredLabel>
        <div className="space-y-2 mt-2">
          {EDUCATION_LEVELS.map((level) => (
            <label key={level} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="educationLevel"
                value={level}
                checked={data.highestLevel === level}
                onChange={() => update('highestLevel', level)}
                className="w-4 h-4 text-primary border-border focus:ring-ring"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{level}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <RequiredLabel>School Name</RequiredLabel>
          <input className="form-input" value={data.schoolName} onChange={(e) => update('schoolName', e.target.value)} />
        </div>
        <div>
          <RequiredLabel>School Location (City/Province/Country)</RequiredLabel>
          <input className="form-input" value={data.schoolLocation} onChange={(e) => update('schoolLocation', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {isUndergrad ? (
            <label className="form-label">Graduation Date (or expected)</label>
          ) : (
            <RequiredLabel>Graduation Date (or expected Graduation Date)</RequiredLabel>
          )}
          <div className="grid grid-cols-2 gap-3">
            <select
              className="form-select"
              value={gradMonth}
              onChange={(e) => setGraduation(e.target.value, gradYear)}
              aria-label="Graduation month"
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={gradYear}
              onChange={(e) => setGraduation(gradMonth, e.target.value)}
              aria-label="Graduation year"
            >
              <option value="">Year</option>
              {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          {gradIncomplete ? (
            <p className="mt-1 text-xs text-destructive">
              Select both a month and a year.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {isUndergrad
                ? 'Optional — leave blank if you have not graduated.'
                : 'Month and year only.'}
            </p>
          )}
        </div>
        {data.highestLevel !== 'High School Graduate' && (
          <div>
            <RequiredLabel>Degree / Field of Study</RequiredLabel>
            <select className="form-select" value={data.degreeField} onChange={(e) => update('degreeField', e.target.value)}>
              <option value="">Select field of study...</option>
              {FIELDS_OF_STUDY.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            {data.degreeField === 'Other' && (
              <input
                className="form-input mt-2"
                placeholder="Please specify your degree / field of study"
                value={data.degreeFieldOther ?? ''}
                onChange={(e) => update('degreeFieldOther', e.target.value)}
              />
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default EducationStep;
