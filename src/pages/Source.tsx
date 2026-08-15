import { useEffect, useState } from 'react';
import { useParams } from '@/lib/router-compat';
import Index from './Index';
import NotFound from './NotFound';
import { clearAcquisition, setSourcing, setSourceName, setHeadhuntingUi, setEntryRef } from '@/lib/headhunting';

const Source = () => {
  const { name } = useParams<{ name: string }>();
  const [ready, setReady] = useState(false);
  const [ref, setRef] = useState('');

  useEffect(() => {
    if (!name) return;
    // Head-hunting styled UI only — the payload tags the contact as sourced.
    clearAcquisition();
    setHeadhuntingUi(true);
    setSourcing(true);
    setSourceName(name);
    const r = new URLSearchParams(window.location.search).get('ref') || '';
    setEntryRef(r);
    setRef(r);
    setReady(true);
  }, [name]);

  if (!name) return <NotFound />;
  if (!ready) return null;
  return <Index defaultReferralLink={ref} />;
};

export default Source;
