import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCheck, Eye, Lightbulb, Send, ShieldAlert } from 'lucide-react';
import { suggestions as suggestionsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import FilterChips from '../components/ui/FilterChips';
import { useToast } from '../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SearchBox, SkeletonList } from '../components/ui/PageStates';
import { fmtDateTime, timeAgo } from '../utils/format';

const STATUS = {
  PENDING: { label: 'New', badge: 'badge-warning' },
  READ: { label: 'Read', badge: 'badge-info' },
  RESOLVED: { label: 'Done', badge: 'badge-success' },
};

// Students can send suggestions but the API only lets staff read them
const StudentSuggestion = () => {
  const toast = useToast();
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 10) return setError('Write at least a sentence so the warden understands the idea.');
    setSaving(true);
    try {
      await suggestionsApi.create(text.trim());
      toast.success('Suggestion sent', 'Thank you — the warden office reads every one.');
      setText('');
      setSentCount((n) => n + 1);
    } catch (err) {
      setError(err.message || 'Could not send your suggestion.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-[720px]">
      <PageHeader title="Suggestion box" subtitle="Ideas to make the hostel better — food, rules, facilities, anything." />
      <form onSubmit={submit} noValidate className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-cream-100">
          <Lightbulb size={20} className="text-sun-800 shrink-0 mt-0.5" />
          <p className="text-[13px] text-sun-900 m-0">Only the warden office can see what you write. Be specific — what should change, and why?</p>
        </div>
        <textarea
          className="form-input h-40 py-3 resize-y text-[15px]"
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          placeholder="e.g. Could the Wi-Fi router on floor 3 be moved near the corridor? Rooms at the far end get no signal."
          aria-label="Your suggestion"
          maxLength={1000}
        />
        <div className="flex items-center justify-between text-[12px] text-[var(--text-tertiary)] -mt-2">
          <span>{sentCount ? `${sentCount} sent this visit` : ''}</span>
          <span>{text.length}/1000</span>
        </div>
        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
            <ShieldAlert size={16} className="shrink-0" /> {error}
          </div>
        )}
        <button type="submit" className="btn-primary h-12" disabled={saving}><Send size={16} /> {saving ? 'Sending…' : 'Send suggestion'}</button>
      </form>
    </div>
  );
};

const SuggestionInbox = () => {
  const { user } = useAuth();
  const toast = useToast();
  const canUpdate = user.role === 'ADMIN';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems((await suggestionsApi.getAll()) || []);
    } catch (err) {
      setError(err.message || 'Could not load suggestions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (item, status) => {
    setBusyId(item.id);
    try {
      await suggestionsApi.updateStatus(item.id, status);
      setItems((list) => list.map((s) => (s.id === item.id ? { ...s, status } : s)));
      if (status === 'RESOLVED') toast.success('Marked as done');
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const scoped = items.filter((s) => !q || [s.content, s.student?.user?.name].some((v) => v && v.toLowerCase().includes(q)));
  const count = (st) => scoped.filter((s) => s.status === st).length;
  const visible = scoped
    .filter((s) => tab === 'all' || s.status === tab)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Suggestion box" subtitle={`${count('PENDING')} new idea${count('PENDING') === 1 ? '' : 's'} from residents`} />

      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search suggestions or names" />
        <FilterChips
          id="suggestion-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'PENDING', label: 'New', count: count('PENDING') },
            { value: 'READ', label: 'Read', count: count('READ') },
            { value: 'RESOLVED', label: 'Done', count: count('RESOLVED') },
            { value: 'all', label: 'All', count: scoped.length },
          ]}
        />
      </div>

      {error && <ErrorPanel message={error} onRetry={load} />}
      {loading ? (
        <SkeletonList height={130} />
      ) : visible.length === 0 ? (
        <EmptyPanel icon={Lightbulb} title={tab === 'PENDING' ? 'No new suggestions' : 'Nothing here'} text="Suggestions from students appear here." />
      ) : (
        <ul className="list-none m-0 p-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence initial={false}>
            {visible.map((s, i) => (
              <motion.li
                key={s.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 9) * 0.03 } }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                className={`border rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3 ${s.status === 'PENDING' ? 'bg-cream-50 border-cream-200' : 'bg-white border-[var(--border-color)]'}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={s.student?.user?.name} size={36} tone="sun" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-semibold truncate">{s.student?.user?.name || 'Resident'}</span>
                    <span className="block text-[12px] text-[var(--text-tertiary)]" title={fmtDateTime(s.createdAt)}>
                      {s.student?.room ? `Room ${s.student.room.roomNumber} · ` : ''}{timeAgo(s.createdAt)}
                    </span>
                  </span>
                  <span className={`badge normal-case ${STATUS[s.status]?.badge}`}>{STATUS[s.status]?.label || s.status}</span>
                </div>
                <p className="text-[14px] leading-relaxed m-0 whitespace-pre-wrap">{s.content}</p>
                {canUpdate && s.status !== 'RESOLVED' && (
                  <div className="flex gap-2">
                    {s.status === 'PENDING' && (
                      <button className="btn-secondary h-9 text-[13px] flex-1" disabled={busyId === s.id} onClick={() => setStatus(s, 'READ')}>
                        <Eye size={14} /> Mark as read
                      </button>
                    )}
                    <button className="btn-brand h-9 text-[13px] flex-1" disabled={busyId === s.id} onClick={() => setStatus(s, 'RESOLVED')}>
                      <Check size={14} /> Done
                    </button>
                  </div>
                )}
                {s.status === 'RESOLVED' && (
                  <span className="text-[12px] text-[var(--success)] flex items-center gap-1"><CheckCheck size={13} /> Acted on</span>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};

const Suggestions = () => {
  const { user } = useAuth();
  return user?.role === 'STUDENT' ? <StudentSuggestion /> : <SuggestionInbox />;
};

export default Suggestions;
