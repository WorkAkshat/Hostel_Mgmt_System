import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Plus, Send, ShieldAlert, Trash2, Users } from 'lucide-react';
import { notices as noticesApi } from '../utils/api';
import CustomModal from './CustomModal';
import ConfirmDialog from './ui/ConfirmDialog';
import { Field } from './ui/FormField';
import { useToast } from './ui/Toast';
import { timeAgo } from '../utils/format';

const AUDIENCE = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'STUDENTS', label: 'Residents' },
  { value: 'STAFF', label: 'Staff' },
];
const TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'MESS', label: 'Mess' },
  { value: 'URGENT', label: 'Urgent' },
];
const tone = (n) => (n.category === 'URGENT'
  ? { card: 'bg-[var(--danger-bg)] border-transparent', icon: 'bg-[var(--danger)] text-white', label: 'text-[var(--danger)]' }
  : n.category === 'MESS'
    ? { card: 'bg-peach-50 border-peach-100', icon: 'bg-peach-500 text-white', label: 'text-peach-700' }
    : { card: 'bg-lilac-50 border-lilac-100', icon: 'bg-lilac-500 text-white', label: 'text-lilac-700' });

const Pills = ({ id, options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const active = o.value === value;
      return (
        <button type="button" key={o.value} aria-pressed={active} onClick={() => onChange(o.value)}
          className={`relative h-10 px-4 rounded-xl border text-[13px] cursor-pointer ${active ? 'border-transparent text-sun-900 font-semibold' : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}>
          {active && <motion.span layoutId={id} className="absolute inset-0 rounded-xl bg-sun-300" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="relative">{o.label}</span>
        </button>
      );
    })}
  </div>
);

const NewAnnouncement = ({ open, onClose, onPosted }) => {
  const [form, setForm] = useState({ target: 'ALL', category: 'GENERAL', title: '', content: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setForm({ target: 'ALL', category: 'GENERAL', title: '', content: '' }); setError(null); } }, [open]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(null); };
  const submit = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 3 || form.content.trim().length < 5) return setError('Add a short title and the message.');
    setSaving(true);
    try {
      await noticesApi.create({ ...form, title: form.title.trim(), content: form.content.trim() });
      onPosted(form.target);
    } catch (err) { setError(err.message || 'Could not post.'); } finally { setSaving(false); }
  };
  return (
    <CustomModal isOpen={open} onClose={onClose} title="New announcement">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Who should see it"><Pills id="ann-aud" options={AUDIENCE} value={form.target} onChange={(v) => set('target', v)} /></Field>
        <Field label="Type"><Pills id="ann-type" options={TYPES} value={form.category} onChange={(v) => set('category', v)} /></Field>
        <Field label="Title" required htmlFor="ann-title">
          <input id="ann-title" className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Water supply off 2–4 PM" autoFocus />
        </Field>
        <Field label="Message" required htmlFor="ann-body" hint="Shows at the top of their home screen in the app and on the website">
          <textarea id="ann-body" className="form-input min-h-[110px] py-3" value={form.content} onChange={(e) => set('content', e.target.value)} />
        </Field>
        {error && <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium"><ShieldAlert size={16} /> {error}</div>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}><Send size={15} /> {saving ? 'Posting…' : 'Announce'}</button>
        </div>
      </form>
    </CustomModal>
  );
};

// Announcements card. Admins post and delete; residents and staff see the ones meant for them
// (the server filters by role).
const AnnouncementsPanel = ({ admin = false, limit = 4, className = '' }) => {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try { const r = await noticesApi.getAll(); setList(Array.isArray(r) ? r : []); } catch { /* keep the last list */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  if (!admin && !loading && list.length === 0) return null;
  const shown = showAll ? list : list.slice(0, limit);

  return (
    <section className={`bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-lilac-50 text-lilac-700 flex items-center justify-center"><Megaphone size={19} /></span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-bold m-0">Announcements</h2>
          <p className="text-[12px] text-[var(--text-tertiary)] m-0">{admin ? 'Tell residents, staff or everyone at once' : 'News from the warden'}</p>
        </div>
        {admin && <button type="button" className="btn-primary" onClick={() => setPosting(true)}><Plus size={16} /> New</button>}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[0, 1].map((i) => <div key={i} className="h-24 rounded-2xl skeleton-loading" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-6 text-[13px] text-[var(--text-tertiary)]">No announcements yet. Post one — residents see it on their home screen.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shown.map((n) => {
            const t = tone(n);
            return (
              <article key={n.id} className={`rounded-2xl border p-4 flex gap-3 ${t.card}`}>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.icon}`}><Megaphone size={16} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${t.label}`}>{n.category === 'URGENT' ? 'Urgent' : n.category === 'MESS' ? 'Mess' : 'Announcement'}</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">· {timeAgo(n.createdAt)}</span>
                    {admin && n.target && n.target !== 'ALL' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80"><Users size={11} /> {n.target === 'STAFF' ? 'Staff only' : 'Residents only'}</span>}
                  </div>
                  <h3 className="text-[15px] font-bold m-0 mt-0.5">{n.title}</h3>
                  <p className="text-[13px] text-[var(--text-secondary)] m-0 mt-1 whitespace-pre-line">{n.content}</p>
                </div>
                {admin && (
                  <button type="button" onClick={() => setRemoving(n)} aria-label={`Delete ${n.title}`} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 border-none cursor-pointer text-[var(--danger)] hover:bg-white shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
      {list.length > limit && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="self-center text-[13px] font-semibold text-brand-700 bg-transparent border-none cursor-pointer hover:underline">
          {showAll ? 'Show less' : `Show all ${list.length}`}
        </button>
      )}

      {admin && (
        <>
          <NewAnnouncement open={posting} onClose={() => setPosting(false)}
            onPosted={async (target) => { setPosting(false); toast.success('Announcement posted', target === 'STAFF' ? 'Staff see it now.' : target === 'STUDENTS' ? 'Residents see it now.' : 'Everyone sees it now.'); await load(); }} />
          <ConfirmDialog open={!!removing} title="Delete this announcement?" message="Nobody will see it any more." confirmLabel="Delete"
            onConfirm={async () => { try { await noticesApi.remove(removing.id); toast.success('Deleted'); await load(); } catch (err) { toast.error('Could not delete', err.message); } }}
            onClose={() => setRemoving(null)} />
        </>
      )}
    </section>
  );
};

export default AnnouncementsPanel;
