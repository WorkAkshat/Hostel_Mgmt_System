import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';

// Sends each person to their own part of the app
export default function Index() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  if (user.role === 'STUDENT') return <Redirect href="/student" />;
  if (user.role === 'ADMIN') return <Redirect href="/warden" />;
  return <Redirect href="/staff" />;
}
