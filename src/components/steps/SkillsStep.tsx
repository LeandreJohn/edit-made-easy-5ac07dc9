import { SKILL_CATEGORIES, SelectedSkill, ProficiencyLevel, ALL_SKILLS_FLAT } from '@/types/application';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import SkipGate, { SkipGateBanner } from '@/components/wizard/SkipGate';
import { useSkipAnswer } from '@/lib/skipAnswers';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SkillsStepProps {
  data: SelectedSkill[];
  onChange: (data: SelectedSkill[]) => void;
  /** Optional — kept for backward compatibility. Value Proposition now lives in its own step. */
  valueProposition?: string;
  onValuePropositionChange?: (value: string) => void;
  /** Wizard only — advance when the applicant answers "No". */
  onSkip?: () => void;
}

const PROFICIENCY_LEVELS: ProficiencyLevel[] = ['Basic', 'Intermediate', 'Proficient', 'Expert'];

const LEGEND_ROWS: { level: ProficiencyLevel; desc: string }[] = [
  { level: 'Basic', desc: 'Minimal exposure; would need training to perform independently' },
  { level: 'Intermediate', desc: 'Can perform with occasional guidance or support' },
  { level: 'Proficient', desc: 'Perform this independently and consistently without guidance' },
  { level: 'Expert', desc: 'Teach others, lead in this area, or considered a specialist' },
];

interface SkillChipProps {
  skill: string;
  selected: boolean;
  proficiency?: ProficiencyLevel;
  open: boolean;
  onToggle: () => void;
  onSetProficiency: (p: ProficiencyLevel) => void;
  onClose: () => void;
}

const SkillChip = ({ skill, selected, proficiency, open, onToggle, onSetProficiency, onClose }: SkillChipProps) => {
  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          className={`skill-chip ${selected ? 'skill-chip-active' : 'skill-chip-inactive'}`}
        >
          {skill}
          {proficiency && <span className="text-[10px] opacity-80 ml-1">({proficiency})</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-44 p-2">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Proficiency Level</p>
        {PROFICIENCY_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onSetProficiency(level)}
            className="block w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-muted rounded transition-colors"
          >
            {level}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};


const SkillsStep = ({ data, onChange, onSkip }: SkillsStepProps) => {
  const [hasSkills, setHasSkills] = useSkipAnswer('skills', data.length > 0);
  const [showProficiency, setShowProficiency] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [pickedSkill, setPickedSkill] = useState<string | null>(null);
  const [pickedLevel, setPickedLevel] = useState<ProficiencyLevel>('Intermediate');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggest(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return ALL_SKILLS_FLAT
      .filter((s) => s.skill.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search]);

  const isSelected = (skill: string) => data.some((s) => s.skill === skill);

  const toggleSkill = (skill: string) => {
    if (isSelected(skill)) {
      onChange(data.filter((s) => s.skill !== skill));
    } else {
      setShowProficiency(skill);
    }
  };

  const setProficiency = (skill: string, proficiency: ProficiencyLevel) => {
    const category = ALL_SKILLS_FLAT.find((s) => s.skill === skill)?.category || '';
    onChange([...data.filter((s) => s.skill !== skill), { skill, category, proficiency }]);
    setShowProficiency(null);
  };

  const getProficiency = (skill: string) => {
    const found = data.find((s) => s.skill === skill)?.proficiency;
    return found && found !== 'No Experience' ? found : undefined;
  };

  const countByCategory = (cat: string) =>
    data.filter((s) => s.category === cat).length;

  if (hasSkills !== true) {
    return (
      <SkipGate
        title="Skills & Core Competencies"
        intro="Listing your core skills helps clients match you to the right work. If you'd rather not add any right now, you can continue without them."
        question="Do you have skills you'd like to add?"
        yesLabel="Yes, I have skills to add"
        noLabel="No, not right now"
        noTitle="No skills added"
        noBody="You indicated you don't have skills to add right now. You can continue to the next step, or change your answer to add some."
        answer={hasSkills}
        onAnswer={(v) => {
          if (v === false) onChange([]);
          setHasSkills(v);
        }}
        onSkip={onSkip}
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <SkipGateBanner
        title="Skills & Core Competencies"
        body="Add the skills you can perform confidently and rate your proficiency for each."
        onChangeAnswer={() => setHasSkills(null)}
      />
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground">Highlight your core skills.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Select the skills that best represent your experience and the type of support you can provide to clients.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Please choose only the skills you can perform confidently and consistently.
        </p>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="px-5 py-3 border-b border-border bg-muted/40">
          <h4 className="text-xs font-semibold tracking-wider text-foreground uppercase">
            Self-Rating Scale
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use this guide to honestly assess your proficiency for each skill.
          </p>
        </div>
        <div className="divide-y divide-border">
          {LEGEND_ROWS.map((row) => (
            <div
              key={row.level}
              className="grid grid-cols-[160px_1fr] items-center text-sm hover:bg-muted/20 transition-colors"
            >
              <div className="px-5 py-2.5">
                <span className="font-medium text-foreground">{row.level}</span>
              </div>
              <div className="px-5 py-2.5 text-muted-foreground border-l border-border">
                {row.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={searchRef} className="relative">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggest(true);
                setPickedSkill(null);
              }}
              onFocus={() => setShowSuggest(true)}
              placeholder="Search skills (only from the list below)..."
              className="form-input pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setShowSuggest(false); setPickedSkill(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={pickedLevel}
            onChange={(e) => setPickedLevel(e.target.value as ProficiencyLevel)}
            className="form-input sm:w-40"
            aria-label="Proficiency level"
          >
            {PROFICIENCY_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pickedSkill}
            onClick={() => {
              if (!pickedSkill) return;
              setProficiency(pickedSkill, pickedLevel);
              setSearch('');
              setPickedSkill(null);
              setShowSuggest(false);
            }}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        {pickedSkill && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{pickedSkill}</span> — choose a level and click Add.
          </p>
        )}
        {showSuggest && search.trim() && (
          <div className="absolute z-30 mt-1 left-0 right-0 sm:right-auto sm:w-[calc(100%-13rem)] max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {suggestions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                No matching skill. You can only pick from the list below.
              </div>
            ) : (
              suggestions.map((s) => {
                const selected = isSelected(s.skill);
                return (
                  <button
                    key={s.skill}
                    type="button"
                    onClick={() => {
                      setPickedSkill(s.skill);
                      setSearch(s.skill);
                      setShowSuggest(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-muted"
                  >
                    <span className="text-foreground">{s.skill}</span>
                    <span className="text-xs text-muted-foreground">{selected ? 'Selected' : s.category}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <Accordion type="multiple" className="w-full border border-border rounded-xl bg-card">
        {SKILL_CATEGORIES.map((category) => {
          const count = countByCategory(category.name);
          return (
            <AccordionItem key={category.name} value={category.name} className="border-b border-border last:border-b-0">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground text-left">{category.name}</span>
                  {count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-5.5 h-5.5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {count}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <SkillChip
                      key={skill}
                      skill={skill}
                      selected={isSelected(skill)}
                      proficiency={getProficiency(skill)}
                      open={showProficiency === skill}
                      onToggle={() => toggleSkill(skill)}
                      onSetProficiency={(p) => setProficiency(skill, p)}
                      onClose={() => setShowProficiency(null)}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {data.length > 0 && (
        <div className="border border-border rounded-xl p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Selected Skills ({data.length})</h4>
          <div className="flex flex-wrap gap-2">
            {data.map((s) => (
              <span key={s.skill} className="skill-chip skill-chip-active">
                {s.skill} — {s.proficiency === 'No Experience' ? 'Basic' : s.proficiency}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsStep;
