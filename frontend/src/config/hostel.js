// Monthly fee per bed by sharing type — keep in sync with the admission form print.
export const ROOM_PRICING = {
  1: { label: 'Single sharing', roomRent: 13000, messFee: 3000, total: 16000 },
  2: { label: 'Twin sharing', roomRent: 11000, messFee: 3000, total: 14000 },
  3: { label: 'Triple sharing', roomRent: 9000, messFee: 3000, total: 12000 },
};

export const priceFor = (sharingType) => ROOM_PRICING[sharingType] || ROOM_PRICING[2];

export const STUDENT_STATUS = {
  CHECKED_IN: { label: 'Checked in', badge: 'badge-success' },
  CHECKED_OUT: { label: 'Checked out', badge: 'badge-warning' },
  SUSPENDED: { label: 'Suspended', badge: 'badge-danger' },
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const MARITAL_STATUSES = ['Unmarried', 'Married', 'Divorced'];

export const STAFF_DEPARTMENTS = [
  { value: 'Warden', label: 'Warden office' },
  { value: 'Mess', label: 'Mess committee' },
  { value: 'Security', label: 'Security' },
  { value: 'Cleaning', label: 'Cleaning & utility' },
  { value: 'Maintenance', label: 'Maintenance' },
];

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

export const DOCUMENT_TYPES = {
  AADHAAR: 'Aadhaar card',
  PAN: 'PAN card',
  PASSPORT: 'Passport',
};

// Leave types sent by the web and mobile apps (older records may use OUTING / HOME_LEAVE)
export const LEAVE_TYPES = {
  NIGHT_OUT: 'Night out',
  OUT_OF_STATION: 'Home / out of station',
  EMERGENCY: 'Emergency',
  OUTING: 'Outing',
  HOME_LEAVE: 'Home leave',
};

// Leave lifecycle: PENDING → APPROVED → CHECKED_OUT (left the gate) → RETURNED, or REJECTED
export const LEAVE_STATUS = {
  PENDING: { label: 'Waiting for approval', short: 'Pending', badge: 'badge-warning' },
  APPROVED: { label: 'Approved — not left yet', short: 'Approved', badge: 'badge-success' },
  CHECKED_OUT: { label: 'Out of hostel', short: 'Out', badge: 'bg-lilac-100 text-lilac-700' },
  RETURNED: { label: 'Back in hostel', short: 'Returned', badge: 'badge-info' },
  REJECTED: { label: 'Rejected', short: 'Rejected', badge: 'badge-danger' },
};

export const COMPLAINT_STATUS = {
  PENDING: { label: 'Open', badge: 'badge-warning' },
  IN_PROGRESS: { label: 'In progress', badge: 'badge-info' },
  RESOLVED: { label: 'Resolved', badge: 'badge-success' },
};

export const PRIORITIES = {
  LOW: { label: 'Low', className: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' },
  MEDIUM: { label: 'Medium', className: 'bg-mint-100 text-brand-700' },
  HIGH: { label: 'High', className: 'bg-amber-100 text-amber-800' },
  URGENT: { label: 'Urgent', className: 'bg-[var(--danger-bg)] text-[var(--danger)]' },
};

export const MEALS = [
  { key: 'breakfast', type: 'BREAKFAST', label: 'Breakfast', time: '7:30–9:00 AM' },
  { key: 'lunch', type: 'LUNCH', label: 'Lunch', time: '12:30–2:00 PM' },
  { key: 'snacks', type: 'SNACKS', label: 'Snacks', time: '4:30–5:30 PM' },
  { key: 'dinner', type: 'DINNER', label: 'Dinner', time: '7:00–9:00 PM' },
];

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
