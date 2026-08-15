import { useEffect, useState } from 'react';
import Index from './Index';
import { clearAcquisition, setDavaohub, setEntryRef } from '@/lib/headhunting';

const DavaoHub = () => {
  const [ready, setReady] = useState(false);
  const [ref, setRef] = useState('');

  useEffect(() => {
    clearAcquisition();
    setDavaohub(true);
    const r = new URLSearchParams(window.location.search).get('ref') || '';
    setEntryRef(r);
    setRef(r);
    setReady(true);
  }, []);

  if (!ready) return null;
  return <Index defaultReferralLink={ref} />;
};

export default DavaoHub;
