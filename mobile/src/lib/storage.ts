import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Secure key-value storage. SecureStore on phones; localStorage on the web build
// (SecureStore has no web implementation).
const web = Platform.OS === 'web';

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      if (web) return globalThis.localStorage?.getItem(key) ?? null;
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (web) globalThis.localStorage?.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    } catch {
      /* storage unavailable — the session just won't persist */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (web) globalThis.localStorage?.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  },
};

export const KEYS = {
  token: 'token',
  user: 'user',
  terms: 'hms_terms_accepted_v1',
  readNotifications: 'hms_read_notifications',
};
