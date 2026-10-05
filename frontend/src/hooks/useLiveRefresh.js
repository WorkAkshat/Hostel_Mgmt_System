import { useEffect, useRef } from 'react';

// Keeps a page in step with changes made by others (warden ↔ student):
// re-runs `load` every `interval` ms while the tab is visible, and right away
// when the person comes back to the tab. `load` should update data quietly
// (no full-page skeleton).
export default function useLiveRefresh(load, interval = 30000) {
  const ref = useRef(load);
  ref.current = load;

  useEffect(() => {
    let last = Date.now();
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      last = Date.now();
      ref.current();
    };
    const timer = setInterval(run, interval);
    // Coming back to the tab: refresh if the data is more than a few seconds old
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > 5000) run();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [interval]);
}
