const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const META_FILE = path.join(DATA_DIR, 'gallery_meta.json');

const DEFAULT_META = {
  categories: [
    { value: 'ROOMS', label: 'Rooms' },
    { value: 'MESS', label: 'Mess & Food' },
    { value: 'BUILDING', label: 'Building' },
    { value: 'COMMON_AREA', label: 'Common Area' }
  ],
  types: [
    { value: 'IMAGE', label: 'Photo' },
    { value: 'VIDEO', label: 'Video Tour' }
  ]
};

const loadMeta = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(META_FILE)) {
      fs.writeFileSync(META_FILE, JSON.stringify(DEFAULT_META, null, 2));
      return DEFAULT_META;
    }
    const data = fs.readFileSync(META_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading gallery meta:', err);
    return DEFAULT_META;
  }
};

const saveMeta = (meta) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
  } catch (err) {
    console.error('Error saving gallery meta:', err);
  }
};

const INITIAL_MEDIA = [
  {
    id: 'media-1',
    title: 'Double Sharing Deluxe Room',
    description: 'Attached washroom, individual study table, wardrobes & balcony view',
    category: 'ROOMS',
    mediaType: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'media-2',
    title: 'Single Sharing AC Room',
    description: 'Fully furnished with air conditioner, study desk and high-speed Wi-Fi',
    category: 'ROOMS',
    mediaType: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'media-3',
    title: 'Mess & Dining Hall',
    description: 'Hygienic 4-meal daily menu served in a clean, sanitized dining hall',
    category: 'MESS',
    mediaType: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'media-4',
    title: 'Hostel Building & Security Gate',
    description: '24x7 security guard, CCTV cameras, biometric attendance and smart gate pass',
    category: 'BUILDING',
    mediaType: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1000&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'media-5',
    title: 'Study & Recreation Lounge',
    description: 'Quiet study tables, high speed internet and comfortable seating',
    category: 'COMMON_AREA',
    mediaType: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
    createdAt: new Date().toISOString()
  }
];

const loadMedia = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(GALLERY_FILE)) {
      fs.writeFileSync(GALLERY_FILE, JSON.stringify(INITIAL_MEDIA, null, 2));
      return INITIAL_MEDIA;
    }
    const data = fs.readFileSync(GALLERY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading gallery media:', err);
    return INITIAL_MEDIA;
  }
};

const saveMedia = (media) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(GALLERY_FILE, JSON.stringify(media, null, 2));
  } catch (err) {
    console.error('Error saving gallery media:', err);
  }
};

// @desc    Get all gallery photos and videos
// @route   GET /api/v1/gallery
// @access  Public / Authenticated
const getGallery = (req, res) => {
  try {
    const media = loadMedia();
    res.json(media);
  } catch (error) {
    res.status(500).json({ message: 'Error loading gallery media' });
  }
};

// @desc    Add a photo or video to gallery
// @route   POST /api/v1/gallery
// @access  Private (Admin / Warden)
const addMedia = (req, res) => {
  try {
    const { title, description, category, mediaType, url, fileData } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!fileData && !url) {
      return res.status(400).json({ message: 'Please select a photo or video from gallery' });
    }

    let finalUrl = url;
    let detectedType = mediaType || 'IMAGE';

    if (fileData && fileData.startsWith('data:')) {
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'gallery');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const isVideo = fileData.startsWith('data:video');
      if (isVideo) detectedType = 'VIDEO';

      const match = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const base64Content = match[2];
        const ext = mime.includes('png') ? 'png' : mime.includes('mp4') ? 'mp4' : mime.includes('mov') ? 'mov' : 'jpg';
        const filename = `gallery-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));

        const protocol = req.protocol || 'https';
        const host = req.get('host') || 'hms-api.haripushphostel.in';
        finalUrl = `${protocol}://${host}/uploads/gallery/${filename}`;
      }
    }

    const mediaList = loadMedia();
    const newItem = {
      id: `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'ROOMS',
      mediaType: detectedType,
      url: finalUrl,
      createdAt: new Date().toISOString()
    };

    mediaList.unshift(newItem);
    saveMedia(mediaList);

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error saving media:', error);
    res.status(500).json({ message: 'Error saving media item' });
  }
};

// @desc    Delete media item
// @route   DELETE /api/v1/gallery/:id
// @access  Private (Admin / Warden)
const deleteMedia = (req, res) => {
  try {
    const { id } = req.params;
    let mediaList = loadMedia();
    mediaList = mediaList.filter(m => m.id !== id);
    saveMedia(mediaList);
    res.json({ message: 'Media removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting media item' });
  }
};

// @desc    Update media item (category, type, title, description)
// @route   PUT /api/v1/gallery/:id
// @access  Private (Admin / Warden)
const updateMedia = (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, mediaType } = req.body;
    let mediaList = loadMedia();
    const idx = mediaList.findIndex(m => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: 'Media not found' });
    }
    if (title) mediaList[idx].title = title.trim();
    if (description !== undefined) mediaList[idx].description = description.trim();
    if (category) mediaList[idx].category = category.trim().toUpperCase();
    if (mediaType) mediaList[idx].mediaType = mediaType;
    saveMedia(mediaList);
    res.json(mediaList[idx]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating media item' });
  }
};

// @desc    Get gallery metadata (categories & media types)
// @route   GET /api/v1/gallery/meta
// @access  Public / Authenticated
const getGalleryMeta = (req, res) => {
  try {
    const meta = loadMeta();
    res.json(meta);
  } catch (error) {
    res.status(500).json({ message: 'Error loading metadata' });
  }
};

// @desc    Add new category
// @route   POST /api/v1/gallery/categories
// @access  Private (Admin / Warden)
const addCategory = (req, res) => {
  try {
    const { value, label } = req.body;
    if (!label) return res.status(400).json({ message: 'Category label is required' });
    const cleanLabel = label.trim();
    const cleanValue = (value || cleanLabel.replace(/[^a-zA-Z0-9]/g, '_')).toUpperCase();
    
    const meta = loadMeta();
    if (meta.categories.some(c => c.value === cleanValue)) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    const newCat = { value: cleanValue, label: cleanLabel };
    meta.categories.push(newCat);
    saveMeta(meta);
    res.status(201).json(newCat);
  } catch (error) {
    res.status(500).json({ message: 'Error adding category' });
  }
};

// @desc    Delete category
// @route   DELETE /api/v1/gallery/categories/:value
// @access  Private (Admin / Warden)
const deleteCategory = (req, res) => {
  try {
    const { value } = req.params;
    const meta = loadMeta();
    meta.categories = meta.categories.filter(c => c.value !== value.toUpperCase());
    saveMeta(meta);
    res.json({ message: 'Category removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category' });
  }
};

// @desc    Add new media type
// @route   POST /api/v1/gallery/types
// @access  Private (Admin / Warden)
const addType = (req, res) => {
  try {
    const { value, label } = req.body;
    if (!label) return res.status(400).json({ message: 'Type label is required' });
    const cleanLabel = label.trim();
    const cleanValue = (value || cleanLabel.replace(/[^a-zA-Z0-9]/g, '_')).toUpperCase();
    
    const meta = loadMeta();
    if (meta.types.some(t => t.value === cleanValue)) {
      return res.status(400).json({ message: 'Type already exists' });
    }
    const newType = { value: cleanValue, label: cleanLabel };
    meta.types.push(newType);
    saveMeta(meta);
    res.status(201).json(newType);
  } catch (error) {
    res.status(500).json({ message: 'Error adding type' });
  }
};

// @desc    Delete media type
// @route   DELETE /api/v1/gallery/types/:value
// @access  Private (Admin / Warden)
const deleteType = (req, res) => {
  try {
    const { value } = req.params;
    const meta = loadMeta();
    meta.types = meta.types.filter(t => t.value !== value.toUpperCase());
    saveMeta(meta);
    res.json({ message: 'Type removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting type' });
  }
};

// @desc    Get 24x7 helpline & rules
// @route   GET /api/v1/gallery/helpline
// @access  Public / Authenticated
const getHelplineAndRules = (req, res) => {
  res.json({
    name: 'Hari Pushp Tower (Girls PG)',
    address: 'Hari Pushp Tower, Sector 4, Jaipur, Rajasthan',
    helpline: '+91 90012 36013',
    wardenPhone: '+91 94601 91558',
    caretakerPhone: '+91 90012 36013',
    emergency: '112',
    rules: [
      'Night roll call attendance at 9:30 PM is mandatory every evening.',
      'Hostel main gate closes at 10:00 PM sharp.',
      'Male visitors are restricted to the ground floor reception area only.',
      'Sub-meter electricity is billed from 10th to 10th of each calendar month.',
      'Hostel leave requests must be submitted in the app at least 24 hours prior to travel.',
      'Cleanliness in dining hall and common study areas is strictly expected.'
    ]
  });
};

module.exports = {
  getGallery,
  getGalleryMeta,
  addMedia,
  updateMedia,
  deleteMedia,
  addCategory,
  deleteCategory,
  addType,
  deleteType,
  getHelplineAndRules
};
