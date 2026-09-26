import {
  LayoutDashboard,
  Activity,
  Users,
  BedDouble,
  CalendarDays,
  DoorOpen,
  UtensilsCrossed,
  Wrench,
  Contact,
  Receipt,
  ShieldCheck,
} from 'lucide-react';

// Single source of truth for every role's navigation.
//
// A sidebar item either points at one `path`, or bundles several related
// pages as `tabs` — the sidebar shows the section once and the layout renders
// a tab bar above the page. Existing routes stay as they are, so deep links
// (notifications, bookmarks) keep working.
//
// `mobile` is the short label used in the mobile bottom bar.
const NAVIGATION = {
  ADMIN: [
    {
      label: 'Main',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', mobile: 'Home' },
        {
          name: 'Students', icon: Users,
          tabs: [
            { path: '/admin/students', name: 'Directory' },
            { path: '/admin/approvals', name: 'Approvals' },
          ],
        },
        {
          name: 'Rooms', icon: BedDouble, mobile: 'Rooms',
          tabs: [
            { path: '/admin/rooms', name: 'Rooms & Beds' },
            { path: '/admin/floors', name: 'Floor Directory' },
          ],
        },
        {
          name: 'Leaves & Gate', icon: CalendarDays, mobile: 'Leaves',
          tabs: [
            { path: '/admin/leaves', name: 'Leaves' },
            { path: '/admin/visitors', name: 'Visitors' },
            { path: '/admin/night-attendance', name: 'Night Roll Call' },
          ],
        },
        {
          name: 'Mess', icon: UtensilsCrossed,
          tabs: [
            { path: '/admin/mess', name: 'Menu' },
            { path: '/admin/cook-dashboard', name: 'Kitchen' },
          ],
        },
        {
          name: 'Helpdesk', icon: Wrench, mobile: 'Helpdesk',
          tabs: [
            { path: '/admin/complaints', name: 'Complaints' },
            { path: '/admin/suggestions', name: 'Suggestions' },
          ],
        },
        {
          name: 'Finance', icon: Receipt,
          tabs: [
            { path: '/admin/fees', name: 'Fees & Invoices' },
            { path: '/admin/demand-notes', name: 'Demand Notes' },
            { path: '/admin/tally', name: 'Tally Ledger' },
            { path: '/admin/reports', name: 'Reports' },
          ],
        },
      ],
    },
    {
      label: 'Admin',
      items: [
        { name: 'Staff', icon: Contact, path: '/admin/staff' },
        { name: 'Activity Log', icon: Activity, path: '/admin/activity-log' },
      ],
    },
  ],
  STUDENT: [
    {
      label: 'Main',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard', mobile: 'Home' },
        { name: 'Leaves', icon: CalendarDays, path: '/student/leaves', mobile: 'Leaves' },
        { name: 'Mess', icon: UtensilsCrossed, path: '/student/mess', mobile: 'Mess' },
        {
          name: 'Helpdesk', icon: Wrench, mobile: 'Helpdesk',
          tabs: [
            { path: '/student/complaints', name: 'Complaints' },
            { path: '/student/suggestions', name: 'Suggestions' },
          ],
        },
        { name: 'My Invoices', icon: Receipt, path: '/student/fees' },
      ],
    },
  ],
  STAFF: [
    {
      label: 'Gate',
      items: [
        { name: 'Visitors', icon: DoorOpen, path: '/staff/visitors', mobile: 'Visitors' },
        { name: 'Gate Pass', icon: ShieldCheck, path: '/staff/gatepass', mobile: 'Gate Pass' },
      ],
    },
  ],
};

export const ROLE_LABELS = {
  ADMIN: 'Chief Warden',
  STAFF: 'Staff',
  STUDENT: 'Student',
};

export const itemPath = (item) => item.path || item.tabs[0].path;

export const itemPaths = (item) => (item.tabs ? item.tabs.map((tab) => tab.path) : [item.path]);

export const isItemActive = (item, pathname) => itemPaths(item).includes(pathname);

export const getNavGroups = (role) => NAVIGATION[role] || [];

export const getNavItems = (role) => getNavGroups(role).flatMap((group) => group.items);

export const getMobileNavItems = (role) => getNavItems(role).filter((item) => item.mobile);

// Every reachable page, including tabs, for the header's page search
export const getSearchablePages = (role) =>
  getNavItems(role).flatMap((item) =>
    item.tabs
      ? item.tabs.map((tab) => ({ path: tab.path, name: tab.name, section: item.name, icon: item.icon }))
      : [{ path: item.path, name: item.name, icon: item.icon }]
  );

// The multi-tab section the current page belongs to, if any
export const getActiveSection = (role, pathname) =>
  getNavItems(role).find((item) => item.tabs && isItemActive(item, pathname)) || null;

export const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';
