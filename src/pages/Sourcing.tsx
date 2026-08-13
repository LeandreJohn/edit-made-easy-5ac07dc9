import { useEffect, useState } from 'react';
import { useParams } from '@/lib/router-compat';
import Index from './Index';
import NotFound from './NotFound';
import { setHeadhunting, setHearFrom } from '@/lib/headhunting';

const Sourcing = () => {
  const { hearfrom } = useParams<{ hearfrom: string }>();
  const [ready, setReady] = useState(false);
  const [ref, setRef] = useState('');

  useEffect(() => {
    if (!hearfrom) return;
    // Mirror the head-hunting flow so all isHeadhunting()-gated UI is active,
    // while tagging the contact with the dynamic :hearfrom value.
    setHeadhunting(true);
    setHearFrom(hearfrom);
    setRef(new URLSearchParams(window.location.search).get('ref') || '');
    setReady(true);
    return () => {
      setHeadhunting(false);
      setHearFrom('');
    };
  }, [hearfrom]);

  if (!hearfrom) return <NotFound />;
  if (!ready) return null;
  return <Index defaultReferralLink={ref} />;
};

export default Sourcing;
