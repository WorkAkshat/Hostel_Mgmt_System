import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck, CalendarX, CircleCheck, FileText, IdCard, Lightbulb, Megaphone, Receipt, UserCheck, UserPen, Vote, Wallet, Wrench, type LucideIcon,
} from 'lucide-react-native';
import { authApi, complaintsApi, demandNotesApi, feesApi, leavesApi, noticesApi, paymentsApi, pollsApi, studentsApi, suggestionsApi, visitorsApi } from '../api';
import { asList } from '../api/client';
import { useData } from '../lib/query';
import { storage, KEYS } from '../lib/storage';
import { fmtDate, rupees } from '../lib/format';
import { LEAVE_TYPES } from '../lib/hostel';
import type { User } from '../lib/auth';
import type { Tone } from '../ui/theme';

// The bell: built from live data, same rules as the website.
// An item's id carries the record's status, so a change shows up as unread again.
export type InboxItem = { id: string; title: string; message: string; href: string; icon: LucideIcon; tone: Tone; time: string };

const RECENT = 30 * 86400000;
const recent = (d?: string) => !!d && Date.now() - new Date(d).getTime() < RECENT;

const studentItems = async (user: User): Promise<InboxItem[]> => {
  const sid = user.studentDetails?.id;
  const [leaves, complaints, invoices, notes, ideas, requests, docs, notices, claims] = await Promise.all([
    leavesApi.mine().catch(() => []), complaintsApi.mine().catch(() => []), feesApi.mine().catch(() => []), demandNotesApi.all().catch(() => []),
    suggestionsApi.mine().catch(() => []), studentsApi.myProfileRequests().catch(() => []), sid ? studentsApi.studentDocuments(sid).catch(() => []) : [], noticesApi.all().catch(() => []),
    paymentsApi.myClaims().catch(() => []),
  ]);
  const out0: InboxItem[] = [];
  pollItems(await pollsApi.all().catch(() => []), out0);
  const out: InboxItem[] = [];
  asList(leaves).filter((l: any) => ['APPROVED', 'REJECTED'].includes(l.status) && recent(l.startDate || l.createdAt)).forEach((l: any) => {
    const ok = l.status === 'APPROVED';
    out.push({ id: `leave-${l.id}-${l.status}`, title: ok ? 'Leave approved' : 'Leave not approved', message: `${LEAVE_TYPES[l.type] || 'Leave'} from ${fmtDate(l.startDate)}${l.comments ? ` — “${l.comments}”` : ''}`, href: '/student/leaves', icon: ok ? CalendarCheck : CalendarX, tone: ok ? 'success' : 'danger', time: fmtDate(l.startDate) });
  });
  asList(complaints).filter((c: any) => c.status !== 'PENDING' && recent(c.createdAt)).forEach((c: any) => {
    const done = c.status === 'RESOLVED';
    out.push({ id: `complaint-${c.id}-${c.status}`, title: done ? 'Complaint resolved' : 'Work started on your complaint', message: `${c.category}${c.wardenNotes ? ` — ${c.wardenNotes}` : ''}`, href: '/helpdesk', icon: done ? CircleCheck : Wrench, tone: done ? 'success' : 'mint', time: fmtDate(c.createdAt) });
  });
  asList(invoices).forEach((i: any) => {
    if (i.status === 'PAID') { if (recent(i.paidAt)) out.push({ id: `invoice-${i.id}-PAID`, title: 'Payment recorded', message: `${rupees(i.amount)} received`, href: '/student/bills', icon: Receipt, tone: 'success', time: fmtDate(i.paidAt) }); }
    else out.push({ id: `invoice-${i.id}`, title: i.kind === 'CHARGE' ? `Payment request: ${i.title || 'charge'}` : 'New fee bill', message: `${rupees(i.amount)} due by ${fmtDate(i.dueDate)}${i.kind === 'CHARGE' && i.note ? ` — ${i.note}` : ''}`, href: '/student/bills', icon: Wallet, tone: 'warning', time: fmtDate(i.createdAt) });
  });
  asList(notes).forEach((n: any) => {
    if (n.status === 'PAID') { if (recent(n.paidAt)) out.push({ id: `note-${n.id}-PAID`, title: 'Payment recorded', message: `Demand note ${n.billingMonth} — ${rupees(n.totalAmount)}`, href: '/student/bills', icon: Receipt, tone: 'success', time: fmtDate(n.paidAt) }); }
    else out.push({ id: `note-${n.id}`, title: 'Demand note issued', message: `${rupees(n.totalAmount)} for ${n.billingMonth}`, href: '/student/bills', icon: FileText, tone: 'warning', time: fmtDate(n.createdAt) });
  });
  asList(ideas).filter((s: any) => s.status !== 'PENDING' && recent(s.createdAt)).forEach((s: any) => {
    out.push({ id: `suggestion-${s.id}-${s.status}`, title: s.status === 'RESOLVED' ? 'Your suggestion was acted on' : 'Warden read your suggestion', message: s.content.slice(0, 90), href: '/suggestions', icon: Lightbulb, tone: 'sun', time: fmtDate(s.createdAt) });
  });
  asList(requests).filter((r: any) => r.status !== 'PENDING' && recent(r.decidedAt || r.createdAt)).forEach((r: any) => {
    const ok = r.status === 'APPROVED';
    out.push({ id: `profile-request-${r.id}-${r.status}`, title: ok ? 'Profile change approved' : 'Profile change not approved', message: ok ? 'Your updated details are saved.' : 'Please contact the warden office.', href: '/profile', icon: UserPen, tone: ok ? 'success' : 'danger', time: fmtDate(r.decidedAt || r.createdAt) });
  });
  asList(docs).filter((d: any) => d.status !== 'PENDING').forEach((d: any) => {
    const ok = d.status === 'VERIFIED';
    out.push({ id: `document-${d.id}-${d.status}`, title: ok ? 'ID document verified' : 'ID document rejected', message: ok ? `${d.docType} accepted.` : `Please add your ${d.docType} again.`, href: '/profile', icon: IdCard, tone: ok ? 'success' : 'danger', time: fmtDate(d.createdAt) });
  });
  asList(claims).filter((c: any) => c.status !== 'PENDING' && recent(c.decidedAt || c.createdAt)).forEach((c: any) => {
    const ok = c.status === 'APPROVED';
    out.push({ id: `claim-${c.id}-${c.status}`, title: ok ? 'Payment confirmed' : 'Payment not confirmed', message: ok ? `${rupees(c.amount)} via ${c.method} — receipt ready` : `${rupees(c.amount)} — “${c.reason || 'Please check with the office'}”`, href: '/student/bills', icon: ok ? Receipt : Wallet, tone: ok ? 'success' : 'danger', time: fmtDate(c.decidedAt || c.createdAt) });
  });
  asList(notices).slice(0, 10).forEach((n: any) => out.push({ id: `notice-${n.id}`, title: n.title, message: n.content, href: '/notices', icon: Megaphone, tone: 'mint', time: fmtDate(n.createdAt) }));
  return [...out0, ...out];
};

// Open polls you haven't voted in yet
const pollItems = (polls: unknown, out: InboxItem[]) => {
  asList(polls).filter((p: any) => p.isActive && !p.userHasVoted).forEach((p: any) => out.push({ id: `poll-${p.id}`, title: 'New poll — your vote counts', message: p.question, href: '/polls', icon: Vote, tone: 'lilac', time: fmtDate(p.createdAt) }));
};

const staffItems = async (): Promise<InboxItem[]> => {
  const [polls, notices] = await Promise.all([pollsApi.all().catch(() => []), noticesApi.all().catch(() => [])]);
  const out: InboxItem[] = [];
  pollItems(polls, out);
  asList(notices).slice(0, 10).forEach((n: any) => out.push({ id: `notice-${n.id}`, title: n.title, message: n.content, href: '/notices', icon: Megaphone, tone: 'mint', time: fmtDate(n.createdAt) }));
  return out;
};

const wardenItems = async (): Promise<InboxItem[]> => {
  const [pending, leaves, complaints, visitors, requests, docs, ideas, claims] = await Promise.all([
    authApi.pending().catch(() => []), leavesApi.all().catch(() => []), complaintsApi.all().catch(() => []), visitorsApi.all().catch(() => []),
    studentsApi.profileRequests().catch(() => []), studentsApi.documents('PENDING').catch(() => []), suggestionsApi.all('PENDING').catch(() => []),
    paymentsApi.claims('PENDING').catch(() => []),
  ]);
  const out: InboxItem[] = [];
  const add = (key: string, n: number, title: string, message: string, href: string, icon: LucideIcon, tone: Tone) => {
    if (n > 0) out.push({ id: `${key}-${n}`, title, message, href, icon, tone, time: 'Now' });
  };
  add('payments', asList(claims).length, 'Payments to confirm', `${asList(claims).length} resident(s) paid by UPI / bank`, '/warden/requests?tab=payments', Receipt, 'sun');
  add('registrations', asList(pending).length, 'Registrations to approve', `${asList(pending).length} new resident(s) waiting`, '/warden/requests', UserCheck, 'danger');
  add('leaves', asList(leaves).filter((l: any) => l.status === 'PENDING').length, 'Leave requests', `${asList(leaves).filter((l: any) => l.status === 'PENDING').length} waiting for your decision`, '/warden/requests', CalendarCheck, 'warning');
  add('overdue', asList(leaves).filter((l: any) => l.status === 'CHECKED_OUT' && new Date(l.endDate) < new Date()).length, 'Past return time', 'Residents out longer than approved', '/warden/gate', CalendarX, 'danger');
  add('complaints', asList(complaints).filter((c: any) => c.status !== 'RESOLVED').length, 'Open complaints', `${asList(complaints).filter((c: any) => c.status !== 'RESOLVED').length} not resolved yet`, '/helpdesk', Wrench, 'mint');
  add('visitors', asList(visitors).filter((v: any) => !v.checkOutTime).length, 'Visitors inside', 'Not checked out yet', '/warden/gate', UserCheck, 'lilac');
  add('profile', asList(requests).filter((r: any) => r.status === 'PENDING').length, 'Profile change requests', 'Students asked to update details', '/warden/requests', UserPen, 'warning');
  add('documents', asList(docs).length, 'ID documents to verify', 'Uploaded by students', '/warden/requests', IdCard, 'mint');
  add('ideas', asList(ideas).length, 'New suggestions', 'Unread ideas from students', '/suggestions', Lightbulb, 'sun');
  return out;
};

export const useInbox = (user: User | null) => {
  const { data, refetch, isLoading } = useData(['inbox', user?.id], () => (user?.role === 'STUDENT' ? studentItems(user) : user?.role === 'ADMIN' ? wardenItems() : staffItems()), { enabled: !!user });
  const [read, setRead] = useState<string[]>([]);
  useEffect(() => {
    storage.get(KEYS.readNotifications).then((v) => setRead(v ? JSON.parse(v) : []));
  }, []);
  const markRead = useCallback((ids: string[]) => {
    setRead((prev) => {
      const next = [...new Set([...prev, ...ids])].slice(-400);
      storage.set(KEYS.readNotifications, JSON.stringify(next));
      return next;
    });
  }, []);
  const items = data || [];
  const unread = useMemo(() => items.filter((i) => !read.includes(i.id)).length, [items, read]);
  return { items, unread, read, markRead, refetch, isLoading };
};
