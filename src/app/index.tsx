import { Redirect } from 'expo-router';

import { useStore } from '@/store';

export default function Index() {
  const onboarded = useStore((s) => s.onboarded);
  const mode = useStore((s) => s.mode);
  const signedIn = useStore((s) => !!s.sessionUserId);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href={signedIn && mode === 'studio' ? '/studio/dashboard' : '/home'} />;
}
