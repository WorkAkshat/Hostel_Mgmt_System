import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import { timeAgo } from '../../utils/format';

// Mess announcements are ordinary notices with category MESS.
const MessNotices = ({ notices, onPost, onDelete }) => {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const post = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    const ok = await onPost(text.trim());
    setPosting(false);
    if (ok) setText('');
  };

  return (
    <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-cream-100 text-sun-800 flex items-center justify-center"><Megaphone size={17} /></span>
        <h2 className="text-[16px] font-bold m-0">Mess announcements</h2>
      </div>

      {onPost && (
        <form onSubmit={post} className="flex flex-col gap-2">
          <textarea className="form-input h-20 py-2.5 resize-y" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Paneer will be replaced with soya chunks at dinner today." aria-label="New announcement" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-[var(--text-tertiary)]">Residents with the app get a notification.</span>
            <button type="submit" className="btn-primary h-9 px-4 text-[13px]" disabled={posting || !text.trim()}><Send size={14} /> {posting ? 'Posting…' : 'Post'}</button>
          </div>
        </form>
      )}

      {notices.length === 0 ? (
        <p className="text-[13px] text-[var(--text-tertiary)] m-0 py-2">No announcements right now.</p>
      ) : (
        <ul className="list-none m-0 p-0 flex flex-col gap-2 max-h-[320px] overflow-y-auto custom-scrollbar">
          <AnimatePresence initial={false}>
            {notices.map((n) => (
              <motion.li key={n.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-3 p-3 rounded-xl bg-cream-50 border border-cream-200">
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px]">{n.content}</span>
                  <span className="block text-[12px] text-[var(--text-tertiary)] mt-1">{n.postedBy} · {timeAgo(n.createdAt)}</span>
                </span>
                {onDelete && (
                  <button onClick={() => onDelete(n)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-white bg-transparent border-none cursor-pointer shrink-0" aria-label="Delete announcement">
                    <Trash2 size={14} />
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
};

export default MessNotices;
