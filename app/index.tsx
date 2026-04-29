import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/auth-context';

export default function IndexScreen() {
  const { user } = useAuth();

  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}
