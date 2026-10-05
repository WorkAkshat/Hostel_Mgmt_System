import { router, type Href } from 'expo-router';

// Bottom-tab screens. Opening one of these must switch to the existing tab group,
// never push a second copy of it (that broke Back and doubled the tab bar).
const TAB_ROUTES = new Set([
  '/student', '/student/leaves', '/student/mess', '/student/bills', '/student/me',
  '/warden', '/warden/requests', '/warden/residents', '/warden/gate', '/warden/more',
  '/staff', '/staff/account',
]);

const clean = (p: string) => p.split('?')[0].replace(/\/index$/, '').replace(/\/$/, '') || '/';
const pathOf = (href: Href) => clean(typeof href === 'string' ? href : href.pathname);

// The screen on top right now — kept up to date by the root layout
let current = '/';
export const trackPath = (p: string) => { current = clean(p); };

// One way to open any screen
export const go = (href: Href) => {
  if (!TAB_ROUTES.has(pathOf(href))) return router.push(href);
  if (TAB_ROUTES.has(current)) {
    // Already on a tab: just switch tabs
    router.navigate(href);
  } else {
    // On a page above the tabs (Notifications, Profile…): close it and switch tab
    router.dismissTo(href);
  }
};

// Back arrow: go back if there is somewhere to go, otherwise land on the home tab
export const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/');
};
