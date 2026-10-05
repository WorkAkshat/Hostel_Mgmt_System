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
      exclude,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build filter
    const where = {};

    if (module) where.module = module;
    if (action) where.action = action;
    else if (exclude) where.action = { not: exclude };
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

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    // groupBy works the same on SQLite and Postgres (raw SQL table names differ)
    const [totalLogs, todayLogs, weekLogs, byModule, byAction, byUser] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.count({ where: { createdAt: { gte: today } } }),
      prisma.activityLog.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.activityLog.groupBy({ by: ['module'], _count: { _all: true } }),
      prisma.activityLog.groupBy({ by: ['action'], _count: { _all: true } }),
      prisma.activityLog.groupBy({ by: ['userName', 'userRole'], where: { userName: { not: null }, createdAt: { gte: weekAgo } }, _count: { _all: true } }),
    ]);

    const top = (rows, n) => rows.sort((x, y) => y._count._all - x._count._all).slice(0, n);

    res.json({
      totalLogs,
      todayLogs,
      weekLogs,
      moduleBreakdown: top(byModule, 12).map((r) => ({ module: r.module, count: r._count._all })),
      actionBreakdown: top(byAction, 12).map((r) => ({ action: r.action, count: r._count._all })),
      recentUsers: top(byUser, 5).map((r) => ({ userName: r.userName, userRole: r.userRole, count: r._count._all })),
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ message: 'Failed to fetch activity stats' });
  }
};

module.exports = { getActivityLogs, getActivityStats };
