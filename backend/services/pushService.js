const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// ─── Firebase Admin SDK initialization ───────────────────────────────────────
// Uses FIREBASE_SERVICE_ACCOUNT_PATH env var (defaults to ./firebase-service-account.json)

let messaging = null;
try {
  // Resolve service account path: env var (absolute) → default relative to this file's dir
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(__dirname, '../firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const adminSDK = require('firebase-admin');
    // Use fs.readFileSync+JSON.parse instead of require() to avoid module cache
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

    if (serviceAccount.private_key && !serviceAccount.private_key.includes('DummyPrivateKey')) {
      const app = adminSDK.initializeApp({
        credential: adminSDK.cert(serviceAccount),
      });
      const { getMessaging } = require('firebase-admin/messaging');
      messaging = getMessaging(app);
      console.log(
        `[Push Service] Firebase Admin SDK initialized ✓  (project: ${serviceAccount.project_id})`
      );
    } else {
      console.log('[Push Service] Skipped — service account file has a dummy/placeholder key.');
    }
  } else {
    console.log(`[Push Service] No service account file at: ${serviceAccountPath}`);
  }
} catch (err) {
  console.error('[Push Service] Firebase Admin SDK init error:', err.message);
}

// ─── Channel → notification type mapping ─────────────────────────────────────
const CHANNEL_CONFIG = {
  'urgent-alerts': { priority: 'max', importance: 'max' },
  'polls':         { priority: 'high', importance: 'high' },
  'leave-status':  { priority: 'high', importance: 'high' },
};

// ─── Send push notification to specific token(s) ─────────────────────────────
/**
 * @param {Object} params
 * @param {string|string[]} params.pushTokens  - Expo or FCM push tokens
 * @param {string}  params.title               - Notification title
 * @param {string}  params.body                - Notification body
 * @param {Object}  [params.data]              - Custom data payload
 * @param {string}  [params.channelId]         - Android channel ID (default: 'urgent-alerts')
 * @param {string}  [params.imageUrl]          - Optional image URL for rich notification
 */
const sendPushNotification = async ({
  pushTokens,
  title,
  body,
  data = {},
  channelId = 'urgent-alerts',
  imageUrl,
}) => {
  if (!pushTokens) return;

  const tokens = Array.isArray(pushTokens) ? pushTokens : [pushTokens];
  const validTokens = tokens.filter(t => typeof t === 'string' && t.trim().length > 0);
  if (validTokens.length === 0) return;

  const expoTokens = validTokens.filter(
    t => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')
  );
  const fcmTokens = validTokens.filter(
    t => !t.startsWith('ExponentPushToken') && !t.startsWith('ExpoPushToken')
  );

  const channelCfg = CHANNEL_CONFIG[channelId] || CHANNEL_CONFIG['urgent-alerts'];

  // ─── 1. Expo Push API ────────────────────────────────────────────────────
  if (expoTokens.length > 0) {
    const messages = expoTokens.map(token => ({
      to: token,
      sound: 'default',
      priority: 'high',
      title,
      body,
      channelId,
      data: { ...data, channelId },
      ...(imageUrl ? { _displayInForeground: true } : {}),
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (response.ok) {
        console.log(`[Push] Sent ${messages.length} Expo notification(s) via Expo Push API.`);
      } else {
        const err = await response.text();
        console.warn('[Push] Expo API returned error:', err);
      }
    } catch (error) {
      console.error('[Push] Expo dispatch failed:', error.message);
    }
  }

  // ─── 2. FCM Direct Dispatch (via Firebase Admin SDK) ─────────────────────
  if (fcmTokens.length > 0 && messaging) {
    try {
      const fcmMessage = {
        tokens: fcmTokens,
        notification: { title, body },
        android: {
          priority: 'high',
          notification: {
            channelId,
            sound: 'default',
            priority: channelCfg.priority,
            defaultVibrateTimings: true,
            defaultSound: true,
            defaultLightSettings: true,
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        data: Object.fromEntries(
          Object.entries({ ...data, channelId }).map(([k, v]) => [k, String(v)])
        ),
      };

      const fcmResponse = await messaging.sendEachForMulticast(fcmMessage);
      console.log(
        `[Push] FCM: ${fcmResponse.successCount} delivered, ${fcmResponse.failureCount} failed.`
      );

      // Log FCM token errors (expired tokens should be cleaned from DB)
      if (fcmResponse.failureCount > 0) {
        fcmResponse.responses.forEach((resp, i) => {
          if (!resp.success) {
            console.warn(`[Push] FCM token[${i}] error:`, resp.error?.code, resp.error?.message);
          }
        });
      }
    } catch (fcmErr) {
      console.error('[Push] FCM dispatch error:', fcmErr.message);
    }
  }
};

// ─── Broadcast to ALL registered users ───────────────────────────────────────
/**
 * @param {Object} params
 * @param {string}  params.title
 * @param {string}  params.body
 * @param {Object}  [params.data]
 * @param {string}  [params.channelId]
 */
const broadcastPushNotification = async ({
  title,
  body,
  data = {},
  channelId = 'urgent-alerts',
}) => {
  try {
    const users = await prisma.user.findMany({
      where: { pushToken: { not: null } },
      select: { pushToken: true },
    });

    const tokens = users.map(u => u.pushToken).filter(Boolean);
    if (tokens.length === 0) {
      console.log('[Push] Broadcast skipped — no registered push tokens found.');
      return;
    }

    console.log(`[Push] Broadcasting to ${tokens.length} device(s)...`);
    await sendPushNotification({ pushTokens: tokens, title, body, data, channelId });
  } catch (error) {
    console.error('[Push] Broadcast error:', error.message);
  }
};

module.exports = {
  sendPushNotification,
  broadcastPushNotification,
};
