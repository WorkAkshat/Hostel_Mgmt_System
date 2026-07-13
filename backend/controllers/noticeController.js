const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Post a new notice (Warden only)
// @route   POST /api/notices
// @access  Private (Admin/Warden only)
const createNotice = async (req, res) => {
  const { title, content, priority } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  try {
    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        priority: priority || 'INFO',
        postedBy: req.user.name
      }
    });

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
    const notices = await prisma.notice.findMany({
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
