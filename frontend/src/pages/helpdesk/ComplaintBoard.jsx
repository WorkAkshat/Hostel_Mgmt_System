import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Clock, Hammer, MailPlus, PhoneCall, RefreshCw, Wrench } from 'lucide-react';
import { complaints as complaintsApi } from '../../utils/api';
import Avatar from '../../components/ui/Avatar';
import Drawer from '../../components/ui/Drawer';
import FilterChips from '../../components/ui/FilterChips';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SearchBox, SkeletonList } from '../../components/ui/PageStates';
import { COMPLAINT_STATUS, PRIORITIES } from '../../config/hostel';
import { fmtDateTime, plural, timeAgo } from '../../utils/format';
import { COMPLAINT_CATEGORIES, PRIORITY_WEIGHT, categoryMeta, isDeveloperIssue } from './complaintMeta';

const daysOpen = (c) => Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000);

const TicketDrawer = ({ ticket, onClose, onSave, onForward }) => {
  const [status, setStatus] = useState('PENDING');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ticket) { setStatus(ticket.status); setNotes(ticket.wardenNotes || ''); }
  }, [ticket]);

  if (!ticket) return <Drawer open={false} onClose={onClose} />;
  const meta = categoryMeta(ticket.category);
  const Icon = meta.icon;
  const s = ticket.student || {};
  const changed = status !== ticket.status || notes !== (ticket.wardenNotes || '');

  const save = async () => {
    setSaving(true);
    const ok = await onSave(ticket, { status, wardenNotes: notes });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Complaint"
      header={
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white border border-mint-200 text-brand-700 flex items-center justify-center shrink-0"><Icon size={22} /></span>
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold m-0">{meta.label}</h3>
            <p className="text-[12px] text-[var(--text-tertiary)] m-0">#{ticket.id.slice(0, 8).toUpperCase()} · raised {timeAgo(ticket.createdAt)}</p>
            <div className="flex gap-1.5 mt-1">
              <span className={`badge normal-case ${PRIORITIES[ticket.priority]?.className || ''}`}>{PRIORITIES[ticket.priority]?.label || ticket.priority} priority</span>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex gap-2">
          <button className="btn-primary flex-1 h-11" onClick={save} disabled={saving || !changed}>
            <Check size={16} /> {saving ? 'Saving…' : 'Save update'}
          </button>
          {isDeveloperIssue(ticket) && (
            <button className="btn-secondary h-11" onClick={() => onForward(ticket)} title="Email this ticket to the developer">
              <MailPlus size={16} /> <span className="hidden sm:inline">Send to developer</span>
            </button>
          )}
        </div>
      }
    >
      <p className="text-[15px] leading-relaxed m-0 whitespace-pre-wrap">{ticket.description}</p>
      <p className="text-[12px] text-[var(--text-tertiary)] mt-2 mb-0">{fmtDateTime(ticket.createdAt)}</p>

      <div className="flex items-center gap-3 mt-5 p-3 rounded-xl bg-mint-50">
        <Avatar name={s.user?.name} src={s.user?.avatar || s.profilePic} size={40} tone="white" />
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold truncate">{s.user?.name || 'Resident'}</span>
          <span className="block text-[12px] text-[var(--text-tertiary)]">{s.rollNumber}{s.room ? ` · Room ${s.room.roomNumber}` : ''}</span>
        </span>
        {s.phoneNumber && (
          <a href={`tel:${s.phoneNumber}`} className="w-9 h-9 rounded-lg bg-white text-brand-700 flex items-center justify-center" aria-label="Call resident"><PhoneCall size={15} /></a>
        )}
      </div>

      <fieldset className="border-none p-0 m-0 mt-6">
        <legend className="text-[12px] font-bold text-brand-700 tracking-wide mb-2 p-0">Status</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {Object.entries(COMPLAINT_STATUS).map(([value, { label }]) => (
            <button
              key={value}
              role="radio"
              aria-checked={status === value}
              onClick={() => setStatus(value)}
              className={`h-10 rounded-xl text-[13px] font-semibold border cursor-pointer transition-colors ${status === value ? 'bg-sun-300 border-transparent text-sun-900' : 'bg-white border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block mt-5">
        <span className="block text-[12px] font-bold text-brand-700 tracking-wide mb-2">Note for the student</span>
        <textarea className="form-input h-28 py-2.5 resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Electrician will visit tomorrow at 11 AM" />
      </label>
      <p className="text-[12px] text-[var(--text-tertiary)] mt-1.5 mb-0">The student sees this note and gets a notification when you save.</p>
    </Drawer>
  );
};

const ComplaintBoard = () => {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('PENDING');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [forwarding, setForwarding] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems((await complaintsApi.getAll()) || []);
    } catch (err) {
      setError(err.message || 'Could not load complaints.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((c) => category === 'all' || c.category === category)
      .filter((c) => !q || [c.description, c.category, c.student?.user?.name, c.student?.room?.roomNumber].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [items, category, search]);

  const count = (st) => scoped.filter((c) => c.status === st).length;
  const visible = useMemo(
    () => scoped
      .filter((c) => tab === 'all' || c.status === tab)
      .sort((a, b) => tab === 'RESOLVED' || tab === 'all'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0) || new Date(a.createdAt) - new Date(b.createdAt)),
    [scoped, tab]
  );
  const urgentOpen = items.filter((c) => c.status !== 'RESOLVED' && c.priority === 'URGENT').length;
  const usedCategories = [...new Set(items.map((c) => c.category))];

  const update = async (ticket, patch, message) => {
    setBusyId(ticket.id);
    try {
      await complaintsApi.update(ticket.id, patch);
      setItems((list) => list.map((c) => (c.id === ticket.id ? { ...c, ...patch } : c)));
      toast.success(message || 'Complaint updated', categoryMeta(ticket.category).label);
      return true;
    } catch (err) {
      toast.error('Could not update the complaint', err.message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const forward = async () => {
    try {
      await complaintsApi.forwardDeveloper(forwarding.id);
      toast.success('Sent to the developer', 'They have been emailed the ticket details.');
      await load();
    } catch (err) {
      toast.error('Could not send the ticket', err.message);
      throw err;
    }
  };

  const openTicket = items.find((c) => c.id === openId) || null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Complaints" subtitle={`${count('PENDING')} open · ${count('IN_PROGRESS')} being fixed${urgentOpen ? ` · ${plural(urgentOpen, 'urgent ticket')}` : ''}`}>
        <button className="btn-secondary h-10" onClick={() => { setLoading(true); load(); }} aria-label="Refresh"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
      </PageHeader>

      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <SearchBox className="flex-1" value={search} onChange={setSearch} placeholder="Search issue, student or room" />
          <select className="form-input md:w-[190px] cursor-pointer" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {COMPLAINT_CATEGORIES.filter((c) => usedCategories.includes(c.value)).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <FilterChips
          id="complaint-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'PENDING', label: 'Open', count: count('PENDING') },
            { value: 'IN_PROGRESS', label: 'In progress', count: count('IN_PROGRESS') },
            { value: 'RESOLVED', label: 'Resolved', count: count('RESOLVED') },
            { value: 'all', label: 'All', count: scoped.length },
          ]}
        />
      </div>

      {error && <ErrorPanel message={error} onRetry={load} />}
      {loading ? (
        <SkeletonList height={170} columns="grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3" />
      ) : visible.length === 0 ? (
        <EmptyPanel icon={Wrench} tone={tab === 'PENDING' ? 'success' : 'mint'} title={tab === 'PENDING' ? 'No open complaints' : 'Nothing here'} text={search ? 'Try a different search.' : 'Complaints raised from the app and website show up here.'} />
      ) : (
        <ul className="list-none m-0 p-0 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {visible.map((c, i) => {
              const meta = categoryMeta(c.category);
              const Icon = meta.icon;
              const age = daysOpen(c);
              const stale = c.status !== 'RESOLVED' && age >= 3;
              return (
                <motion.li
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 9) * 0.03 } }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                  className={`bg-white border rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3 ${c.priority === 'URGENT' && c.status !== 'RESOLVED' ? 'border-[var(--danger)]/40' : 'border-[var(--border-color)]'}`}
                >
                  <button onClick={() => setOpenId(c.id)} className="flex items-start gap-3 text-left bg-transparent border-none p-0 cursor-pointer group">
                    <span className="w-10 h-10 rounded-xl bg-peach-50 text-peach-700 flex items-center justify-center shrink-0"><Icon size={18} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[14px] font-bold">{meta.label}</span>
                        <span className={`badge normal-case ${PRIORITIES[c.priority]?.className || ''}`}>{PRIORITIES[c.priority]?.label || c.priority}</span>
                        {c.status !== 'PENDING' && <span className={`badge normal-case ${COMPLAINT_STATUS[c.status]?.badge}`}>{COMPLAINT_STATUS[c.status]?.label}</span>}
                      </span>
                      <span className="block text-[13px] text-[var(--text-secondary)] mt-1 line-clamp-2">{c.description}</span>
                    </span>
                    <ChevronRight size={17} className="text-[var(--text-tertiary)] mt-1 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-tertiary)]">
                    <span className="truncate">{c.student?.user?.name || 'Resident'}{c.student?.room ? ` · Room ${c.student.room.roomNumber}` : ''}</span>
                    <span className={`flex items-center gap-1 shrink-0 ${stale ? 'text-[var(--danger)] font-semibold' : ''}`}>
                      <Clock size={12} /> {stale ? `Waiting ${age} days` : timeAgo(c.createdAt)}
                    </span>
                  </div>
                  {c.wardenNotes && <p className="text-[12px] text-brand-800 bg-mint-50 rounded-lg px-3 py-2 m-0 line-clamp-2">Note: {c.wardenNotes}</p>}
                  {c.status === 'PENDING' && (
                    <button className="btn-secondary h-9 text-[13px]" disabled={busyId === c.id} onClick={() => update(c, { status: 'IN_PROGRESS', wardenNotes: c.wardenNotes || '' }, 'Marked in progress')}>
                      <Hammer size={14} /> Start fixing
                    </button>
                  )}
                  {c.status === 'IN_PROGRESS' && (
                    <button className="btn-brand h-9 text-[13px]" disabled={busyId === c.id} onClick={() => update(c, { status: 'RESOLVED', wardenNotes: c.wardenNotes || '' }, 'Marked resolved')}>
                      <Check size={14} /> Mark resolved
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <TicketDrawer
        ticket={openTicket}
        onClose={() => setOpenId(null)}
        onSave={(t, patch) => update(t, patch, 'Complaint updated')}
        onForward={setForwarding}
      />

      <ConfirmDialog
        open={Boolean(forwarding)}
        tone="default"
        title="Send this ticket to the developer?"
        message="The ticket details and the student's name and email are emailed to the developer support address."
        confirmLabel="Send email"
        onConfirm={forward}
        onClose={() => setForwarding(null)}
      />
    </div>
  );
};

export default ComplaintBoard;
