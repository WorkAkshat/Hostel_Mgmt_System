const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get Activity Logs (paginated, filterable)
// @route   GET /api/v1/activity-logs
// @access  Admin only
const getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      module,
      action,
      role,
      search,
      from,
      to,
      userId,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build filter
    const where = {};

    if (module) where.module = module;
    if (action) where.action = action;
    if (role) where.userRole = role;
    if (userId) where.userId = userId;

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { userName: { contains: search } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
      hasMore: skip + take < total,
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
};

// @desc    Get Activity Log Stats
// @route   GET /api/v1/activity-logs/stats
// @access  Admin only
const getActivityStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, moduleBreakdown, actionBreakdown, recentUsers] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.count({ where: { createdAt: { gte: today } } }),
      prisma.$queryRawUnsafe(
        `SELECT module, COUNT(*) as count FROM ActivityLog GROUP BY module ORDER BY count DESC LIMIT 10`
      ),
      prisma.$queryRawUnsafe(
        `SELECT action, COUNT(*) as count FROM ActivityLog GROUP BY action ORDER BY count DESC LIMIT 10`
      ),
      prisma.$queryRawUnsafe(
        `SELECT userName, userRole, COUNT(*) as count FROM ActivityLog WHERE userName IS NOT NULL GROUP BY userName, userRole ORDER BY count DESC LIMIT 5`
      ),
    ]);

    res.json({
      totalLogs,
      todayLogs,
      moduleBreakdown: moduleBreakdown.map(r => ({ module: r.module, count: Number(r.count) })),
      actionBreakdown: actionBreakdown.map(r => ({ action: r.action, count: Number(r.count) })),
      recentUsers: recentUsers.map(r => ({ userName: r.userName, userRole: r.userRole, count: Number(r.count) })),
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ message: 'Failed to fetch activity stats' });
  }
};

module.exports = { getActivityLogs, getActivityStats };
