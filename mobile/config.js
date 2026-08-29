import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── API URL Resolution (priority order) ─────────────────────────────────────
// 1. EXPO_PUBLIC_API_URL   → set in .env for production / CI builds
// 2. Production Mode       → defaults to https://hms-api.haripushphostel.in/api/v1
// 3. Android Emulator      → uses 10.0.2.2 host loopback alias
// 4. Metro scriptURL       → auto-detected in dev client on physical device
// 5. Fallback IP           → Wi-Fi LAN / 10.0.2.2 fallback

const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP || '172.20.10.6';
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '9000';

const getApiUrl = () => {
  // 1. Explicit env override — always wins (production builds)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    const url = envUrl.trim().replace(/\/$/, '');
    console.log(`[Config] Using EXPO_PUBLIC_API_URL: ${url}`);
    return url;
  }

  // 2. Production standalone release build
  if (!__DEV__ || Constants.appOwnership === 'standalone') {
    const prodUrl = 'https://hms-api.haripushphostel.in/api/v1';
    console.log(`[Config] Production build detected — using production API: ${prodUrl}`);
    return prodUrl;
  }

  // 3. Android Emulator — 10.0.2.2 bridges directly to Mac host 127.0.0.1
  if (Platform.OS === 'android') {
    const isEmulator = !Constants.isDevice;
    if (isEmulator) {
      const emulatorUrl = `http://10.0.2.2:${API_PORT}/api/v1`;
      console.log(`[Config] Android Emulator detected — using host loopback: ${emulatorUrl}`);
      return emulatorUrl;
    }
  }

  // 4. Metro bundler scriptURL — for physical devices
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/https?:\/\/([^/:]+)/);
      if (match && match[1]) {
        const ip = match[1];
        if (ip !== 'localhost' && ip !== '127.0.0.1') {
          const url = `http://${ip}:${API_PORT}/api/v1`;
          console.log(`[Config] Auto-detected from Metro scriptURL: ${url}`);
          return url;
        }
      }
    }
  } catch (err) {
    // Ignore error
  }

  // 5. Fallback
  const fallbackIp = Platform.OS === 'android' ? '10.0.2.2' : LOCAL_IP;
  const url = `http://${fallbackIp}:${API_PORT}/api/v1`;
  console.log(`[Config] Using fallback URL: ${url}`);
  return url;
};

export const API_URL = getApiUrl();
export default { API_URL };
