import { useEffect, useState } from 'react';
import { useParams } from '@/lib/router-compat';
import Index from './Index';
import NotFound from './NotFound';
import { setHeadhuntingUi, setHearFrom } from '@/lib/headhunting';

const CareerSourcing = () => {
  const { hearfrom } = useParams<{ hearfrom: string }>();
  const [ready, setReady] = useState(false);
  const [ref, setRef] = useState('');

  useEffect(() => {
    if (!hearfrom) return;
    // Head-hunting styled UI only — the payload carries career_sourcing/hearfrom.
    setHeadhuntingUi(true);
    setHearFrom(hearfrom);
    setRef(new URLSearchParams(window.location.search).get('ref') || '');
    setReady(true);
    return () => {
      setHeadhuntingUi(false);
      setHearFrom('');
    };
  }, [hearfrom]);

  if (!hearfrom) return <NotFound />;
  if (!ready) return null;
  return <Index defaultReferralLink={ref} />;
};

export default CareerSourcing;
