import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Plus, Trash2, Upload, Film, X, Check, BedDouble, UtensilsCrossed, Building2, Sparkles } from 'lucide-react';
import { galleryApi } from '../utils/api/gallery';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SkeletonList } from '../components/ui/PageStates';

const CATEGORIES = [
  { value: 'ALL', label: 'All Photos & Videos' },
  { value: 'ROOMS', label: 'Rooms & Beds' },
  { value: 'MESS', label: 'Mess & Food' },
  { value: 'BUILDING', label: 'Building & Gate' },
  { value: 'COMMON_AREA', label: 'Common Areas' },
];

export default function Gallery() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ROOMS');
  const [mediaType, setMediaType] = useState('IMAGE');
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await galleryApi.all();
      setItems(res?.data || res || []);
    } catch (err) {
      setError(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setFormError('File size must be under 15MB');
      return;
    }

    setFileName(file.name);
    setFormError(null);

    const isVid = file.type.startsWith('video');
    setMediaType(isVid ? 'VIDEO' : 'IMAGE');

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a title');
      return;
    }
    if (!fileData) {
      setFormError('Please select a photo or video from your computer');
      return;
    }

    setUploading(true);
    setFormError(null);
    try {
      await galleryApi.add({
        title: title.trim(),
        description: description.trim(),
        category,
        mediaType,
        fileData,
      });

      toast.success('Uploaded successfully', 'Photo/Video is now live in the hostel gallery!');
      setShowUploadModal(false);
      setTitle('');
      setDescription('');
      setFileData(null);
      setFileName('');
      loadGallery();
    } catch (err) {
      setFormError(err.message || 'Could not upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this photo from the gallery?')) return;
    try {
      setDeletingId(id);
      await galleryApi.remove(id);
      toast.success('Deleted', 'Media removed from gallery');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error('Error', err.message || 'Could not delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'ALL') return true;
    return item.category === activeTab;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">PG Photos & Video Tour</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Browse rooms, mess, reception, and amenities of Hari Pushp Tower
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium shadow-sm transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus size={18} />
            <span>Upload Photo / Video</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Media Grid */}
      {loading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorPanel message={error} onRetry={loadGallery} />
      ) : filteredItems.length === 0 ? (
        <EmptyPanel
          icon={ImageIcon}
          title="No photos in this category"
          description={isAdmin ? 'Click "Upload Photo / Video" to add pictures from your gallery.' : 'Photos will be added here soon.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative aspect-video bg-slate-100 overflow-hidden group">
                  {item.mediaType === 'VIDEO' ? (
                    <video
                      src={item.url}
                      controls
                      className="w-full h-full object-cover"
                      poster={item.thumbnail}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )}

                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-slate-800 shadow-sm">
                    {item.mediaType === 'VIDEO' ? '🎥 Video Tour' : item.category}
                  </span>

                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="absolute top-3 right-3 p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all cursor-pointer opacity-90 hover:opacity-100"
                      title="Delete photo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-base">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-tertiary)] flex items-center justify-between">
                    <span>Hari Pushp PG</span>
                    <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Modal (From Gallery / Computer) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] max-w-lg w-full p-6 shadow-xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Upload PG Photo / Video</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFileData(null);
                  setFileName('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File upload from gallery/computer */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                  Choose Photo / Video from Computer or Gallery <span className="text-red-500">*</span>
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-brand-300 bg-brand-50/50 hover:bg-brand-50 rounded-xl p-5 cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {fileData ? (
                    <div className="w-full space-y-2 text-center">
                      {mediaType === 'VIDEO' ? (
                        <div className="flex items-center justify-center gap-2 text-brand-700 font-medium">
                          <Film size={24} />
                          <span className="truncate max-w-xs">{fileName}</span>
                        </div>
                      ) : (
                        <img
                          src={fileData}
                          alt="Preview"
                          className="h-32 mx-auto rounded-lg object-cover shadow-sm"
                        />
                      )}
                      <p className="text-xs text-brand-600 font-semibold">Click to change file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                        <Upload size={22} />
                      </div>
                      <span className="text-sm font-semibold text-brand-700">Click to select photo or video</span>
                      <span className="text-xs text-slate-400">JPG, PNG, MP4 up to 15MB</span>
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium outline-none focus:border-brand-500"
                >
                  <option value="ROOMS">Rooms & Beds</option>
                  <option value="MESS">Mess & Food</option>
                  <option value="BUILDING">Building & Security</option>
                  <option value="COMMON_AREA">Common Areas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Twin Sharing Deluxe Room with AC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Attached bathroom, study table, large balcony view"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? 'Uploading…' : 'Upload to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
