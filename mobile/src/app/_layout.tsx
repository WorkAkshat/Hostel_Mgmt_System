import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from '../lib/auth';
import { queryClient, useAppFocusRefetch } from '../lib/query';
import { trackPath } from '../lib/nav';
import { ToastProvider } from '../ui/feedback';
import { colors } from '../ui/theme';
import OfflineBanner from '../features/OfflineBanner';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const { user, ready } = useAuth();
  useAppFocusRefetch();
  trackPath(usePathname());

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.mint200 }} />;

  const role = user?.role;
  return (
    <>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 260, freezeOnBlur: true, gestureEnabled: true, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={role === 'STUDENT'}>
          <Stack.Screen name="student" />
          <Stack.Screen name="profile" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'ADMIN'}>
          <Stack.Screen name="warden" />
          <Stack.Screen name="manage" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'STAFF'}>
          <Stack.Screen name="staff" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="helpdesk" />
          <Stack.Screen name="suggestions" />
          <Stack.Screen name="notices" />
          <Stack.Screen name="notifications" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PJS-400': PlusJakartaSans_400Regular,
    'PJS-500': PlusJakartaSans_500Medium,
    'PJS-600': PlusJakartaSans_600SemiBold,
    'PJS-700': PlusJakartaSans_700Bold,
    'PJS-800': PlusJakartaSans_800ExtraBold,
  });
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <Navigator />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
