import { useEffect, useState } from 'react';
import Index from './Index';
import { clearAcquisition, setEntryRef, setHeadhunting } from '@/lib/headhunting';

const HeadHunting = () => {
  const [ready, setReady] = useState(false);
  const [ref, setRef] = useState('');

  useEffect(() => {
    // Entry state persists for the whole session (dashboard payload flags,
    // referral prefill and sign-out redirect all read it).
    clearAcquisition();
    setHeadhunting(true);
    const r = new URLSearchParams(window.location.search).get('ref') || '';
    setEntryRef(r);
    setRef(r);
    setReady(true);
  }, []);

  if (!ready) return null;
  return <Index defaultReferralLink={ref} />;
};

export default HeadHunting;
