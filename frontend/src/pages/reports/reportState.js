import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { floors as floorsApi, reports as reportsApi } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { currentMonth } from '../finance/financeUtils';

// Month + floor picked in one report tab carry over to the others
const KEY = 'hms_report_filters';
let filters = (() => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved?.month && saved?.floor) return saved;
  } catch { /* storage unavailable */ }
  return { month: currentMonth(), floor: 'all' };
})();
const listeners = new Set();

const setFilters = (patch) => {
  filters = { ...filters, ...patch };
  try { sessionStorage.setItem(KEY, JSON.stringify(filters)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
};

export const useReportFilters = () => {
  const value = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => filters,
  );
  return [value, setFilters];
};

// Summary responses are cached for a minute so switching tabs is instant
const cache = new Map();
const TTL = 60000;

export const useReportSummary = (month, floor) => {
  const key = `${month}|${floor}`;
  const fresh = () => {
    const hit = cache.get(key);
    return hit && Date.now() - hit.at < TTL ? hit.data : null;
  };
  const [data, setData] = useState(fresh);
  const [loading, setLoading] = useState(!fresh());
  const [error, setError] = useState(null);

  const load = useCallback(async (force = false) => {
    const hit = cache.get(key);
    if (!force && hit && Date.now() - hit.at < TTL) {
      setData(hit.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.getSummary(month, floor);
      cache.set(key, { at: Date.now(), data: res });
      setData(res);
    } catch (err) {
      setError(err.message || 'Could not load the report.');
    } finally {
      setLoading(false);
    }
  }, [key, month, floor]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: () => load(true) };
};

let floorCache = null;
export const useFloors = () => {
  const [floors, setFloors] = useState(floorCache || []);
  useEffect(() => {
    if (floorCache) return;
    floorsApi.getAll().then((f) => { floorCache = f || []; setFloors(floorCache); }).catch(() => {});
  }, []);
  return floors;
};

// Month + the floor actually in force (floor wardens are always on their own floor)
export const useReportScope = () => {
  const { user } = useAuth();
  const [f] = useReportFilters();
  return { month: f.month, floor: user?.assignedFloor ? String(user.assignedFloor) : f.floor };
};

// Turn { KEY: count } into BarList items with friendly labels
export const toItems = (obj = {}, labels = {}) =>
  Object.entries(obj).map(([k, v]) => ({ label: labels[k]?.label || labels[k]?.short || (typeof labels[k] === 'string' ? labels[k] : k), value: v })).sort((a, b) => b.value - a.value);

