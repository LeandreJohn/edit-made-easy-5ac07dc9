import { Info } from 'lucide-react';
import { PAY_RANGES, PAY_RANGE_DISCLAIMER, PAY_RANGE_UNDISCLOSED } from '@/data/payRanges';

interface PayRangeSliderProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

const DEFAULT_INDEX = 1;

/**
 * Stepped slider for the applicant's current pay range, with an opt-out
 * checkbox that replaces the value with "Prefer not to Disclose".
 */
const PayRangeSlider = ({ value, onChange }: PayRangeSliderProps) => {
  const undisclosed = value === PAY_RANGE_UNDISCLOSED;
  const idx = (() => {
    const i = PAY_RANGES.indexOf((value ?? '') as (typeof PAY_RANGES)[number]);
    return i >= 0 ? i : DEFAULT_INDEX;
  })();
  const pct = (idx / (PAY_RANGES.length - 1)) * 100;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <span className="form-label mb-0">Current Pay Range</span>
        <Info className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className={`mt-6 ${undisclosed ? 'opacity-50' : ''}`}>
        <div className="relative h-8">
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            style={{ left: `calc(${pct}% )` }}
          >
            {undisclosed ? PAY_RANGE_UNDISCLOSED : PAY_RANGES[idx]}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={PAY_RANGES.length - 1}
          step={1}
          value={idx}
          disabled={undisclosed}
          aria-label="Current pay range"
          onChange={(e) => onChange(PAY_RANGES[Number(e.target.value)])}
          className="w-full accent-primary cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>Below $400</span>
          <span>$4,000+</span>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={undisclosed}
          onChange={(e) => onChange(e.target.checked ? PAY_RANGE_UNDISCLOSED : PAY_RANGES[DEFAULT_INDEX])}
          className="w-4 h-4 accent-primary"
        />
        <span className="text-sm text-foreground">Prefer not to disclose</span>
      </label>

      <p className="mt-3 text-xs text-muted-foreground">{PAY_RANGE_DISCLAIMER}</p>
    </div>
  );
};

export default PayRangeSlider;
