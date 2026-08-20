import { Platform } from 'react-native';
import { API_URL } from '../config';

let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch (e) {
  console.warn('[Network] NetInfo package could not be required.');
}

/**
 * Safe connection listener.
 * If the native NetInfo module is linked and running (e.g., in a compiled build), it uses it.
 * If the native module is null (e.g., in a local development Expo Go sandbox), it falls back to a ping-based check.
 */
export const addConnectionListener = (callback: (isConnected: boolean) => void) => {
  if (NetInfo) {
    try {
      // Check if native module is available
      const unsubscribe = NetInfo.addEventListener((state: any) => {
        if (state && typeof state.isConnected === 'boolean') {
          callback(state.isConnected);
        } else {
          callback(true);
        }
      });
      return unsubscribe;
    } catch (err) {
      console.log('[Network] NetInfo native module is missing. Using ping fallback listener.');
    }
  }

  // Fallback: periodic ping test
  let lastState = true;
  const checkConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      // Ping the server health endpoint
      const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const isOnline = res.ok;
      if (isOnline !== lastState) {
        lastState = isOnline;
        callback(isOnline);
      }
    } catch (err) {
      if (lastState !== false) {
        lastState = false;
        callback(false);
      }
    }
  };

  // Run initial check and set interval
  checkConnection();
  const interval = setInterval(checkConnection, 10000);

  return () => clearInterval(interval);
};
