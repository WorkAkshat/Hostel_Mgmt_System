import { API_URL } from '../../config';
import { storage, KEYS } from '../lib/storage';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = { method?: string; body?: unknown; timeoutMs?: number };

// Called when the server says the session is no longer valid
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function api<T = any>(endpoint: string, { method = 'GET', body, timeoutMs = 20000 }: Options = {}): Promise<T> {
  const token = await storage.get(KEYS.token);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    throw new ApiError(
      err?.name === 'AbortError' ? 'The server took too long to answer. Check your internet and try again.' : 'Could not reach the hostel server. Check your internet connection.',
      0,
      null,
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError((data as any)?.message || 'Something went wrong. Please try again.', response.status, data);
  }
  return data as T;
}

// Lists sometimes come back paginated as { data: [] }
export const asList = <T = any>(res: any): T[] => (Array.isArray(res) ? res : res?.data || res?.rooms || []);
