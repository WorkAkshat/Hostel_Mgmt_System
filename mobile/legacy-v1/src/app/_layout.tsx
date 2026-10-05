import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AuthProvider } from '../../context/AuthContext';
import { LanguageProvider } from '../../context/LanguageContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import type { NotificationType } from '../../context/NotificationContext';

// ─── Global notification handler — show banner + sound when app is foregrounded ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
    },
  },
});

// ─── Tab lookup from notification data.type ──────────────────────────────────
const TYPE_TO_TAB: Record<string, string> = {
  NOTICE:       'Notices',
  POLL:         'Notices',
  LEAVE:        'Leaves',
  LEAVE_STATUS: 'Leaves',
  COMPLAINT:    'Complaints',
  INFO:         'Home',
};

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const router = useRouter();
  // Guard: don't call router before the navigator tree has mounted
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    // 1. App launched FROM notification tap (killed state).
    //    setTimeout(0) defers resolution until after the first render cycle,
    //    preventing the "state update on unmounted component" warning from expo-router.
    const timer = setTimeout(() => {
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (!mounted.current) return;
        if (response?.notification) {
          const data = response.notification.request.content.data ?? {};
          const tab = TYPE_TO_TAB[(data.type as string) ?? ''] ?? 'Home';
          router.replace({ pathname: '/dashboard', params: { tab } } as any);
        }
      });
    }, 0);

    // 2. Notification tapped while app is backgrounded (live listener)
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      if (!mounted.current) return;
      const data = response.notification.request.content.data ?? {};
      const tab = TYPE_TO_TAB[(data.type as string) ?? ''] ?? 'Home';
      router.push({ pathname: '/dashboard', params: { tab } } as any);
    });

    return () => {
      mounted.current = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="mess" />
              <Stack.Screen name="room-change" />
              <Stack.Screen name="gate-history" />
            </Stack>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
