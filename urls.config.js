/**
 * ══════════════════════════════════════════════════════════════
 *  Hari Pushp PG — Centralised URL Configuration
 *  ── Single source of truth for ALL API endpoints ──
 *
 *  BEFORE GO-LIVE:
 *  1. Set VITE_API_URL in frontend/.env.production
 *  2. Set EXPO_PUBLIC_API_URL in mobile/.env.production (and eas.json)
 *  3. Set DATABASE_URL in backend/.env
 *  4. Set CORS_ALLOWED_ORIGINS in backend/.env
 * ══════════════════════════════════════════════════════════════
 */

// ─── Environment ─────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Backend ─────────────────────────────────────────────────
const BACKEND = {
  // Replace with your Hostinger VPS public IP or domain
  PROD_URL:  'http://YOUR_VPS_IP:9000',
  DEV_URL:   'http://localhost:9000',
  PORT:      9000,
  API_PREFIX: '/api/v1',
};

BACKEND.BASE_URL   = IS_PROD ? BACKEND.PROD_URL  : BACKEND.DEV_URL;
BACKEND.API_BASE   = `${BACKEND.BASE_URL}${BACKEND.API_PREFIX}`;

// ─── Frontend (Web Admin Panel) ───────────────────────────────
const FRONTEND = {
  // Replace with your VPS IP / domain where the frontend is served
  PROD_URL: 'http://YOUR_VPS_IP',
  DEV_URL:  'http://localhost:5173',
};
FRONTEND.URL = IS_PROD ? FRONTEND.PROD_URL : FRONTEND.DEV_URL;

// ─── Mobile ───────────────────────────────────────────────────
const MOBILE = {
  // Same as backend — the mobile app calls the backend directly
  PROD_API_URL: `${BACKEND.PROD_URL}${BACKEND.API_PREFIX}`,
  DEV_API_URL:  `${BACKEND.DEV_URL}${BACKEND.API_PREFIX}`,
};

// ─── Database ────────────────────────────────────────────────
const DATABASE = {
  HOST:    '127.0.0.1',
  PORT:    5433,
  NAME:    'hari_pushp_pg',
  USER:    'hari_pushp_pg_user',
  // IMPORTANT: Never hardcode the password here — use DATABASE_URL in backend/.env
  // Connection string (for reference only):
  // postgresql://hari_pushp_pg_user:PASSWORD@127.0.0.1:5433/hari_pushp_pg?schema=public
};

// ─── API Routes Reference ─────────────────────────────────────
// All routes are relative to BACKEND.API_BASE
const API_ROUTES = {
  // Auth
  LOGIN:          '/auth/login',
  REGISTER:       '/auth/register',
  ME:             '/auth/me',
  REFRESH:        '/auth/refresh',
  LOGOUT:         '/auth/logout',
  PUSH_TOKEN:     '/auth/push-token',
  TEST_PUSH:      '/auth/test-push',
  PENDING:        '/auth/pending',
  APPROVE:        '/auth/approve/:id',
  REJECT:         '/auth/reject/:id',

  // Dashboard
  DASHBOARD:      '/dashboard',

  // Students
  STUDENTS:       '/students',
  STUDENT_BY_ID:  '/students/:id',

  // Rooms
  ROOMS:          '/rooms',
  ROOM_BY_ID:     '/rooms/:id',

  // Leaves
  LEAVES:         '/leaves',
  LEAVE_BY_ID:    '/leaves/:id',

  // Complaints
  COMPLAINTS:     '/complaints',
  COMPLAINT_BY_ID:'/complaints/:id',

  // Visitors
  VISITORS:       '/visitors',
  VISITOR_BY_ID:  '/visitors/:id',

  // Invoices
  INVOICES:       '/invoices',
  INVOICE_BY_ID:  '/invoices/:id',

  // Notices
  NOTICES:        '/notices',
  NOTICE_BY_ID:   '/notices/:id',

  // Staff
  STAFF:          '/staff',
  STAFF_BY_ID:    '/staff/:id',

  // Mess
  MESS_MENU:      '/mess/menu',
  MESS_ATTENDANCE:'/mess/attendance',

  // Polls
  POLLS:          '/polls',
  POLL_BY_ID:     '/polls/:id',

  // Floors
  FLOORS:         '/floors',
  FLOOR_BY_ID:    '/floors/:id',

  // Electricity Sub-meters & Demand Notes
  ELECTRICITY_READINGS: '/electricity/readings',
  DEMAND_NOTES:         '/demand-notes',
  DEMAND_NOTES_GENERATE:'/demand-notes/generate',

  // Suggestions & Night Attendance
  SUGGESTIONS:          '/suggestions',
  NIGHT_ATTENDANCE:     '/attendance/night',
  NIGHT_ATTENDANCE_BULK:'/attendance/night/bulk',

  // Health
  HEALTH:         '/health',
};

// ─── CORS Allowed Origins ─────────────────────────────────────
// Keep in sync with CORS_ALLOWED_ORIGINS in backend/.env
const CORS_ORIGINS = {
  development: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:8081',
  ],
  production: [
    'http://YOUR_VPS_IP',       // Replace with actual VPS IP/domain
    'http://YOUR_VPS_IP:5173',  // If serving frontend on same VPS on a different port
  ],
};

module.exports = {
  BACKEND,
  FRONTEND,
  MOBILE,
  DATABASE,
  API_ROUTES,
  CORS_ORIGINS,
};
