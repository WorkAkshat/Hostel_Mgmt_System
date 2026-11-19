import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Plus, Trash2, Upload, Film, X, Check, BedDouble, UtensilsCrossed, Building2, Sparkles, Pencil, Settings2, Phone, ShieldCheck, MapPin, FileText, Eye } from 'lucide-react';
import { galleryApi } from '../utils/api/gallery';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SkeletonList } from '../components/ui/PageStates';

const DEFAULT_CATEGORIES = [
  { value: 'ROOMS', label: 'Rooms & Beds' },
  { value: 'MESS', label: 'Mess & Food' },
  { value: 'BUILDING', label: 'Building & Gate' },
  { value: 'COMMON_AREA', label: 'Common Areas' },
];

const DEFAULT_TYPES = [
  { value: 'IMAGE', label: 'Photo' },
  { value: 'VIDEO', label: 'Video Tour' },
];

export default function Gallery() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [types, setTypes] = useState(DEFAULT_TYPES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
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

  // Category & Type quick add in modal
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');

  // Helpline & Rules state
  const [showHelplineModal, setShowHelplineModal] = useState(false);
  const [helplineData, setHelplineData] = useState({
    hostelName: 'Hari Pushp Tower (Girls PG)',
    address: 'Sector 4, Jaipur, Rajasthan',
    contacts: [],
    rules: [],
    documents: []
  });
  const [hostelNameInput, setHostelNameInput] = useState('Hari Pushp Tower (Girls PG)');
  const [hostelAddressInput, setHostelAddressInput] = useState('Sector 4, Jaipur, Rajasthan');
  const [newContact, setNewContact] = useState({ title: '', phone: '', sub: '' });
  const [editingContact, setEditingContact] = useState(null);
  const [newRuleText, setNewRuleText] = useState('');
  const [editingRule, setEditingRule] = useState(null);

  // Document / Notice Sheet states
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docFileData, setDocFileData] = useState(null);
  const [docFileName, setDocFileName] = useState('');
  const [viewingDoc, setViewingDoc] = useState(null);

  const loadHelpline = useCallback(async () => {
    try {
      const res = await galleryApi.helpline();
      if (res) {
        setHelplineData(res);
        setHostelNameInput(res.hostelName || res.name || 'Hari Pushp Tower (Girls PG)');
        setHostelAddressInput(res.address || 'Sector 4, Jaipur, Rajasthan');
      }
    } catch (err) {
      console.error('Failed to load helpline', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [mediaRes, metaRes] = await Promise.all([
        galleryApi.all().catch(() => []),
        galleryApi.meta().catch(() => null),
      ]);
      setItems(mediaRes?.data || mediaRes || []);
      if (metaRes?.categories?.length) setCategories(metaRes.categories);
      if (metaRes?.types?.length) setTypes(metaRes.types);
      loadHelpline();
    } catch (err) {
      setError(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [loadHelpline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      loadData();
    } catch (err) {
      setFormError(err.message || 'Could not upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await galleryApi.update(editingItem.id, {
        title: editingItem.title.trim(),
        description: editingItem.description?.trim() || '',
        category: editingItem.category,
        mediaType: editingItem.mediaType,
      });
      toast.success('Updated', 'Photo category and details updated');
      setEditingItem(null);
      loadData();
    } catch (err) {
      toast.error('Error', err.message || 'Could not update photo');
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

  const handleAddCategory = async () => {
    if (!newCatLabel.trim()) return;
    try {
      const res = await galleryApi.addCategory(newCatLabel.trim());
      setCategories((prev) => [...prev, res.data || res || { value: newCatLabel.trim().toUpperCase(), label: newCatLabel.trim() }]);
      setCategory(res.value || newCatLabel.trim().toUpperCase());
      setNewCatLabel('');
      setShowNewCatInput(false);
      toast.success('Category added');
    } catch (err) {
      toast.error('Error', err.message || 'Could not add category');
    }
  };

  const handleDeleteCategory = async (val) => {
    if (!window.confirm(`Delete category "${val}"?`)) return;
    try {
      await galleryApi.removeCategory(val);
      setCategories((prev) => prev.filter((c) => c.value !== val));
      toast.success('Category removed');
    } catch (err) {
      toast.error('Error', err.message || 'Could not delete category');
    }
  };

  const handleAddType = async () => {
    if (!newTypeLabel.trim()) return;
    try {
      const res = await galleryApi.addType(newTypeLabel.trim());
      setTypes((prev) => [...prev, res.data || res || { value: newTypeLabel.trim().toUpperCase(), label: newTypeLabel.trim() }]);
      setMediaType(res.value || newTypeLabel.trim().toUpperCase());
      setNewTypeLabel('');
      setShowNewTypeInput(false);
      toast.success('Media type added');
    } catch (err) {
      toast.error('Error', err.message || 'Could not add type');
    }
  };

  const handleDeleteType = async (val) => {
    if (!window.confirm(`Delete type "${val}"?`)) return;
    try {
      await galleryApi.removeType(val);
      setTypes((prev) => prev.filter((t) => t.value !== val));
      toast.success('Type removed');
    } catch (err) {
      toast.error('Error', err.message || 'Could not delete type');
    }
  };

  // Helpline Handlers
  const handleSaveHostel = async (e) => {
    e.preventDefault();
    if (!hostelNameInput.trim()) return;
    try {
      const updated = await galleryApi.updateHostelInfo({
        hostelName: hostelNameInput.trim(),
        address: hostelAddressInput.trim(),
      });
      setHelplineData(updated);
      toast.success('Hostel details saved');
    } catch (err) {
      toast.error('Error', err.message || 'Could not update hostel details');
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.title || !newContact.phone) return;
    try {
      const updated = await galleryApi.addContact(newContact);
      setHelplineData(updated);
      setNewContact({ title: '', phone: '', sub: '' });
      toast.success('Contact added');
    } catch (err) {
      toast.error('Error', err.message || 'Could not add contact');
    }
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    if (!editingContact || !editingContact.title || !editingContact.phone) return;
    try {
      const updated = await galleryApi.updateContact(editingContact.id, editingContact);
      setHelplineData(updated);
      setEditingContact(null);
      toast.success('Contact updated');
    } catch (err) {
      toast.error('Error', err.message || 'Could not update contact');
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Delete this helpline contact?')) return;
    try {
      const updated = await galleryApi.removeContact(id);
      setHelplineData(updated);
      toast.success('Contact deleted');
    } catch (err) {
      toast.error('Error', err.message || 'Could not delete contact');
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;
    try {
      const updated = await galleryApi.addRule({ text: newRuleText.trim() });
      setHelplineData(updated);
      setNewRuleText('');
      toast.success('Rule added');
    } catch (err) {
      toast.error('Error', err.message || 'Could not add rule');
    }
  };

  const handleUpdateRule = async (e) => {
    e.preventDefault();
    if (!editingRule || !editingRule.text.trim()) return;
    try {
      const updated = await galleryApi.updateRule(editingRule.id, { text: editingRule.text.trim() });
      setHelplineData(updated);
      setEditingRule(null);
      toast.success('Rule updated');
    } catch (err) {
      toast.error('Error', err.message || 'Could not update rule');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this hostel rule?')) return;
    try {
      const updated = await galleryApi.removeRule(id);
      setHelplineData(updated);
      toast.success('Rule deleted');
    } catch (err) {
      toast.error('Error', err.message || 'Could not delete rule');
    }
  };

  // Official Notice / Rule Sheet Handlers
  const handleDocFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocFileData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!docTitle.trim() || !docFileData) {
      toast.error('Required', 'Please enter a title and select a sheet photo or document');
      return;
    }
    try {
      const updated = await galleryApi.addDocument({
        title: docTitle.trim(),
        description: docDescription.trim(),
        fileData: docFileData,
      });
      setHelplineData(updated);
      setDocTitle('');
      setDocDescription('');
      setDocFileData(null);
      setDocFileName('');
      toast.success('Sheet / notice uploaded successfully');
    } catch (err) {
      toast.error('Error', err.message || 'Could not upload sheet');
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Delete this sheet / notice?')) return;
    try {
      const updated = await galleryApi.removeDocument(id);
      setHelplineData(updated);
      toast.success('Sheet / notice removed');
    } catch (err) {
      toast.error('Error', err.message || 'Could not delete sheet');
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'ALL') return true;
    return item.category === activeTab;
  });

  const tabOptions = [{ value: 'ALL', label: 'All Photos & Videos' }, ...categories];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">PG Photos & Video Tour</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Browse rooms, mess, reception, and amenities of Hari Pushp Tower
          </p>
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => { loadHelpline(); setShowHelplineModal(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl font-medium transition-all cursor-pointer text-sm"
              title="Manage Helpline Contacts & Rules"
            >
              <ShieldCheck size={16} />
              <span>Helpline & Rules</span>
            </button>
            <button
              onClick={() => setShowManageModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-all cursor-pointer text-sm"
              title="Manage Categories & Types"
            >
              <Settings2 size={16} />
              <span>Categories & Types</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium shadow-sm transition-all cursor-pointer text-sm"
            >
              <Plus size={18} />
              <span>Upload Photo / Video</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => { loadHelpline(); setShowHelplineModal(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl font-medium transition-all cursor-pointer text-sm"
              title="Helpline & Hostel Guidelines"
            >
              <Phone size={16} />
              <span>Helpline & Rules</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabOptions.map((tab) => {
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
        <ErrorPanel message={error} onRetry={loadData} />
      ) : filteredItems.length === 0 ? (
        <EmptyPanel
          icon={ImageIcon}
          title="No photos in this category"
          description={isAdmin ? 'Click "Upload Photo / Video" to add pictures from your computer.' : 'Photos will be added here soon.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const catLabel = categories.find((c) => c.value === item.category)?.label || item.category;
              const typeLabel = types.find((t) => t.value === item.mediaType)?.label || (item.mediaType === 'VIDEO' ? 'Video Tour' : 'Photo');
              return (
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

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-slate-800 shadow-sm">
                        {catLabel}
                      </span>
                      {item.mediaType === 'VIDEO' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600 text-white shadow-sm">
                          🎥 Video Tour
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingItem({ ...item })}
                          className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow-sm transition-all cursor-pointer"
                          title="Edit category or type"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all cursor-pointer"
                          title="Delete photo"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-[var(--text-primary)] text-base truncate">{item.title}</h3>
                        <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md shrink-0">
                          {typeLabel}
                        </span>
                      </div>
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
              );
            })}
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

              {/* Category selector + quick add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-[var(--text-primary)]">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(!showNewCatInput)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    {showNewCatInput ? 'Cancel' : '+ New Category'}
                  </button>
                </div>
                {showNewCatInput ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                      placeholder="e.g. Library, Gym, Terrace"
                      className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium outline-none focus:border-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Media Type selector + quick add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-[var(--text-primary)]">
                    Media Type <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewTypeInput(!showNewTypeInput)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    {showNewTypeInput ? 'Cancel' : '+ New Type'}
                  </button>
                </div>
                {showNewTypeInput ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newTypeLabel}
                      onChange={(e) => setNewTypeLabel(e.target.value)}
                      placeholder="e.g. 360 View, Floor Plan"
                      className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddType}
                      className="px-3 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium outline-none focus:border-brand-500"
                  >
                    {types.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                )}
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

      {/* Edit Photo Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] max-w-lg w-full p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Edit Photo Category & Type</h2>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-100">
                <img src={editingItem.url} alt="Preview" className="w-full h-full object-cover" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Category
                </label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium outline-none focus:border-brand-500"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Media Type
                </label>
                <select
                  value={editingItem.mediaType}
                  onChange={(e) => setEditingItem({ ...editingItem, mediaType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium outline-none focus:border-brand-500"
                >
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories & Types Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] max-w-lg w-full p-6 shadow-xl space-y-5 animate-scale-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Manage Categories & Types</h2>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">Categories</h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="New category name (e.g. Library, Gym)…"
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1.5">
                  {categories.map((c) => (
                    <div key={c.value} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-sm">
                      <span className="font-medium text-slate-800">{c.label}</span>
                      <button
                        onClick={() => handleDeleteCategory(c.value)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Delete category"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)]">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">Media Types</h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    placeholder="New type name (e.g. 360 View)…"
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddType}
                    className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1.5">
                  {types.map((t) => (
                    <div key={t.value} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-sm">
                      <span className="font-medium text-slate-800">{t.label}</span>
                      <button
                        onClick={() => handleDeleteType(t.value)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Delete type"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Helpline & Rules Modal */}
      {showHelplineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] max-w-2xl w-full p-6 shadow-xl space-y-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">24x7 Helpline & Hostel Rules</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Emergency contacts, warden numbers, and resident guidelines</p>
              </div>
              <button
                onClick={() => setShowHelplineModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Hostel Info */}
            <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-brand-600" />
                  <span className="text-sm font-bold text-brand-900">Hostel Details</span>
                </div>
              </div>
              {isAdmin ? (
                <form onSubmit={handleSaveHostel} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Hostel Name</label>
                      <input
                        type="text"
                        value={hostelNameInput}
                        onChange={(e) => setHostelNameInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-white text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                      <input
                        type="text"
                        value={hostelAddressInput}
                        onChange={(e) => setHostelAddressInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Save Details
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <h3 className="font-bold text-slate-900">{helplineData?.hostelName || 'Hari Pushp Tower (Girls PG)'}</h3>
                  <p className="text-xs text-slate-600">{helplineData?.address || 'Sector 4, Jaipur, Rajasthan'}</p>
                </div>
              )}
            </div>

            {/* Contacts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">24x7 Helpline Contacts</h3>
              </div>

              {isAdmin && (
                <form onSubmit={handleAddContact} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-slate-50 space-y-2.5">
                  <div className="text-xs font-bold text-slate-700">+ Add New Helpline Contact</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Title / Name (e.g. Chief Warden)"
                      value={newContact.title}
                      onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-white text-xs"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Phone (e.g. 9460191558)"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-white text-xs"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Availability (e.g. 24x7 Support)"
                      value={newContact.sub}
                      onChange={(e) => setNewContact({ ...newContact, sub: e.target.value })}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-white text-xs"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Add Contact
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {(helplineData?.contacts || []).map((c) => (
                  <div key={c.id || c.phone} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3">
                    {editingContact?.id === c.id ? (
                      <form onSubmit={handleUpdateContact} className="flex-1 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={editingContact.title}
                            onChange={(e) => setEditingContact({ ...editingContact, title: e.target.value })}
                            className="px-2.5 py-1 rounded-lg border border-brand-400 bg-white text-xs"
                            required
                          />
                          <input
                            type="text"
                            value={editingContact.phone}
                            onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                            className="px-2.5 py-1 rounded-lg border border-brand-400 bg-white text-xs"
                            required
                          />
                          <input
                            type="text"
                            value={editingContact.sub || ''}
                            onChange={(e) => setEditingContact({ ...editingContact, sub: e.target.value })}
                            className="px-2.5 py-1 rounded-lg border border-brand-400 bg-white text-xs"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="px-2.5 py-1 bg-brand-600 text-white rounded text-xs font-semibold cursor-pointer">Save</button>
                          <button type="button" onClick={() => setEditingContact(null)} className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs cursor-pointer">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{c.title}</div>
                          <div className="text-xs font-semibold text-brand-700">{c.phone}</div>
                          {c.sub && <div className="text-[11px] text-slate-500 mt-0.5">{c.sub}</div>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${c.phone}`}
                            className="p-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Phone size={14} />
                            <span className="hidden sm:inline">Call</span>
                          </a>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setEditingContact({ ...c })}
                                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Edit Contact"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(c.id)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Delete Contact"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rules Section */}
            <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Hostel Guidelines & Rules</h3>
              </div>

              {isAdmin && (
                <form onSubmit={handleAddRule} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-slate-50 space-y-2">
                  <div className="text-xs font-bold text-slate-700">+ Add New Guideline</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Maintain silence in study hours and cleanliness in mess…"
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-white text-xs"
                      required
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Add Rule
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {(helplineData?.rules || []).map((r, idx) => {
                  const ruleObj = typeof r === 'string' ? { id: `r-${idx + 1}`, text: r } : r;
                  return (
                    <div key={ruleObj.id || idx} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-start justify-between gap-3">
                      {editingRule?.id === ruleObj.id ? (
                        <form onSubmit={handleUpdateRule} className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={editingRule.text}
                            onChange={(e) => setEditingRule({ ...editingRule, text: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-brand-400 bg-white text-xs"
                            required
                          />
                          <div className="flex gap-2">
                            <button type="submit" className="px-2.5 py-1 bg-brand-600 text-white rounded text-xs font-semibold cursor-pointer">Save</button>
                            <button type="button" onClick={() => setEditingRule(null)} className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs cursor-pointer">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start gap-2.5 flex-1">
                            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-slate-700 leading-relaxed">{ruleObj.text}</span>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setEditingRule({ ...ruleObj })}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Edit Rule"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(ruleObj.id)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Delete Rule"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Official Sheets & Notices Section */}
            <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Official Sheets & Notices</h3>
                  <p className="text-[11px] text-slate-500">Official warden circulars, signed rule sheets, and code of conduct</p>
                </div>
              </div>

              {isAdmin && (
                <form onSubmit={handleAddDocument} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-slate-50 space-y-2.5">
                  <div className="text-xs font-bold text-slate-700">+ Upload Official Sheet / Notice</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Sheet / Notice Title (e.g. Annual Rules 2026)"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-white text-xs"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Description / Note (e.g. Approved by Warden)"
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-white text-xs"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[var(--border-color)] rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer">
                      <Upload size={14} />
                      <span>{docFileName || 'Choose Sheet Photo / PDF…'}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleDocFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={!docFileData || !docTitle.trim()}
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Upload Sheet
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {(helplineData?.documents || []).length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    No official sheets or notices uploaded yet.
                  </div>
                ) : (
                  (helplineData?.documents || []).map((doc) => (
                    <div key={doc.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={doc.url}
                          alt={doc.title}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate">{doc.title}</div>
                          {doc.description && <div className="text-xs text-slate-500 truncate">{doc.description}</div>}
                          <div className="text-[11px] text-brand-700 font-medium mt-0.5">Official Warden Sheet</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="p-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={14} />
                          <span className="hidden sm:inline">View Sheet</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete Sheet"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowHelplineModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Document Full Screen Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] max-w-2xl w-full p-5 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{viewingDoc.title}</h3>
                {viewingDoc.description && <p className="text-xs text-slate-500">{viewingDoc.description}</p>}
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/5 rounded-xl p-2 min-h-[300px]">
              <img
                src={viewingDoc.url}
                alt={viewingDoc.title}
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm"
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
              <a
                href={viewingDoc.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-700 font-semibold hover:underline"
              >
                Open in new tab ↗
              </a>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
