// Every backend call the app makes, grouped by area. Mirrors the web app's utils/api.
import { api } from './client';

const q = (params: Record<string, string | number | undefined | null> = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all');
  return entries.length ? `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')}` : '';
};

export type PayMethod = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
export type Payment = { method: PayMethod; reference?: string; paidOn?: string };

export const authApi = {
  login: (email: string, password: string) => api('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => api('/auth/me'),
  logout: () => api('/auth/logout', { method: 'POST' }),
  refresh: () => api('/auth/refresh', { method: 'POST' }),
  forgotPassword: (email: string) => api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (email: string, token: string, newPassword: string) => api('/auth/reset-password', { method: 'POST', body: { email, token, newPassword } }),
  pending: () => api('/auth/pending'),
  approve: (id: string, data: Record<string, unknown>) => api(`/auth/approve/${id}`, { method: 'POST', body: data }),
  reject: (id: string) => api(`/auth/reject/${id}`, { method: 'POST' }),
};

export const dashboardApi = {
  get: () => api('/dashboard'),
};

export const studentsApi = {
  all: () => api('/students'),
  byId: (id: string) => api(`/students/${id}`),
  update: (id: string, data: Record<string, unknown>) => api(`/students/${id}`, { method: 'PUT', body: data }),
  profileRequests: () => api('/students/profile-requests'),
  myProfileRequests: () => api('/students/profile-requests/mine'),
  requestProfileChange: (data: Record<string, string>) => api('/students/profile-requests', { method: 'POST', body: data }),
  approveProfileRequest: (id: string) => api(`/students/profile-requests/${id}/approve`, { method: 'POST' }),
  rejectProfileRequest: (id: string) => api(`/students/profile-requests/${id}/reject`, { method: 'POST' }),
  documents: (status?: string) => api(`/students/documents${q({ status })}`),
  studentDocuments: (studentId: string) => api(`/students/documents/${studentId}`),
  uploadDocument: (docType: string, documentNumber: string) => api('/students/documents/upload', { method: 'POST', body: { docType, documentNumber } }),
  verifyDocument: (id: string, status: 'VERIFIED' | 'REJECTED') => api(`/students/documents/${id}/verify`, { method: 'POST', body: { status } }),
};

export const roomsApi = {
  all: () => api('/rooms'),
  update: (id: string, data: Record<string, unknown>) => api(`/rooms/${id}`, { method: 'PUT', body: data }),
};

export const floorsApi = {
  all: () => api('/floors'),
  students: (floor: number | string) => api(`/floors/${floor}/students`),
  report: (floor: number | string, month: string) =>
    api(floor === 'all' || floor === 'combined' ? `/floors/consolidated/report?month=${month}` : `/floors/${floor}/report?month=${month}`),
};

export const leavesApi = {
  all: () => api('/leaves'),
  mine: () => api('/leaves/my-leaves'),
  apply: (data: { type: string; reason: string; destination?: string; startDate: string; endDate: string }) => api('/leaves', { method: 'POST', body: data }),
  decide: (id: string, status: 'APPROVED' | 'REJECTED', comments = '') => api(`/leaves/${id}/status`, { method: 'PUT', body: { status, comments } }),
  checkout: (id: string) => api(`/leaves/${id}/checkout`, { method: 'PUT' }),
  checkin: (id: string) => api(`/leaves/${id}/checkin`, { method: 'PUT' }),
};

export const complaintsApi = {
  all: () => api('/complaints'),
  mine: () => api('/complaints/my-complaints'),
  create: (data: { category: string; description: string; priority: string; location?: string }) => api('/complaints', { method: 'POST', body: data }),
  update: (id: string, status: string, wardenNotes?: string) => api(`/complaints/${id}`, { method: 'PUT', body: { status, wardenNotes } }),
};

export const suggestionsApi = {
  all: (status?: string) => api(`/suggestions${q({ status })}`),
  mine: () => api('/suggestions/mine'),
  create: (content: string) => api('/suggestions', { method: 'POST', body: { content } }),
  setStatus: (id: string, status: string) => api(`/suggestions/${id}/status`, { method: 'PATCH', body: { status } }),
};

export const visitorsApi = {
  all: () => api('/visitors'),
  // Residents the gate can pick from (name, roll, room only)
  residents: () => api('/visitors/residents'),
  checkIn: (data: { studentRollNumber: string; name: string; phone: string; relationship: string }) => api('/visitors', { method: 'POST', body: data }),
  checkOut: (id: string) => api(`/visitors/${id}/checkout`, { method: 'PUT' }),
};

export const messApi = {
  menu: () => api('/mess/menu'),
  saveMenu: (menu: unknown) => api('/mess/menu', { method: 'POST', body: menu }),
  stats: () => api('/mess/stats'),
  kitchen: (date?: string) => api(`/mess/cook-dashboard${q({ date })}`),
  myAttendance: () => api('/mess/my-attendance'),
  myOptOuts: () => api('/mess/my-opt-outs'),
  skip: (mealType: string, date: string) => api('/mess/opt-out', { method: 'POST', body: { mealType, date } }),
  unskip: (id: string) => api(`/mess/opt-out/${id}`, { method: 'DELETE' }),
};

export const noticesApi = {
  all: (category?: string) => api(`/notices${q({ category })}`),
  create: (data: { title: string; content: string; category: string; target?: 'ALL' | 'STUDENTS' | 'STAFF' }) => api('/notices', { method: 'POST', body: data }),
  remove: (id: string) => api(`/notices/${id}`, { method: 'DELETE' }),
};

export const pollsApi = {
  all: () => api('/polls'),
  create: (question: string, options: string[]) => api('/polls', { method: 'POST', body: { question, options } }),
  vote: (id: string, option: string) => api(`/polls/${id}/vote`, { method: 'POST', body: { option } }),
  toggle: (id: string) => api(`/polls/${id}/toggle`, { method: 'PUT' }),
  remove: (id: string) => api(`/polls/${id}`, { method: 'DELETE' }),
};

export const feesApi = {
  all: () => api('/invoices'),
  mine: () => api('/invoices/my-invoices'),
  recordPayment: (id: string, payment: Payment) => api(`/invoices/${id}/pay`, { method: 'PUT', body: payment }),
};

export const demandNotesApi = {
  all: (params: { month?: string; floorNumber?: string | number } = {}) => api(`/demand-notes${q(params)}`),
  companyConfig: () => api('/demand-notes/company-config'),
  recordPayment: (id: string, payment: Payment) => api(`/demand-notes/${id}/mark-paid`, { method: 'PATCH', body: payment }),
  generate: (billingMonth: string, floorNumber?: number) => api('/demand-notes/generate', { method: 'POST', body: { billingMonth, floorNumber } }),
  // Draft → sent: residents only see a note after this
  send: (data: { ids?: string[]; month?: string; floorNumber?: string | number }) => api('/demand-notes/send', { method: 'POST', body: data }),
};

export const electricityApi = {
  readings: (params: { month?: string; floorNumber?: string | number } = {}) => api(`/electricity/readings${q(params)}`),
  submit: (data: { roomId: string; readingMonth: string; previousReading: number; currentReading: number; ratePerUnit: number }) =>
    api('/electricity/readings', { method: 'POST', body: data }),
};

export const nightApi = {
  get: (floorNumber: number | string, date: string) => api(`/attendance/night${q({ floorNumber, date })}`),
  submit: (data: { date: string; floorNumber: number | string; notifyParents: boolean; records: { studentId: string; status: string }[] }) =>
    api('/attendance/night/bulk', { method: 'POST', body: data }),
};

export const staffApi = {
  all: () => api('/staff'),
};

export const accountingApi = {
  dayBook: (floor: string | number = 'combined') => api(`/accounting/daybook?floorNumber=${floor}`),
  voucher: (data: Record<string, unknown>) => api('/accounting/vouchers', { method: 'POST', body: data }),
  profitLoss: (floor: string | number = 'combined') => api(`/accounting/profit-loss?floorNumber=${floor}`),
};

export const reportsApi = {
  summary: (month: string, floor: string | number = 'all') => api(`/reports/summary${q({ month, floorNumber: floor })}`),
};

export const activityApi = {
  list: (params: Record<string, string | number> = {}) => api(`/activity-logs${q(params)}`),
};

// Hostel UPI / bank details per floor, and "I have paid" claims that the warden confirms
export type PaymentDetails = { upiId?: string; payeeName?: string; bankName?: string; accountName?: string; accountNo?: string; ifsc?: string; note?: string };
export type ClaimMethod = 'UPI' | 'BANK' | 'CASH';
export const paymentsApi = {
  settings: () => api<Record<string, PaymentDetails>>('/payments/settings'),
  saveSettings: (floor: string, details: PaymentDetails) => api('/payments/settings', { method: 'PUT', body: { floor, ...details } }),
  claim: (data: { billKind: 'INVOICE' | 'NOTE'; billId: string; method: ClaimMethod; reference: string; paidOn: string; note?: string }) => api('/payments/claims', { method: 'POST', body: data }),
  myClaims: () => api('/payments/claims/mine'),
  claims: (status?: string) => api(`/payments/claims${q({ status })}`),
  approve: (id: string) => api(`/payments/claims/${id}/approve`, { method: 'POST' }),
  reject: (id: string, reason: string) => api(`/payments/claims/${id}/reject`, { method: 'POST', body: { reason } }),
};

// Stock register: fixed assets, other inventory, consumables (kitchen groceries…)
export type StockCategory = 'FIXED_ASSET' | 'INVENTORY' | 'CONSUMABLE';
export const inventoryApi = {
  summary: (month?: string) => api(`/inventory/summary${q({ month })}`),
  items: (category?: StockCategory) => api(`/inventory/items${q({ category })}`),
  create: (data: Record<string, unknown>) => api('/inventory/items', { method: 'POST', body: data }),
  update: (id: string, data: Record<string, unknown>) => api(`/inventory/items/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => api(`/inventory/items/${id}`, { method: 'DELETE' }),
  movements: (id: string) => api(`/inventory/items/${id}/movements`),
  move: (id: string, data: { type: 'IN' | 'OUT' | 'ADJUST'; quantity: number; unitCost?: number | null; note?: string; date?: string }) => api(`/inventory/items/${id}/movements`, { method: 'POST', body: data }),
};
