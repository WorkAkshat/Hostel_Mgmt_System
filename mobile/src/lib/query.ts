import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useIsFocused } from 'expo-router';
import { focusManager, onlineManager, QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Every screen reads through React Query: the screen you are looking at refreshes
// every 30 s and again whenever the app comes back to the foreground, so a warden's
// change shows up for the student (and the other way round) without reloading.
// Screens hidden behind another tab or page stop listening, so they don't re-render
// in the background and navigation stays smooth.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export const useAppFocusRefetch = () => {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
    return () => sub.remove();
  }, []);
};

export const setOnline = (online: boolean) => onlineManager.setOnline(online);

export const useData = <T = any>(key: unknown[], fn: () => Promise<T>, opts: { enabled?: boolean; interval?: number | false } = {}) => {
  const focused = useIsFocused();
  return useQuery({
    queryKey: key,
    queryFn: fn,
    enabled: opts.enabled ?? true,
    subscribed: focused,
    refetchInterval: focused ? (opts.interval ?? 30_000) : false,
  });
};

// Run a change, then refresh the listed queries everywhere in the app
export const useAction = <A extends unknown[], R>(fn: (...args: A) => Promise<R>, refresh: unknown[][]) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: A) => fn(...args),
    onSuccess: () => Promise.all(refresh.map((k) => qc.invalidateQueries({ queryKey: k }))),
  });
};

export const useRefreshAll = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
};
