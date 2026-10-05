import { CalendarCheck, CalendarX, CircleCheck, FileText, IdCard, Lightbulb, Receipt, UserPen, Wallet, Wrench } from 'lucide-react';
import {
  leaves as leavesApi, complaints as complaintsApi, fees as feesApi, demandNotes as demandNotesApi,
  suggestions as suggestionsApi, students as studentsApi,
} from './api';
import { LEAVE_TYPES } from '../config/hostel';

// Bell items built from live data. An item's id includes the record's status,
// so when the warden (or a student) changes something it shows up as unread again.

const RECENT = 30 * 86400000;
const recent = (d) => d && Date.now() - new Date(d).getTime() < RECENT;
const short = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const list = (r) => (Array.isArray(r) ? r : r?.data || []);

const tones = {
  good: 'bg-[var(--success-bg)] text-[var(--success)]',
  bad: 'bg-[var(--danger-bg)] text-[var(--danger)]',
  warn: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  info: 'bg-brand-50 text-brand-700',
};

// What a student should hear about: decisions and updates made by the warden
export const studentNotifications = async (user) => {
  const studentId = user?.studentDetails?.id;
  const [leaves, complaints, invoices, notes, suggestions, requests, docs] = await Promise.all([
    leavesApi.getMyLeaves().catch(() => []),
    complaintsApi.getMyComplaints().catch(() => []),
    feesApi.getMyInvoices().catch(() => []),
    demandNotesApi.getAll().catch(() => []),
    suggestionsApi.getMine().catch(() => []),
    studentsApi.getMyProfileRequests().catch(() => []),
    studentId ? studentsApi.getStudentDocuments(studentId).catch(() => []) : [],
  ]);
  const out = [];

  list(leaves).filter((l) => ['APPROVED', 'REJECTED'].includes(l.status) && recent(l.startDate || l.createdAt)).forEach((l) => {
    const ok = l.status === 'APPROVED';
    out.push({
      id: `leave-${l.id}-${l.status}`,
      title: ok ? 'Leave approved' : 'Leave not approved',
      message: `${LEAVE_TYPES[l.type] || 'Leave'} from ${short(l.startDate)}${l.comments ? ` — “${l.comments}”` : ''}`,
      link: '/student/leaves',
      icon: ok ? <CalendarCheck size={16} className="text-[var(--success)]" /> : <CalendarX size={16} className="text-[var(--danger)]" />,
      badgeBg: ok ? tones.good : tones.bad,
      time: short(l.startDate),
    });
  });

  list(complaints).filter((c) => c.status !== 'PENDING' && recent(c.createdAt)).forEach((c) => {
    const done = c.status === 'RESOLVED';
    out.push({
      id: `complaint-${c.id}-${c.status}`,
      title: done ? 'Complaint resolved' : 'Work started on your complaint',
      message: `${c.category}${c.wardenNotes ? ` — ${c.wardenNotes}` : ''}`,
      link: '/student/complaints',
      icon: done ? <CircleCheck size={16} className="text-[var(--success)]" /> : <Wrench size={16} className="text-brand-600" />,
      badgeBg: done ? tones.good : tones.info,
      time: short(c.createdAt),
    });
  });

  list(invoices).forEach((i) => {
    if (i.status === 'PAID') {
      if (recent(i.paidAt)) out.push({ id: `invoice-${i.id}-PAID`, title: 'Payment recorded', message: `${money(i.amount)} received — receipt is ready`, link: '/student/fees', icon: <Receipt size={16} className="text-[var(--success)]" />, badgeBg: tones.good, time: short(i.paidAt) });
    } else {
      out.push({ id: `invoice-${i.id}`, title: 'New fee bill', message: `${money(i.amount)} due by ${short(i.dueDate)}`, link: '/student/fees', icon: <Wallet size={16} className="text-[var(--warning)]" />, badgeBg: tones.warn, time: short(i.createdAt) });
    }
  });

  list(notes).forEach((n) => {
    if (n.status === 'PAID') {
      if (recent(n.paidAt)) out.push({ id: `note-${n.id}-PAID`, title: 'Payment recorded', message: `Demand note ${n.billingMonth} — ${money(n.totalAmount)}`, link: '/student/fees', icon: <Receipt size={16} className="text-[var(--success)]" />, badgeBg: tones.good, time: short(n.paidAt) });
    } else {
      out.push({ id: `note-${n.id}`, title: 'Demand note issued', message: `${money(n.totalAmount)} for ${n.billingMonth} (incl. electricity ${money(n.electricityAmount)})`, link: '/student/fees', icon: <FileText size={16} className="text-[var(--warning)]" />, badgeBg: tones.warn, time: short(n.createdAt) });
    }
  });

  list(suggestions).filter((s) => s.status !== 'PENDING' && recent(s.createdAt)).forEach((s) => {
    out.push({
      id: `suggestion-${s.id}-${s.status}`,
      title: s.status === 'RESOLVED' ? 'Your suggestion was acted on' : 'Warden read your suggestion',
      message: s.content.length > 80 ? `${s.content.slice(0, 80)}…` : s.content,
      link: '/student/suggestions',
      icon: <Lightbulb size={16} className="text-sun-800" />,
      badgeBg: tones.info,
      time: short(s.createdAt),
    });
  });

  list(requests).filter((r) => r.status !== 'PENDING' && recent(r.decidedAt || r.createdAt)).forEach((r) => {
    const ok = r.status === 'APPROVED';
    out.push({
      id: `profile-request-${r.id}-${r.status}`,
      title: ok ? 'Profile change approved' : 'Profile change not approved',
      message: ok ? 'Your updated details are saved.' : 'Please contact the warden office.',
      link: '/student/profile',
      icon: <UserPen size={16} className={ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'} />,
      badgeBg: ok ? tones.good : tones.bad,
      time: short(r.decidedAt || r.createdAt),
    });
  });

  list(docs).filter((d) => d.status !== 'PENDING').forEach((d) => {
    const ok = d.status === 'VERIFIED';
    out.push({
      id: `document-${d.id}-${d.status}`,
      title: ok ? 'ID document verified' : 'ID document rejected',
      message: ok ? `${d.docType} accepted by the warden.` : `Please upload your ${d.docType} again.`,
      link: '/student/profile',
      icon: <IdCard size={16} className={ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'} />,
      badgeBg: ok ? tones.good : tones.bad,
      time: short(d.createdAt),
    });
  });

  return out;
};

// Student actions waiting on the warden that the main list does not already cover
export const adminExtraNotifications = async () => {
  const [requests, docs, suggestions] = await Promise.all([
    studentsApi.getProfileRequests().catch(() => []),
    studentsApi.getDocuments('PENDING').catch(() => []),
    suggestionsApi.getAll({ status: 'PENDING' }).catch(() => []),
  ]);
  const out = [];
  const pendingRequests = list(requests).filter((r) => !r.status || r.status === 'PENDING');
  if (pendingRequests.length) {
    out.push({ id: `profile-requests-${pendingRequests.map((r) => r.id).join('.')}`, title: 'Profile change requests', message: `${pendingRequests.length} student(s) asked to update their details.`, link: '/admin/approvals', icon: <UserPen size={16} className="text-[var(--warning)]" />, badgeBg: tones.warn, time: 'Review' });
  }
  const pendingDocs = list(docs);
  if (pendingDocs.length) {
    out.push({ id: `documents-${pendingDocs.map((d) => d.id).join('.')}`, title: 'ID documents to verify', message: `${pendingDocs.length} document(s) uploaded by students.`, link: '/admin/approvals', icon: <IdCard size={16} className="text-brand-600" />, badgeBg: tones.info, time: 'Verify' });
  }
  const newIdeas = list(suggestions);
  if (newIdeas.length) {
    out.push({ id: `suggestions-${newIdeas.map((s) => s.id).join('.')}`, title: 'New suggestions', message: `${newIdeas.length} unread idea(s) from students.`, link: '/admin/suggestions', icon: <Lightbulb size={16} className="text-sun-800" />, badgeBg: tones.info, time: 'Unread' });
  }
  return out;
};
