import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { updatePushToken } from './api/auth';

// ─── Notification Channels (Android) ─────────────────────────────────────────

export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  // High-priority urgent alerts (Swiggy/Zomato heads-up style)
  await Notifications.setNotificationChannelAsync('urgent-alerts', {
    name: 'Urgent Hostel Alerts',
    description: 'Critical alerts from Warden — notices, approvals, emergencies',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7F56D9',
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  // Poll notifications
  await Notifications.setNotificationChannelAsync('polls', {
    name: 'Polls & Voting',
    description: 'Warden polls and community voting',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 150, 100, 150],
    lightColor: '#7F56D9',
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  // Leave status notifications
  await Notifications.setNotificationChannelAsync('leave-status', {
    name: 'Leave & Gate Pass',
    description: 'Leave request approvals and gate pass status',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 100, 100, 100],
    lightColor: '#12B76A',
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

// ─── Trigger Immediate Local Notification (testing / in-app alerts) ──────────

export async function triggerLocalNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  channelId: string = 'urgent-alerts'
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // fire immediately
    });
  } catch (err: any) {
    console.warn('[Push] Local notification error:', err.message);
  }
}

// ─── Register Device for Push Notifications ───────────────────────────────────

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let expoToken: string | null = null;

  try {
    // 1. Setup Android notification channels
    await setupNotificationChannels();

    if (!Device.isDevice) {
      console.log('[Push] Skipping registration — running on simulator.');
      return null;
    }

    // 2. Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowProvisional: false,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push] Notification permission denied.');
      return null;
    }

    // 3. Get Expo push token (for Expo Push Service routing)
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    const pushTokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    expoToken = pushTokenData.data;
    console.log('[Push] Expo push token:', expoToken);

    // 4. Save Expo token to backend
    if (expoToken) {
      await updatePushToken(expoToken);
      console.log('[Push] Expo token saved to backend.');
    }

    // 5. Also try to get native FCM token (for direct FCM dispatch from backend)
    try {
      const nativeTokenData = await Notifications.getDevicePushTokenAsync();
      if (nativeTokenData?.data && typeof nativeTokenData.data === 'string') {
        console.log('[Push] Native FCM token obtained (length):', nativeTokenData.data.length);
        // You could save this separately if backend needs it:
        // await updatePushToken(nativeTokenData.data);
      }
    } catch (fcmErr: any) {
      console.log('[Push] Native FCM token not available:', fcmErr.message);
    }
  } catch (err: any) {
    console.warn('[Push] Registration error:', err?.message || err);
  }

  return expoToken;
}
