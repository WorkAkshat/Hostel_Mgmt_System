import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../config';

/**
 * Custom fetch client wrapper for Native React Native environment.
 * Automatically appends JWT token from SecureStore and checks for network errors.
 */
const client = async (endpoint, options = {}) => {
  let token = null;
  try {
    token = await SecureStore.getItemAsync('token');
  } catch (err) {
    console.warn('[API Client] Failed to retrieve token from SecureStore:', err.message);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || 'Something went wrong');
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error(`[API Client Error] Request failed on ${endpoint}:`, error.message);
    throw error;
  }
};

export default client;
