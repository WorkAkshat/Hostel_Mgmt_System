// This screen is intentionally left empty.
// Expo Router requires all files in the app directory to be valid screen components.
// Navigation to this route is disabled.
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ExploreScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, []);
  return null;
}
