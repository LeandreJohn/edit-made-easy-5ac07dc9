import { useEffect, useState } from 'react';
import { useParams } from '@/lib/router-compat';
import Index from './Index';
import { clearAcquisition, setEntryRef, setHeadhunting, setRole } from '@/lib/headhunting';

const HeadHunting = () => {
  const params = useParams<{ role?: string }>();
  const role = params?.role ?? '';
  const [ready, setReady] = useState(false);
  const [ref, setRef] = useState('');

  useEffect(() => {
    // Entry state persists for the whole session (dashboard payload flags,
    // referral prefill and sign-out redirect all read it).
    clearAcquisition();
    setHeadhunting(true);
    setRole(role);
    const r = new URLSearchParams(window.location.search).get('ref') || '';
    setEntryRef(r);
    setRef(r);
    setReady(true);
  }, [role]);

  if (!ready) return null;
  return <Index defaultReferralLink={ref} />;
};

export default HeadHunting;
