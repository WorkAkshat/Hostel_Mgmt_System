import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── API URL Resolution (env → auto-detect → Wi-Fi fallback) ────────────────
// Priority:
//   1. EXPO_PUBLIC_API_URL — set this in .env for production builds
//   2. Metro bundler scriptURL — auto-detected in dev client / Expo Go
//   3. Expo hostUri — auto-detected in dev client
//   4. EXPO_PUBLIC_LOCAL_IP + EXPO_PUBLIC_API_PORT — Wi-Fi LAN fallback

const LOCAL_IP   = process.env.EXPO_PUBLIC_LOCAL_IP   ?? '192.168.1.78';
const API_PORT   = process.env.EXPO_PUBLIC_API_PORT   ?? '9000';

const getApiUrl = () => {
  // 1. Explicit env override (production / CI builds)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    console.log(`[Config] Using EXPO_PUBLIC_API_URL: ${envUrl}`);
    return envUrl.trim().replace(/\/$/, ''); // strip trailing slash
  }

  // 2. Metro bundler scriptURL (Expo Go & dev client)
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/);
    if (match?.[1]) {
      const ip = match[1];
      const url = `http://${ip}:${API_PORT}/api/v1`;
      console.log(`[Config] Auto-detected from Metro scriptURL: ${url}`);
      return url;
    }
  }

  // 3. Expo hostUri (development builds)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.developer?.projectUrl;
  if (hostUri) {
    const ip = hostUri.split(':')[0].replace('exp//', '').split('/')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      const url = `http://${ip}:${API_PORT}/api/v1`;
      console.log(`[Config] Auto-detected from Expo hostUri: ${url}`);
      return url;
    }
  }

  // 4. Wi-Fi LAN fallback (physical device on same network)
  const url = `http://${LOCAL_IP}:${API_PORT}/api/v1`;
  console.log(`[Config] Using Wi-Fi LAN fallback: ${url}`);
  return url;
};

export const API_URL = getApiUrl();
export default { API_URL };
