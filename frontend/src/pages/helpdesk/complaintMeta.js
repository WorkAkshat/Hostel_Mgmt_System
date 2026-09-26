import { Zap, Droplets, AirVent, Wifi, Armchair, Sparkles, UtensilsCrossed, MonitorSmartphone, CircleHelp } from 'lucide-react';

// Values match what the mobile app stores, so tickets from both apps group together
export const COMPLAINT_CATEGORIES = [
  { value: 'Electrical', label: 'Electrical', hint: 'Fan, light, socket', icon: Zap },
  { value: 'Plumbing', label: 'Plumbing', hint: 'Tap, drain, leakage', icon: Droplets },
  { value: 'HVAC', label: 'AC & cooling', hint: 'AC, cooler, ventilation', icon: AirVent },
  { value: 'Wi-Fi', label: 'Wi-Fi', hint: 'Internet not working', icon: Wifi },
  { value: 'Furniture', label: 'Furniture', hint: 'Bed, table, cupboard, lock', icon: Armchair },
  { value: 'Cleaning', label: 'Cleaning', hint: 'Room, washroom, corridor', icon: Sparkles },
  { value: 'Mess & Food', label: 'Mess & food', hint: 'Food quality, hygiene', icon: UtensilsCrossed },
  { value: 'App / Web Issue', label: 'App / website', hint: 'Something broken in the app', icon: MonitorSmartphone },
  { value: 'Others', label: 'Other', hint: 'Anything else', icon: CircleHelp },
];

export const categoryMeta = (value) =>
  COMPLAINT_CATEGORIES.find((c) => c.value === value) ||
  (value === 'Structural' ? COMPLAINT_CATEGORIES[4] : { value, label: value || 'Other', icon: CircleHelp });

export const PRIORITY_WEIGHT = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export const isDeveloperIssue = (c) => c.category === 'App / Web Issue';
