import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// ─── Where the backend lives (first match wins) ──────────────────────────────
// 1. EXPO_PUBLIC_API_URL      → set in .env for production / CI builds
// 2. Release build            → https://hms-api.haripushphostel.in/api/v1
// 3. Web (expo start --web)   → same host as the page, port 9000
// 4. Android emulator         → 10.0.2.2 (the PC's localhost)
// 5. Phone with Expo Go       → the PC that runs Metro (from the QR code address)
// 6. Fallback                 → EXPO_PUBLIC_LOCAL_IP from .env
//
// Note: Constants.isDevice no longer exists in SDK 57 — checking it made every
// real phone look like an emulator and call 10.0.2.2, so login failed.

const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '9000';
const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP || '';

const isIPv4 = (host) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

// Host of the Metro server the app was loaded from, e.g. "192.168.0.8:8081"
const metroHost = () => {
  const uri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost || '';
  return String(uri).split(':')[0];
};

const getApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/$/, '');

  if (!__DEV__) return 'https://hms-api.haripushphostel.in/api/v1';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}/api/v1`;
  }

  if (Platform.OS === 'android' && Device.isDevice === false) {
    return `http://10.0.2.2:${API_PORT}/api/v1`;
  }

  // Real phone: the PC running Metro also runs the backend. A tunnel address
  // (expo start --tunnel) is not the PC, so fall back to the LAN IP from .env.
  const host = metroHost();
  if (isIPv4(host) && host !== '127.0.0.1') return `http://${host}:${API_PORT}/api/v1`;
  if (LOCAL_IP) return `http://${LOCAL_IP}:${API_PORT}/api/v1`;
  return `http://localhost:${API_PORT}/api/v1`;
};

export const API_URL = getApiUrl();
export default { API_URL };
