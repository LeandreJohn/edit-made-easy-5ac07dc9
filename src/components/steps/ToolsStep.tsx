import { SelectedTool, ProficiencyLevel } from '@/types/application';
import { Plus, Trash2, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getSuggestedToolsForRoles, GENERIC_VA_TOOLS } from '@/data/roleToolsMatrix';
import SkipGate, { SkipGateBanner } from '@/components/wizard/SkipGate';
import { useSkipAnswer } from '@/lib/skipAnswers';

interface ToolsStepProps {
  data: SelectedTool[];
  onChange: (data: SelectedTool[]) => void;
  /** Comma-separated or array of role names currently selected on the
   *  Professional Background step. Drives the Suggested tools chips. */
  selectedRoles?: string[] | string;
  /** Wizard only — advance when the applicant answers "No". */
  onSkip?: () => void;
}

const PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  'Basic',
  'Intermediate',
  'Proficient',
  'Expert',
];

const PROFICIENCY_STARS: Record<ProficiencyLevel, number> = {
  'No Experience': 2, // legacy data shown as Basic
  Basic: 2,
  Intermediate: 3,
  Proficient: 4,
  Expert: 5,
};

const ToolsStep = ({ data, onChange, selectedRoles, onSkip }: ToolsStepProps) => {
  const [hasTools, setHasTools] = useSkipAnswer('tools', data.length > 0);
  const [newTool, setNewTool] = useState('');
  const [newProficiency, setNewProficiency] = useState<ProficiencyLevel>('Intermediate');

  const rolesArr = useMemo(() => {
    if (!selectedRoles) return [];
    const list = Array.isArray(selectedRoles)
      ? selectedRoles
      : selectedRoles.split(',');
    return list.map((s) => s.trim()).filter(Boolean);
  }, [selectedRoles]);

  const suggestedTools = useMemo(
    () => (rolesArr.length === 0 ? GENERIC_VA_TOOLS : getSuggestedToolsForRoles(rolesArr)),
    [rolesArr],
  );
  const isGeneric = rolesArr.length === 0;

  const addTool = (toolName?: string) => {
    const name = (toolName ?? newTool).trim();
    if (!name) return;
    if (data.some((t) => t.tool.toLowerCase() === name.toLowerCase())) return;
    onChange([...data, { tool: name, proficiency: newProficiency }]);
    setNewTool('');
  };

  const removeTool = (tool: string) => {
    onChange(data.filter((t) => t.tool !== tool));
  };

  const updateProficiency = (tool: string, proficiency: ProficiencyLevel) => {
    onChange(data.map((t) => (t.tool === tool ? { ...t, proficiency } : t)));
  };

  const isAdded = (name: string) =>
    data.some((t) => t.tool.toLowerCase() === name.toLowerCase());

  if (hasTools !== true) {
    return (
      <SkipGate
        title="Tools & Platforms Used"
        intro="Listing the tools and platforms you've worked with helps clients see how quickly you can plug into their workflow. If you haven't used any yet, you can continue without adding them."
        question="Do you use any tools or platforms you'd like to add?"
        yesLabel="Yes, I use tools and platforms"
        noLabel="No, I don't have any yet"
        noTitle="No tools or platforms added"
        noBody="You indicated you don't have tools or platforms to add yet. You can continue to the next step, or change your answer to add some."
        answer={hasTools}
        onAnswer={(v) => {
          if (v === false) onChange([]);
          setHasTools(v);
        }}
        onSkip={onSkip}
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <SkipGateBanner
        title="Tools & Platforms Used"
        body="Add the tools and platforms you've used and rate your proficiency for each."
        onChangeAnswer={() => setHasTools(null)}
      />
      <div>
        <h3 className="text-lg font-heading font-semibold text-foreground mb-1">
          Tools & Platforms Used
        </h3>
        <p className="text-sm text-muted-foreground">
          Add the tools and platforms you've used (CRM, project management, design, etc.) and rate
          your proficiency for each.
        </p>
      </div>

      {/* Proficiency legend */}
      <div className="border border-border rounded-xl p-4 bg-card">
        <p className="text-sm font-semibold text-foreground mb-2">Proficiency Levels</p>
        <ul className="space-y-1.5 text-sm text-foreground">
          <li><span className="font-medium">Basic</span> <span className="text-muted-foreground">— Has minimal exposure to the tool; requires training and step-by-step guidance to complete simple tasks.</span></li>
          <li><span className="font-medium">Intermediate</span> <span className="text-muted-foreground">— Can use core functions of the tool with occasional support.</span></li>
          <li><span className="font-medium">Proficient</span> <span className="text-muted-foreground">— Uses the tool independently and efficiently for daily work.</span></li>
          <li><span className="font-medium">Expert</span> <span className="text-muted-foreground">— Advanced user who maximizes the tool's capabilities.</span></li>
        </ul>
      </div>

      {/* Add new tool */}
      <div className="border border-border rounded-xl p-4 bg-muted/30">
        <label className="form-label">Add a tool / platform</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="form-input flex-1"
            placeholder="e.g. HubSpot, Asana, Figma..."
            value={newTool}
            onChange={(e) => setNewTool(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTool();
              }
            }}
          />
          <select
            className="form-select sm:w-44"
            value={newProficiency}
            onChange={(e) => setNewProficiency(e.target.value as ProficiencyLevel)}
          >
            {PROFICIENCY_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => addTool()}
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Tool
          </button>
        </div>

        {/* Suggested — driven by selected roles on the Professional Background step */}
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {isGeneric
              ? 'Suggested tools (commonly used by Virtual Assistants)'
              : `Suggested tools for ${rolesArr.join(', ')}`}
          </p>
          {suggestedTools.filter((t) => !isAdded(t)).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              All suggested tools have been added.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestedTools.filter((t) => !isAdded(t)).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTool(t)}
                  className="skill-chip skill-chip-inactive"
                >
                  + {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Selected tools list */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Your Tools ({data.length})
        </h4>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground italic border border-dashed border-border rounded-xl p-6 text-center">
            No tools added yet. Add a tool above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {data.map((t) => (
              <div
                key={t.tool}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < PROFICIENCY_STARS[t.proficiency]
                            ? 'fill-primary text-primary'
                            : 'fill-muted text-muted-foreground/40'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{t.tool}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="form-select text-sm py-1.5"
                    value={t.proficiency}
                    onChange={(e) => updateProficiency(t.tool, e.target.value as ProficiencyLevel)}
                  >
                    {PROFICIENCY_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeTool(t.tool)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${t.tool}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsStep;
