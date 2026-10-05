const { PrismaClient } = require('@prisma/client');
const { broadcastPushNotification } = require('../services/pushService');
const prisma = new PrismaClient();

// @desc    Post a new notice (Warden only)
// @route   POST /api/notices
// @access  Private (Admin/Warden only)
const createNotice = async (req, res) => {
  const { title, content, category, target } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  try {
    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        category: category ? String(category).toUpperCase() : 'GENERAL',
        target: ['ALL', 'STUDENTS', 'STAFF'].includes(target) ? target : 'ALL',
        postedBy: req.user?.name || req.user?.email || 'Dr. Shalini Sharma'
      }
    });

    // Broadcast high-priority push notification to all registered devices
    broadcastPushNotification({
      title: `📢 ${title}`,
      body: content.length > 120 ? content.substring(0, 117) + '...' : content,
      data: { type: 'NOTICE', noticeId: notice.id },
      channelId: 'urgent-alerts',
    }).catch(err => console.warn('[Notice Push Error]', err.message));

    res.status(201).json(notice);
  } catch (error) {
    console.error('Error creating notice:', error);
    res.status(500).json({ message: 'Server error posting notice' });
  }
};

// @desc    Get all notice board items
// @route   GET /api/notices
// @access  Private
const getAllNotices = async (req, res) => {
  try {
    // Optional ?category=MESS filter
    const where = req.query.category ? { category: String(req.query.category).toUpperCase() } : {};
    // Residents see notices for everyone or for students; staff see everyone / staff
    if (req.user?.role === 'STUDENT') where.target = { in: ['ALL', 'STUDENTS'] };
    if (req.user?.role === 'STAFF') where.target = { in: ['ALL', 'STAFF'] };
    const notices = await prisma.notice.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(notices);
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ message: 'Server error retrieving announcements' });
  }
};

// @desc    Delete notice (Warden only)
// @route   DELETE /api/notices/:id
// @access  Private (Admin/Warden only)
const deleteNotice = async (req, res) => {
  const { id } = req.params;

  try {
    const notice = await prisma.notice.findUnique({ where: { id } });

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    await prisma.notice.delete({ where: { id } });
    res.json({ message: 'Notice removed successfully' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ message: 'Server error deleting notice' });
  }
};

module.exports = {
  createNotice,
  getAllNotices,
  deleteNotice
};
