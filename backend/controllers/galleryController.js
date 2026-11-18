const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');

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
    const { title, description, category, mediaType, url } = req.body;
    if (!url || !title) {
      return res.status(400).json({ message: 'Title and Media URL are required' });
    }

    const mediaList = loadMedia();
    const newItem = {
      id: `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'ROOMS',
      mediaType: mediaType || (url.includes('.mp4') || url.includes('.mov') ? 'VIDEO' : 'IMAGE'),
      url: url.trim(),
      createdAt: new Date().toISOString()
    };

    mediaList.unshift(newItem);
    saveMedia(mediaList);

    res.status(201).json(newItem);
  } catch (error) {
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
  addMedia,
  deleteMedia,
  getHelplineAndRules
};
