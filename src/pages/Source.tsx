import { useEffect, useState } from 'react';
import { useParams } from '@/lib/router-compat';
import Index from './Index';
import NotFound from './NotFound';
import { setSourcing, setSourceName, setHeadhuntingUi } from '@/lib/headhunting';

const Source = () => {
  const { name } = useParams<{ name: string }>();
  const [ready, setReady] = useState(false);
  const [ref, setRef] = useState('');

  useEffect(() => {
    if (!name) return;
    // Head-hunting styled UI only — the payload tags the contact as sourced.
    setHeadhuntingUi(true);
    setSourcing(true);
    setSourceName(name);
    setRef(new URLSearchParams(window.location.search).get('ref') || '');
    setReady(true);
    return () => {
      setHeadhuntingUi(false);
      setSourcing(false);
      setSourceName('');
    };

  }, [name]);

  if (!name) return <NotFound />;
  if (!ready) return null;
  return <Index defaultReferralLink={ref} />;
};

export default Source;
