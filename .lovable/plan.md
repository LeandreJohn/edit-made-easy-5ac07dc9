## Root cause (confirmed)

`src/components/common/SocialLinksInput.tsx` derives its rows entirely from the serialized JSON string prop:

- `rows = useMemo(() => parseSocialLinks(value), [value])`
- every mutation calls `commit()` → `serializeSocialLinks()`, which **skips any row with an empty URL** (`if (!r.platform || !r.url.trim()) continue`)

So clicking "Add social profile" creates `{ platform, url: '' }`, serialization drops it, the prop comes back unchanged, and no row renders — the button looks dead. The same bug would make a freshly added row impossible to fill in.

## Fix

Give the component its own row state instead of round-tripping through the serialized string:

1. Hold `rows` in `useState`, seeded from `parseSocialLinks(value)`.
2. Sync from the prop only when the incoming value represents a different set of links than the current rows (guards against wiping a half-typed row on parent re-render, while still supporting external resets such as dashboard "Cancel").
3. `addRow`, `setRow`, `removeRow` update local state first, then call `onChange(serializeSocialLinks(next))` — so empty rows stay visible in the UI while remaining omitted from the payload (still never a required field).

## Scope

Single file: `src/components/common/SocialLinksInput.tsx`. No change to the parse/serialize contract, so `PersonalInfoStep` (the only call site) and the `social_links` payload behave exactly as before.

## Verification

Load the wizard's Personal Information step, click "Add social profile", confirm a row appears, pick a platform, type a URL, confirm inline validation and the remove button work, and confirm adding a blank row does not alter the saved value.
