import { useMemo } from 'react';
import { Plus, X } from 'lucide-react';

export const SOCIAL_PLATFORMS = [
  'Facebook',
  'LinkedIn',
  'Instagram',
  'X (Twitter)',
  'TikTok',
  'YouTube',
  'Portfolio Website',
  'Other Website',
] as const;

export interface SocialLinkRow {
  platform: string;
  url: string;
}

/** Parse the backend value (JSON object string, or legacy plain string). */
export function parseSocialLinks(raw: unknown): SocialLinkRow[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((r) => (typeof r === 'object' && r
        ? { platform: String((r as Record<string, unknown>).platform ?? ''), url: String((r as Record<string, unknown>).url ?? '') }
        : { platform: 'Other Website', url: String(r) }))
      .filter((r) => r.url);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .map(([platform, url]) => ({ platform, url: String(url ?? '') }))
      .filter((r) => r.url);
  }
  const s = String(raw).trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === 'object') return parseSocialLinks(parsed);
  } catch { /* not JSON — fall through */ }
  return [{ platform: 'Other Website', url: s }];
}

/** Serialise rows to the JSON string the backend stores. */
export function serializeSocialLinks(rows: SocialLinkRow[]): string {
  const obj: Record<string, string> = {};
  for (const r of rows) {
    if (!r.platform || !r.url.trim()) continue;
    obj[r.platform] = r.url.trim();
  }
  return Object.keys(obj).length ? JSON.stringify(obj) : '';
}

export function isValidUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return true; // blank allowed
  try {
    const u = new URL(v.startsWith('http') ? v : `https://${v}`);
    return !!u.hostname && u.hostname.includes('.');
  } catch {
    return false;
  }
}

interface Props {
  /** JSON string value (may be empty). */
  value: string;
  onChange: (next: string) => void;
}

/**
 * Optional "Social Media Profiles" editor. Rows of [platform] [url].
 * Never required — blank values are allowed and simply omitted from the payload.
 */
const SocialLinksInput = ({ value, onChange }: Props) => {
  const rows = useMemo(() => parseSocialLinks(value), [value]);

  const commit = (next: SocialLinkRow[]) => onChange(serializeSocialLinks(next));

  const setRow = (i: number, patch: Partial<SocialLinkRow>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    commit(next);
  };

  const addRow = () => {
    const used = new Set(rows.map((r) => r.platform));
    const nextPlatform = SOCIAL_PLATFORMS.find((p) => !used.has(p)) ?? 'Other Website';
    commit([...rows, { platform: nextPlatform, url: '' }]);
  };

  const removeRow = (i: number) => commit(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div>
        <label className="form-label">Social Media Profiles</label>
        <p className="text-xs text-muted-foreground">
          Optional. Add links to any profiles you'd like to share.
        </p>
      </div>

      {rows.map((row, i) => {
        const invalid = !isValidUrl(row.url);
        return (
          <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-start">
            <select
              className="form-select sm:w-56"
              value={row.platform}
              onChange={(e) => setRow(i, { platform: e.target.value })}
              aria-label="Platform"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              {!SOCIAL_PLATFORMS.includes(row.platform as typeof SOCIAL_PLATFORMS[number]) && (
                <option value={row.platform}>{row.platform}</option>
              )}
            </select>
            <div className="flex-1">
              <input
                className="form-input"
                placeholder="https://..."
                value={row.url}
                onChange={(e) => setRow(i, { url: e.target.value })}
                aria-label={`${row.platform} URL`}
              />
              {invalid && (
                <p className="mt-1 text-xs text-destructive">Enter a valid URL (e.g. https://example.com/yourname).</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="btn-outline px-3 py-2 self-start"
              aria-label={`Remove ${row.platform}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <button type="button" onClick={addRow} className="btn-outline text-sm inline-flex items-center gap-2">
        <Plus className="w-4 h-4" /> Add social profile
      </button>
    </div>
  );
};

export default SocialLinksInput;
