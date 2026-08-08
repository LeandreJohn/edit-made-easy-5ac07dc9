import { useEffect } from 'react';

/**
 * Warns the user before closing/reloading the tab while there are unsaved
 * changes. Browsers show their own generic message; `when` toggles it.
 */
export function useUnsavedChangesGuard(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy browsers require returnValue to be set.
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
}

export default useUnsavedChangesGuard;
